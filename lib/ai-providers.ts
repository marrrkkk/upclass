/**
 * Back-compat Cerebras provider facade.
 *
 * Existing AI routes and tests import `cerebras` / `getCerebrasModel` from
 * this module. It now delegates to the lazy multi-provider registry
 * (lib/ai/registry.ts) and no longer throws at module load.
 */
import { resolveLanguageModel, getDefaultAiModelId } from "@/lib/ai/registry"

/**
 * Get the configured Cerebras model as a resolved language model.
 */
export function cerebras(model?: string) {
  const resolved = resolveLanguageModel(model ? `cerebras:${model}` : getDefaultAiModelId())
  if (!resolved) {
    throw new Error(
      "CEREBRAS_API_KEY environment variable is not set (or CEREBRAS_MODEL is invalid)",
    )
  }
  return resolved
}

/**
 * Get the configured Cerebras model id
 */
export function getCerebrasModel() {
  return process.env.CEREBRAS_MODEL || "gpt-oss-120b"
}