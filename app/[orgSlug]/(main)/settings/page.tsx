import type { Metadata } from "next"
import { Suspense } from "react"

import { SettingsBodySkeleton } from "@/components/skeletons"
import { SettingsHeader } from "@/components/settings/settings-header"
import { SettingsData } from "./settings-data"

export const metadata: Metadata = {
  title: "Settings",
}

export default function SettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <SettingsHeader>
      <Suspense fallback={<SettingsBodySkeleton />}>
        <SettingsData params={params} />
      </Suspense>
    </SettingsHeader>
  )
}