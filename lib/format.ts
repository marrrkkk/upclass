/**
 * Shared date/time formatting for classroom metadata.
 * ---------------------------------------------------------------------------
 * Cards, rows, and timelines all show "when did this last change" in the same
 * compact voice, so the helpers live here instead of being re-derived per
 * feature. Values stay locale-aware through `Intl` and never invent precision
 * the data does not have.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

function toDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `Mar 19` for the current year, `Mar 19, 2025` otherwise. */
export function formatShortDate(value: string | Date | null | undefined, now = Date.now()) {
  const date = toDate(value)
  if (!date) return null

  const sameYear = date.getFullYear() === new Date(now).getFullYear()

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date)
}

/**
 * Compact relative time: `just now`, `12m ago`, `5h ago`, `3d ago`, then an
 * absolute short date once the distance stops being useful as a duration.
 * Returns `null` for missing or unparseable input so callers can omit the line
 * instead of printing a placeholder.
 */
export function formatRelativeTime(value: string | Date | null | undefined, now = Date.now()) {
  const date = toDate(value)
  if (!date) return null

  const elapsed = now - date.getTime()
  if (elapsed < MINUTE) return "just now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d ago`

  return formatShortDate(date, now)
}
