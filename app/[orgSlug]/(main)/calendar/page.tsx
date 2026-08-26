import type { Metadata } from "next"
import { Suspense } from "react"

import { PageContainer, PageHeading } from "@/components/ui/section"
import { CalendarBodySkeleton } from "@/components/skeletons"
import { CalendarData } from "./calendar-data"

export const metadata: Metadata = {
  title: "Calendar",
}

export default function CalendarPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <PageContainer>
      <PageHeading
        eyebrow="Class schedule"
        title="Calendar"
        description="Deadlines across your classes for the next 30 days, with your class schedule alongside."
      />
      <Suspense fallback={<CalendarBodySkeleton />}>
        <CalendarData params={params} />
      </Suspense>
    </PageContainer>
  )
}
