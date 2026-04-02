export type ClassDetailTab = "stream" | "classwork" | "resources" | "quizzes" | "people"

export function getVisibleClassTab(
  requestedTab: string | null,
  fallbackTab: ClassDetailTab,
): ClassDetailTab {
  if (
    requestedTab === "stream" ||
    requestedTab === "classwork" ||
    requestedTab === "resources" ||
    requestedTab === "quizzes" ||
    requestedTab === "people"
  ) {
    return requestedTab
  }

  return fallbackTab
}
