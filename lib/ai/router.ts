/**
 * Fallback-aware model routing.
 *
 * `generateWithFallback` runs a single generation across candidate models.
 * `streamWithFallback` starts a stream, peeks for the first real content or
 * error, and transparently falls back to the next candidate.
 */
import { generateText, stepCountIs, streamText, type LanguageModel } from "ai"

import {
  markModelExhausted,
  recordModelUsage,
  selectComplexTextModels,
  selectSimpleTextModels,
  selectToolCallingModels,
  type ModelCapacity,
} from "@/lib/ai/capacity-selector"
import { AiProviderError, isRetryableError, toAiProviderError } from "@/lib/ai/errors"
import { resolveLanguageModel } from "@/lib/ai/registry"
import type { AiSensitivity } from "@/lib/ai/types"
import { getModelPolicy, isModelAllowedForSensitivity } from "@/lib/ai/policy"
import { withReasoningStrip } from "@/lib/ai/strip-reasoning-middleware"

export type ModelCandidate = {
  modelId: string
  provider: string
}

export type FallbackAttempt = {
  from: ModelCandidate
  to: ModelCandidate
  error: string
}

const PEEK_TIMEOUT_MS = 20_000
const DEFAULT_TIMEOUT_MS = 25_000

function capacityToCandidate(capacity: ModelCapacity): ModelCandidate {
  return { modelId: capacity.modelId, provider: capacity.provider }
}

/**
 * Build an ordered candidate list. A pinned `modelId` wins and is the only
 * candidate; otherwise capacity selection picks the list (available first).
 */
export async function buildModelCandidates(options: {
  modelId?: string
  needsTools?: boolean
  complexity?: "simple" | "complex"
  sensitivity?: AiSensitivity
}): Promise<ModelCandidate[]> {
  if (options.modelId) {
    const allowed = !options.sensitivity || isModelAllowedForSensitivity(options.modelId, options.sensitivity)
    return allowed && resolveLanguageModel(options.modelId)
      ? [{ modelId: options.modelId, provider: options.modelId.split(":")[0] }]
      : []
  }

  if (options.needsTools) {
    const { available, stressed } = await selectToolCallingModels(options.sensitivity)
    const candidates = [...available, ...stressed].map(capacityToCandidate)
    return options.sensitivity && !getModelPolicy(options.sensitivity).allowFallback
      ? candidates.slice(0, 1)
      : candidates
  }

  const selector = options.complexity === "complex" ? selectComplexTextModels : selectSimpleTextModels
  const { available, stressed } = await selector(options.sensitivity)
  const candidates = [...available, ...stressed].map(capacityToCandidate)
  return options.sensitivity && !getModelPolicy(options.sensitivity).allowFallback
    ? candidates.slice(0, 1)
    : candidates
}

function resolveCandidate(candidate: ModelCandidate): LanguageModel | null {
  const model = resolveLanguageModel(candidate.modelId)
  return model ? withReasoningStrip(model, candidate.modelId) : null
}

export type GenerateWithFallbackOptions = {
  modelId?: string
  needsTools?: boolean
  complexity?: "simple" | "complex"
  sensitivity?: AiSensitivity
  messages: NonNullable<Parameters<typeof generateText>[0]["messages"]>
  maxOutputTokens?: number
  temperature?: number
  timeoutMs?: number
}

export type GenerateWithFallbackResult = {
  text: string
  modelId: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
  attemptedModels: string[]
  fallbacks: FallbackAttempt[]
}

export async function generateWithFallback(
  options: GenerateWithFallbackOptions,
): Promise<GenerateWithFallbackResult> {
  const candidates = await buildModelCandidates({
    modelId: options.modelId,
    needsTools: options.needsTools,
    complexity: options.complexity,
    sensitivity: options.sensitivity,
  })

  if (candidates.length === 0) {
    throw new AiProviderError("none", "No AI providers are configured", { retryable: false })
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let lastError: AiProviderError | null = null
  const attemptedModels: string[] = []
  const fallbacks: FallbackAttempt[] = []

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const model = resolveCandidate(candidate)
    if (!model) continue

    const startedAt = Date.now()
    attemptedModels.push(candidate.modelId)
    try {
      const result = await generateText({
        model,
        messages: options.messages,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature ?? 0.2,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(timeoutMs),
      })
      await recordModelUsage(candidate.modelId)

      return {
        text: result.text,
        modelId: candidate.modelId,
        provider: candidate.provider,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
        latencyMs: Date.now() - startedAt,
        attemptedModels,
        fallbacks,
      }
    } catch (error) {
      lastError = toAiProviderError(candidate.provider, error)
      if (isRetryableError(lastError)) {
        await markModelExhausted(candidate.modelId)
      }
      console.warn(
        `[ai-router] generate failed on ${candidate.modelId}: ${lastError.message}`,
      )
      const next = candidates[index + 1]
      if (next) {
        fallbacks.push({ from: candidate, to: next, error: lastError.message })
      }
    }
  }

  throw lastError ?? new AiProviderError("none", "All AI providers failed", { retryable: false })
}

