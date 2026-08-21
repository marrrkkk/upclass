/**
 * Shared formatting utilities for dashboard components.
 */

/**
 * Extract first name from a full name string.
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there"
}

/**
 * Format a due date as "Mon DD" (e.g., "Jan 15").
 */
export function formatDueDate(date: Date | string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "No due date"
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d)
}

/**
 * Format a due date with full context (e.g., "Due today", "Due tomorrow", "Due Jan 15").
 */
export function formatDueDateFull(date: Date | string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "No due date"

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (dueDay.getTime() === today.getTime()) {
    return "Due today"
  }
  if (dueDay.getTime() === tomorrow.getTime()) {
    return "Due tomorrow"
  }
  return `Due ${formatDueDate(d)}`
}

/**
 * Format a relative timestamp (e.g., "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "Unknown time"

  const now = Date.now()
  const then = d.getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  if (diffSeconds < 60) return "Just now"
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`
  
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d)
}

/**
 * Format a timestamp as "Mon DD at HH:MM AM/PM".
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "Unknown time"
  
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

/**
 * Format a date label for dashboard header (e.g., "Monday, January 15").
 */
export function formatDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

/**
 * Generate greeting based on time of day.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return "Good late night"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 21) return "Good evening"
  return "Good night"
}

/**
 * Pluralize a word based on count.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

/**
 * Format count with noun (e.g., "1 item", "3 items").
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`
}
