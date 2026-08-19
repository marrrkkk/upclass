import { GreetingCard, type GreetingCardProps } from "@/components/home/greeting-card"

/**
 * Static top of the dashboard: the greeting line, rendered outside the data
 * Suspense boundaries so it paints the instant the route commits.
 *
 * There is deliberately no quick-action grid here — every destination it held
 * is already one click away in the sidebar, and repeating it was the main
 * source of visual noise at the top of the page.
 */
export function DashboardHeader({
  userName,
  role,
  primaryAction,
}: {
  userName: string
  role: "teacher" | "student" | null
  primaryAction?: GreetingCardProps["primaryAction"]
}) {
  return (
    <GreetingCard userName={userName} role={role} primaryAction={primaryAction} />
  )
}