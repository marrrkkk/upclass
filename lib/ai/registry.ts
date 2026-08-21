/**
 * Multi-provider AI model registry.
 *
 * Providers are built lazily from configured environment variables only —
 * importing this module never throws. Model ids are `"provider:model"`
 * strings resolved through `registry().languageModel(id)`.
 */
import { createCerebras } from "@ai-sdk/cerebras"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

export const DEFAULT_MODEL_ID = "cerebras:gpt-oss-120b"

export type ProviderId =
  | "cerebras"
  | "groq"
  | "google"
  | "mistral"
  | "openrouter"
  | "openai-compatible"

const OPENAI_COMPATIBLE_DEFAULTS = {
  baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL,
  apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
}

type ProviderFactory = () => (modelId: string) => LanguageModel

const providerFactories: Record<ProviderId, ProviderFactory | null> = {
  cerebras: process.env.CEREBRAS_API_KEY
    ? () => createCerebras({ apiKey: process.env.CEREBRAS_API_KEY! })
    : null,
  groq: process.env.GROQ_API_KEY ? () => createGroq({ apiKey: process.env.GROQ_API_KEY! }) : null,
  google: process.env.GEMINI_API_KEY
    ? () => createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! })
    : null,
  mistral: process.env.MISTRAL_API_KEY
    ? () => createMistral({ apiKey: process.env.MISTRAL_API_KEY! })
    : null,
  openrouter: process.env.OPENROUTER_API_KEY
    ? () => createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })
    : null,
  "openai-compatible":
    OPENAI_COMPATIBLE_DEFAULTS.baseURL && OPENAI_COMPATIBLE_DEFAULTS.apiKey
      ? () =>
          createOpenAI({
            apiKey: OPENAI_COMPATIBLE_DEFAULTS.apiKey!,
            baseURL: OPENAI_COMPATIBLE_DEFAULTS.baseURL!,
            name: "openai-compatible",
          })
      : null,
}

const providerCache = new Map<ProviderId, (modelId: string) => LanguageModel>()

function getProvider(id: ProviderId): ((modelId: string) => LanguageModel) | null {
  const factory = providerFactories[id]
  if (!factory) return null

  const cached = providerCache.get(id)
  if (cached) return cached

  const provider = factory()
  providerCache.set(id, provider)
  return provider
}

/** True when at least one provider is configured. */
export function isAiConfigured(): boolean {
  return Object.values(providerFactories).some(Boolean)
}

/** Configured provider ids in a stable order. */
export function getConfiguredProviders(): ProviderId[] {
  return (Object.keys(providerFactories) as ProviderId[]).filter(
    (id) => providerFactories[id] !== null,
  )
}

/** Split `"provider:model"` into its parts; null when unparsable or unconfigured. */
export function parseAiModelId(modelId: string): {
  provider: ProviderId
  model: string
} | null {
  const separatorIndex = modelId.indexOf(":")
  if (separatorIndex <= 0) return null
  const provider = modelId.slice(0, separatorIndex) as ProviderId
  const model = modelId.slice(separatorIndex + 1)
  if (!model || !(provider in providerFactories)) return null
  return { provider, model }
}

/**
 * Resolve a `"provider:model"` id to a language model. Returns null when the
 * provider is not configured or the id is malformed.
 */
export function resolveLanguageModel(modelId: string): LanguageModel | null {
  const parsed = parseAiModelId(modelId)
  if (!parsed) return null

  const provider = getProvider(parsed.provider)
  if (!provider) return null

  try {
    return provider(parsed.model)
  } catch {
    return null
  }
}

/** The default model id, honoring `CEREBRAS_MODEL` for back-compat. */
export function getDefaultAiModelId(): string {
  const configured = process.env.CEREBRAS_MODEL
  return configured ? `cerebras:${configured}` : DEFAULT_MODEL_ID
}

/** The default resolved language model (falls back to any configured provider). */
export function getDefaultAiModel(): LanguageModel | null {
  const primary = resolveLanguageModel(getDefaultAiModelId())
  if (primary) return primary

  for (const providerId of getConfiguredProviders()) {
    if (providerId === "cerebras") continue
    const firstModel = resolveLanguageModel(`${providerId}:${getFirstModelId(providerId)}`)
    if (firstModel) return firstModel
  }

  return null
}

const FIRST_MODEL_IDS: Record<ProviderId, string> = {
  cerebras: "gpt-oss-120b",
  groq: "llama-3.3-70b-versatile",
  google: "gemini-2.5-flash",
  mistral: "open-mistral-nemo",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  "openai-compatible": "",
}

function getFirstModelId(providerId: ProviderId): string {
  return FIRST_MODEL_IDS[providerId]
}