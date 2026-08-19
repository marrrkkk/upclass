import type { Metadata } from "next"
import { Suspense } from "react"

import { CalendarSkeleton } from "@/components/skeletons"
import { CalendarData } from "./calendar-data"

export const metadata: Metadata = {
  title: "Calendar",
}

export default function CalendarPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarData params={params} />
    </Suspense>
  )
}