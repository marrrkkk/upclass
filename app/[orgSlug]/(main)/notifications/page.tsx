import type { Metadata } from "next"
import { Suspense } from "react"

import { NotificationsClient } from "@/components/notifications/notifications-client"
import { NotificationsHeader } from "@/components/notifications/notifications-header"
import { NotificationsContentSkeleton } from "@/components/skeletons"
import { PageContainer } from "@/components/ui/section"
import { NotificationsData } from "./notifications-data"

export const metadata: Metadata = {
  title: "Notifications",
}

export default function NotificationsPage() {
  return (
    <PageContainer>
      <NotificationsHeader />

      <Suspense fallback={<NotificationsContentSkeleton />}>
        <NotificationsData />
      </Suspense>
    </PageContainer>
  )
}