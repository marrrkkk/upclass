import type { Metadata } from "next"

import { NotificationsRouteClient } from "@/components/notifications/notifications-route-client"

export const metadata: Metadata = {
  title: "Notifications",
}

export default function NotificationsPage() {
  return <NotificationsRouteClient />
}
