/**
 * `"provider|model"` option values for the development model selector.
 */
import { getConfiguredProviders } from "@/lib/ai/registry"
import { MODEL_CAPACITIES } from "@/lib/ai/capacity-selector"

export const AI_MODEL_AUTO = "auto"

export type AiModelOption = {
  value: string
  label: string
  provider: string
  quality: number
  toolCapable: boolean
}

/** All selectable model options grouped by provider (Auto first). */
export function getAllAiModelOptions(): AiModelOption[] {
  const configured = new Set(getConfiguredProviders())
  return MODEL_CAPACITIES.filter((capacity) => configured.has(capacity.provider as never)).map(
    (capacity) => ({
      value: capacity.modelId.replace(":", "|"),
      label: capacity.modelId,
      provider: capacity.provider,
      quality: capacity.quality,
      toolCapable: capacity.toolCapable,
    }),
  )
}

/** Convert `"provider|model"` to `"provider:model"`; null for "auto". */
export function parseAiModelOptionValue(value: string | undefined | null): string | null {
  if (!value || value === AI_MODEL_AUTO) return null
  const normalized = value.replace("|", ":")
  return normalized
}

export function isDevModelSelectorEnabled(): boolean {
  return process.env.NODE_ENV === "development"
}