import "server-only"

type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"

function getRequiredEnv(name: "OPENROUTER_API_KEY" | "OPENROUTER_CHAT_MODEL" | "OPENROUTER_EMBED_MODEL") {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function getHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getRequiredEnv("OPENROUTER_API_KEY")}`,
    "Content-Type": "application/json",
  }

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL
  }

  if (process.env.OPENROUTER_SITE_NAME) {
    headers["X-Title"] = process.env.OPENROUTER_SITE_NAME
  }

  return headers
}

async function requestOpenRouter<T>(
  path: string,
  body: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  const response = await fetch(`${OPENROUTER_API_BASE}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 750))
      return requestOpenRouter<T>(path, body, attempt + 1)
    }

    throw new Error(message || `OpenRouter request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

function getMessageContent(content: unknown) {
  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text
        }
        return ""
      })
      .join("")
  }

  return ""
}

export function getOpenRouterChatModel() {
  return getRequiredEnv("OPENROUTER_CHAT_MODEL")
}

export function getOpenRouterEmbeddingModel() {
  return getRequiredEnv("OPENROUTER_EMBED_MODEL")
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) return []

  type EmbeddingResponse = {
    data: Array<{ embedding: number[] }>
  }

  const response = await requestOpenRouter<EmbeddingResponse>("/embeddings", {
    model: getOpenRouterEmbeddingModel(),
    input: texts,
  })

  return response.data.map((entry) => entry.embedding)
}

export async function createChatCompletion(messages: OpenRouterChatMessage[]) {
  type ChatCompletionResponse = {
    choices?: Array<{
      message?: {
        content?: unknown
      }
    }>
  }

  const response = await requestOpenRouter<ChatCompletionResponse>("/chat/completions", {
    model: getOpenRouterChatModel(),
    temperature: 0.1,
    messages,
  })

  const content = getMessageContent(response.choices?.[0]?.message?.content)
  if (!content.trim()) {
    throw new Error("OpenRouter returned an empty chat completion")
  }

  return content.trim()
}
