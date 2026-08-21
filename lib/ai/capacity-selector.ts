/**
 * Capacity-aware model selection with per-model rate counters.
 *
 * Counters live in the shared cache layer: `cap:rpm:{modelId}` (60s TTL) and
 * `cap:rpd:{modelId}` (24h TTL). Providers in `sharedTpmProviders` exhaust
 * as a group (their tokens-per-minute pool is shared).
 */
import { cacheGet, cacheIncrement, cacheSet } from "@/lib/ai/cache-layer"
import { getConfiguredProviders } from "@/lib/ai/registry"
import {
  isModelAllowedForSensitivity,
  isProviderDisabled,
} from "@/lib/ai/policy"
import type { AiSensitivity } from "@/lib/ai/types"

export type ModelCapacity = {
  modelId: string
  provider: string
  quality: number
  toolCapable: boolean
  rpm: number
  rpd: number
}

export const MODEL_CAPACITIES: ModelCapacity[] = [
  { modelId: "cerebras:gpt-oss-120b", provider: "cerebras", quality: 8, toolCapable: true, rpm: 30, rpd: 1_000 },
  { modelId: "cerebras:gpt-oss-20b", provider: "cerebras", quality: 6, toolCapable: true, rpm: 30, rpd: 1_000 },
  { modelId: "groq:llama-3.3-70b-versatile", provider: "groq", quality: 8, toolCapable: true, rpm: 30, rpd: 1_000 },
  { modelId: "groq:llama-3.1-8b-instant", provider: "groq", quality: 5, toolCapable: true, rpm: 30, rpd: 1_000 },
  { modelId: "google:gemini-2.5-flash", provider: "google", quality: 8, toolCapable: true, rpm: 15, rpd: 250 },
  { modelId: "google:gemini-2.5-flash-lite", provider: "google", quality: 6, toolCapable: true, rpm: 15, rpd: 250 },
  { modelId: "mistral:open-mistral-nemo", provider: "mistral", quality: 6, toolCapable: true, rpm: 10, rpd: 500 },
  { modelId: "openrouter:meta-llama/llama-3.3-70b-instruct:free", provider: "openrouter", quality: 7, toolCapable: true, rpm: 20, rpd: 1_000 },
]

const RPM_TTL = 60
const RPD_TTL = 86_400
const STRESS_THRESHOLD = 0.8
const EXHAUSTED_COUNT = 99_999

/** Providers whose models share a token-per-minute pool and exhaust together. */
export const sharedTpmProviders = new Set(["groq"])

const PROVIDER_PREFERENCE: Record<string, number> = {
  cerebras: 0,
  groq: 1,
  mistral: 2,
  openrouter: 3,
  google: 4,
  "openai-compatible": 5,
}

function isConfigured(capacity: ModelCapacity): boolean {
  return getConfiguredProviders().includes(capacity.provider as never)
}

async function getModelLoad(modelId: string): Promise<{ minute: number; day: number }> {
  const [minuteRaw, dayRaw] = await Promise.all([
    cacheGet(`cap:rpm:${modelId}`),
    cacheGet(`cap:rpd:${modelId}`),
  ])
  const minute = minuteRaw ? Number(minuteRaw) : 0
  const day = dayRaw ? Number(dayRaw) : 0
  return {
    minute: Number.isFinite(minute) ? minute : 0,
    day: Number.isFinite(day) ? day : 0,
  }
}

function sortModels(models: ModelCapacity[]): ModelCapacity[] {
  return [...models].sort((a, b) => {
    const providerOrder = (PROVIDER_PREFERENCE[a.provider] ?? 99) - (PROVIDER_PREFERENCE[b.provider] ?? 99)
    if (providerOrder !== 0) return providerOrder
    return b.quality - a.quality
  })
}

export type ModelSelection = { available: ModelCapacity[]; stressed: ModelCapacity[] }

export async function selectModels(options: {
  needsTools?: boolean
  minQuality?: number
  sensitivity?: AiSensitivity
}): Promise<ModelSelection> {
  const { needsTools = false, minQuality = 1, sensitivity } = options

  const candidates = MODEL_CAPACITIES.filter(
    (capacity) =>
      isConfigured(capacity) &&
      !isProviderDisabled(capacity.provider) &&
      (!sensitivity || isModelAllowedForSensitivity(capacity.modelId, sensitivity)) &&
      capacity.quality >= minQuality &&
      (!needsTools || capacity.toolCapable),
  )

  const withLoad = await Promise.all(
    candidates.map(async (capacity) => ({
      capacity,
      load: await getModelLoad(capacity.modelId),
    })),
  )

  const available: ModelCapacity[] = []
  const stressed: ModelCapacity[] = []

  for (const { capacity, load } of withLoad) {
    const ratio = Math.max(
      load.minute / Math.max(capacity.rpm, 1),
      load.day / Math.max(capacity.rpd, 1),
    )
    ;(ratio < STRESS_THRESHOLD ? available : stressed).push(capacity)
  }

  return { available: sortModels(available), stressed: sortModels(stressed) }
}

/** Record a successful model invocation (rate counters). Never throws. */
export async function recordModelUsage(modelId: string): Promise<void> {
  await Promise.allSettled([
    cacheIncrement(`cap:rpm:${modelId}`, RPM_TTL),
    cacheIncrement(`cap:rpd:${modelId}`, RPD_TTL),
  ])
}

/** Mark a model exhausted (rate-limit observed). Shared providers exhaust as a group. */
export async function markModelExhausted(modelId: string): Promise<void> {
  const toExhaust: string[] = [modelId]

  const provider = modelId.split(":")[0]
  if (provider && sharedTpmProviders.has(provider)) {
    for (const capacity of MODEL_CAPACITIES) {
      if (capacity.provider === provider && capacity.modelId !== modelId) {
        toExhaust.push(capacity.modelId)
      }
    }
  }

  await Promise.allSettled(
    toExhaust.map((id) => cacheSet(`cap:rpm:${id}`, EXHAUSTED_COUNT, RPM_TTL)),
  )
}

/** Tool-capable models, minimum quality 7. */
export function selectToolCallingModels(
  sensitivity?: AiSensitivity,
): Promise<ModelSelection> {
  return selectModels({ needsTools: true, minQuality: 7, sensitivity })
}

/** Simple text models, minimum quality 5 (prefers fast/cheap providers). */
export function selectSimpleTextModels(
  sensitivity?: AiSensitivity,
): Promise<ModelSelection> {
  return selectModels({ needsTools: false, minQuality: 5, sensitivity })
}

/** Complex text models, minimum quality 7. */
export function selectComplexTextModels(
  sensitivity?: AiSensitivity,
): Promise<ModelSelection> {
  return selectModels({ needsTools: false, minQuality: 7, sensitivity })
}