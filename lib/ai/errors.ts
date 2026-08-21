/**
 * Typed AI provider errors with retryability classification.
 */

const RETRYABLE_HTTP_CODES = new Set([408, 409, 413, 429, 500, 502, 503, 504])
const RETRYABLE_MESSAGE_PATTERNS = [
  /rate\s*limit/i,
  /quota/i,
  /overloaded/i,
  /context\s*length/i,
  /temporarily/i,
  /try\s+again/i,
  /timeout/i,
  /network/i,
  /fetch\s+failed/i,
  /ECONNRESET/i,
  /ENOTFOUND/i,
]

export class AiProviderError extends Error {
  readonly provider: string
  readonly statusCode?: number
  readonly retryable: boolean
  readonly retryAfterMs?: number

  constructor(
    provider: string,
    message: string,
    options: {
      statusCode?: number
      retryable?: boolean
      retryAfterMs?: number
      cause?: unknown
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = "AiProviderError"
    this.provider = provider
    this.statusCode = options.statusCode
    this.retryable =
      options.retryable !== undefined
        ? options.retryable
        : (options.statusCode !== undefined && RETRYABLE_HTTP_CODES.has(options.statusCode)) ||
          RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
    this.retryAfterMs = options.retryAfterMs
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AiProviderError) return error.retryable
  if (error instanceof Error) {
    return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message))
  }
  return false
}

/** Extract a typed provider error from any thrown value. */
export function toAiProviderError(provider: string, error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error

  const message = error instanceof Error ? error.message : String(error)
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode) || undefined
      : undefined

  return new AiProviderError(provider, message, { statusCode, cause: error })
}