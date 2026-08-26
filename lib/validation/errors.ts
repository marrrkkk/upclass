/**
 * Shared helpers for turning Zod validation failures into user-facing messages.
 *
 * Server actions surface `firstIssue(error, fallback)` instead of the raw
 * `error.issues[0].message` so that Zod's contextless defaults (a bare
 * "Invalid input" from a failed union, or raw invalid_type text) never reach
 * users without naming the field that tripped.
 */

/** Turn a segmented Zod issue path into a readable field label ("orgName" → "Org name"). */
export function humanizeField(path: ReadonlyArray<PropertyKey>): string | null {
  const key = path.find((segment) => typeof segment === "string") as string | undefined
  if (!key) return null
  const spaced = key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * First validation message from a Zod issue list, or a safe fallback.
 * Guards against Zod's contextless defaults (a bare "Invalid input" from a
 * failed union, or raw invalid_type text) leaking to users: when the first
 * issue is one of those, we name the offending field instead.
 */
export function firstIssue(
  error: {
    issues: Array<{ message: string; path?: ReadonlyArray<PropertyKey>; code?: string }>
  },
  fallback: string,
) {
  const issue = error.issues[0]
  if (!issue) return fallback

  // Only override Zod's contextless defaults — a bare "Invalid input" (failed
  // union) or "Invalid input: expected …" (invalid_type). Custom messages,
  // including our own field-named ones on union/type failures, are already
  // clear and are kept as-is.
  const contextless = /^invalid input\b/i.test(issue.message)
  if (contextless) {
    const field = humanizeField(issue.path ?? [])
    return field ? `${field} is invalid. Please check it and try again.` : fallback
  }

  return issue.message ?? fallback
}
