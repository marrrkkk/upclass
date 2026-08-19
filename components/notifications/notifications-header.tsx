import { PageHeading } from "@/components/ui/section"

/**
 * Static Notifications page heading, shared by `notifications/page.tsx` and
 * `notifications/loading.tsx` so the title and description paint instantly on
 * navigation and never drift between loading and committed states.
 */
export function NotificationsHeader() {
  return (
    <PageHeading
      eyebrow="Class updates"
      title="Notifications"
      description="Announcements and coursework updates from your classes."
    />
  )
}