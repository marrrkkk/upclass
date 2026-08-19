/**
 * Middleware that strips `reasoning` parts from assistant prompt messages.
 *
 * Cerebras and Mistral reject preserved reasoning content on multi-step
 * tool calls, so wrapped models drop those parts before each request.
 */
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai"

export function stripReasoningMiddleware(): LanguageModelMiddleware {
  return {
    transformParams: async ({ params }) => {
      const prompt = params.prompt
      if (!Array.isArray(prompt)) return params

      const filtered = prompt.map((message) => {
        const content = (message as { content?: unknown }).content
        if (!Array.isArray(content)) return message
        return {
          ...message,
          content: content.filter((part) => (part as { type?: string }).type !== "reasoning"),
        }
      }) as typeof prompt

      return { ...params, prompt: filtered }
    },
  }
}

const REASONING_SENSITIVE_PREFIXES = new Set(["cerebras", "mistral"])

type WrappableModel = Parameters<typeof wrapLanguageModel>[0]["model"]

/** Wrap the model with the reasoning-strip when the provider requires it. */
export function withReasoningStrip(model: LanguageModel, modelId: string): LanguageModel {
  const provider = modelId.split(":")[0]
  if (REASONING_SENSITIVE_PREFIXES.has(provider)) {
    return wrapLanguageModel({
      model: model as WrappableModel,
      middleware: stripReasoningMiddleware(),
    })
  }
  return model
}