export type StreamWithFallbackOptions = {
  modelId?: string
  needsTools?: boolean
  complexity?: "simple" | "complex"
  sensitivity?: AiSensitivity
  system?: string
  messages: NonNullable<Parameters<typeof streamText>[0]["messages"]>
  tools?: Parameters<typeof streamText>[0]["tools"]
  toolChoice?: Parameters<typeof streamText>[0]["toolChoice"]
  maxOutputTokens?: number
  temperature?: number
  stopWhen?: Parameters<typeof streamText>[0]["stopWhen"]
  abortSignal?: AbortSignal
  onError?: Parameters<typeof streamText>[0]["onError"]
  onFinish?: Parameters<typeof streamText>[0]["onFinish"]
  onFallback?: (from: ModelCandidate, to: ModelCandidate, error: AiProviderError) => void
}

export type StreamWithFallbackResult = {
  result: ReturnType<typeof streamText>
  modelId: string
  provider: string
  attemptedModels: string[]
  fallbacks: FallbackAttempt[]
}

async function peekForFirstContent(
  result: ReturnType<typeof streamText>,
  modelId: string,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ ok: false, error: new AiProviderError(modelId.split(":")[0], "Stream timed out before first content", { retryable: true }) })
    }, PEEK_TIMEOUT_MS)

    ;(async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "error") {
            clearTimeout(timeout)
            resolve({ ok: false, error: (part as { error?: unknown }).error ?? new Error("Stream error") })
            return
          }
          if (part.type === "finish") {
            clearTimeout(timeout)
            resolve({ ok: false, error: new AiProviderError(modelId.split(":")[0], "Stream finished without content", { retryable: true }) })
            return
          }
          if (part.type === "text-delta" || part.type === "tool-call") {
            clearTimeout(timeout)
            resolve({ ok: true })
            return
          }
        }
      } catch (error) {
        clearTimeout(timeout)
        resolve({ ok: false, error })
      }
    })()
  })
}

/**
 * Start streaming from the first healthy candidate. Peeks the stream until
 * real content arrives; on error/timeout/empty it falls back to the next
 * candidate. Throws the last error when every candidate fails.
 */
export async function streamWithFallback(
  options: StreamWithFallbackOptions,
): Promise<StreamWithFallbackResult> {
  const candidates = await buildModelCandidates({
    modelId: options.modelId,
    needsTools: options.needsTools,
    complexity: options.complexity,
    sensitivity: options.sensitivity,
  })

  if (candidates.length === 0) {
    throw new AiProviderError("none", "No AI providers are configured", { retryable: false })
  }

  let lastError: AiProviderError | null = null
  const attemptedModels: string[] = []
  const fallbacks: FallbackAttempt[] = []

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const model = resolveCandidate(candidate)
    if (!model) continue

    attemptedModels.push(candidate.modelId)

    try {
      const result = streamText({
        model,
        system: options.system,
        messages: options.messages,
        tools: options.tools,
        toolChoice: options.toolChoice,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
        maxRetries: 0,
        stopWhen: options.stopWhen ?? (options.tools && Object.keys(options.tools).length > 0 ? stepCountIs(5) : undefined),
        abortSignal: options.abortSignal,
        onError: options.onError,
        onFinish: options.onFinish,
      })

      const peek = await peekForFirstContent(result, candidate.modelId)
      if (peek.ok) {
        await recordModelUsage(candidate.modelId)
        return { result, modelId: candidate.modelId, provider: candidate.provider, attemptedModels, fallbacks }
      }

      lastError = toAiProviderError(candidate.provider, peek.error)
      if (isRetryableError(lastError)) {
        await markModelExhausted(candidate.modelId)
      }
      console.warn(`[ai-router] stream failed on ${candidate.modelId}: ${lastError.message}`)

      const next = candidates[index + 1]
      if (next) {
        fallbacks.push({ from: candidate, to: next, error: lastError.message })
        options.onFallback?.(candidate, next, lastError)
      }
    } catch (error) {
      lastError = toAiProviderError(candidate.provider, error)
      if (isRetryableError(lastError)) {
        await markModelExhausted(candidate.modelId)
      }
      console.warn(`[ai-router] stream setup failed on ${candidate.modelId}: ${lastError.message}`)
      const next = candidates[index + 1]
      if (next) {
        fallbacks.push({ from: candidate, to: next, error: lastError.message })
      }
    }
  }

  throw lastError ?? new AiProviderError("none", "All AI providers failed", { retryable: false })
}
