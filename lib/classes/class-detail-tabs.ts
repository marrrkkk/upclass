export type ClassDetailTab = "stream" | "classwork" | "quizzes" | "gradebook" | "people"

export const CLASS_DETAIL_TABS: ClassDetailTab[] = [
  "stream",
  "classwork",
  "quizzes",
  "gradebook",
  "people",
]

/** Tabs visible to a given role. Students never see the gradebook. */
export function getVisibleTabs(role?: "teacher" | "student" | null): ClassDetailTab[] {
  if (role === "teacher") return [...CLASS_DETAIL_TABS]
  return CLASS_DETAIL_TABS.filter((tab) => tab !== "gradebook")
}

/**
 * Resolves a requested tab against what the role can actually see. Unknown or
 * role-restricted requests fall back to `fallbackTab` (usually the stream).
 */
export function getVisibleClassTab(
  requestedTab: string | null,
  fallbackTab: ClassDetailTab,
  role?: "teacher" | "student" | null,
): ClassDetailTab {
  if (requestedTab && getVisibleTabs(role).includes(requestedTab as ClassDetailTab)) {
    return requestedTab as ClassDetailTab
  }

  return fallbackTab
}