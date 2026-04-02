import type { Metadata } from "next"

import { ActivityRouteClient } from "@/components/activity/activity-route-client"

export const metadata: Metadata = {
  title: "Activity",
}

export default function ActivityPage() {
  return <ActivityRouteClient />
}
