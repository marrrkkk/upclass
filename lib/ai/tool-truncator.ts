/**
 * JSON-aware tool output truncation (safe at string boundaries).
 */

export const TOOL_OUTPUT_MAX_CHARS = 4_000

function findLastSafeComma(json: string, max: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < max; index += 1) {
    const char = json[index]
    if (char === undefined) break

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === "{" || char === "[") {
      depth += 1
    } else if (char === "}" || char === "]") {
      depth -= 1
    } else if (char === "," && depth <= 1) {
      return index
    }
  }

  return -1
}

/**
 * Truncate tool output to `TOOL_OUTPUT_MAX_CHARS`. When the output looks like
 * JSON, the cut lands on the last safe comma outside strings and the fragment
 * is re-closed so parsers still see valid JSON.
 */
export function truncateToolOutput(output: string, maxChars = TOOL_OUTPUT_MAX_CHARS): string {
  if (!output || output.length <= maxChars) return output

  const truncated = output.slice(0, maxChars)
  const isJsonish = /^[\s]*[{[]/.test(output)

  if (isJsonish) {
    const cut = findLastSafeComma(truncated, truncated.length)
    if (cut > 0) {
      const base = truncated.slice(0, cut)
      const closed = output[0] === "[" ? `${base}]` : `${base}}`
      return `${closed}\n[truncated — showing first ${closed.length} chars of ${output.length}]`
    }
  }

  return `${truncated}\n[truncated — showing first ${truncated.length} chars of ${output.length}]`
}