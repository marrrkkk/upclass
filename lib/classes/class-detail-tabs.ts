export type ClassDetailTab = "stream" | "classwork" | "quizzes" | "people"

export function getVisibleClassTab(
  requestedTab: string | null,
  fallbackTab: ClassDetailTab,
): ClassDetailTab {
  if (
    requestedTab === "stream" ||
    requestedTab === "classwork" ||
    requestedTab === "quizzes" ||
    requestedTab === "people"
  ) {
    return requestedTab
  }

  return fallbackTab
}
