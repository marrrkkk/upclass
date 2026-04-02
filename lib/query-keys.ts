import type { ActivityCategory } from "@/lib/activity-ui"
import type { ClassDetailTab } from "@/lib/classes/class-detail-tabs"

export const mainQueryKeys = {
  shellRecentClasses: (userId: string) => ["shell", "recent-classes", userId] as const,
  homeOverview: (userId: string) => ["home", "overview", userId] as const,
  homeActivity: (userId: string) => ["home", "activity", userId] as const,
  classes: (scope: string) => ["classes", scope] as const,
  resources: (scope: string) => ["resources", scope] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  messages: (userId: string) => ["messages", "threads", userId] as const,
  activity: (userId: string, filter: ActivityCategory, cursor: string | null) =>
    ["activity", userId, filter, cursor] as const,
  classFrame: (classId: string) => ["class", classId, "frame"] as const,
  classTab: (classId: string, tab: ClassDetailTab) => ["class", classId, "tab", tab] as const,
}
