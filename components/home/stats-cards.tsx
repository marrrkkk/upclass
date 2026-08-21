import { StatGroup, StatTile } from "@/components/ui/stat-tile"

export type StatsData = {
  totalClasses: number
  pendingTasks: number
  unreadMessages: number
  unreadNotifications: number
  pendingSubmissions?: number
  overdueWork?: number
  unreadStudentQuestions?: number
  lowParticipationAlerts?: number
  completedTasks?: number
}

type StatsCardsProps = {
  stats: StatsData
  role: "teacher" | "student" | null
}

export function StatsCards({ stats, role }: StatsCardsProps) {
  const pendingCount = role === "teacher" ? stats.pendingSubmissions || 0 : stats.pendingTasks

  return (
    <StatGroup
      columns={4}
      aria-label="Dashboard summary"
      className="gap-3 sm:gap-4 overflow-visible border-0 bg-transparent shadow-none"
    >
      <StatTile
        label="Active classes"
        value={stats.totalClasses}
        hint="Course spaces"
        tone="primary"
        className="rounded-xl bg-card px-4 py-3.5 transition-all duration-200 hover:border-hairline-strong hover:shadow-e2"
      />
      <StatTile
        label={role === "teacher" ? "Pending reviews" : "Pending tasks"}
        value={pendingCount}
        hint={role === "teacher" ? "Ready to grade" : "Still to complete"}
        tone={pendingCount > 0 ? "warning" : "neutral"}
        className="rounded-xl bg-card px-4 py-3.5 transition-all duration-200 hover:border-hairline-strong hover:shadow-e2"
      />
      <StatTile
        label="Messages"
        value={stats.unreadMessages}
        hint="Unread conversations"
        tone={stats.unreadMessages > 0 ? "info" : "neutral"}
        className="rounded-xl bg-card px-4 py-3.5 transition-all duration-200 hover:border-hairline-strong hover:shadow-e2"
      />
      <StatTile
        label="Notifications"
        value={stats.unreadNotifications}
        hint="New updates"
        tone={stats.unreadNotifications > 0 ? "info" : "neutral"}
        className="rounded-xl bg-card px-4 py-3.5 transition-all duration-200 hover:border-hairline-strong hover:shadow-e2"
      />
    </StatGroup>
  )
}

