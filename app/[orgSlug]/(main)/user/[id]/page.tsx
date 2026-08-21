import type { Metadata } from "next"
import { Suspense } from "react"

import { ProfileBodySkeleton } from "@/components/skeletons"
import { ProfilePageShell } from "@/components/profile/profile-page-shell"
import { UserProfileData } from "./user-profile-data"

export function generateMetadata(): Metadata {
  return {
    title: "Profile",
  }
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProfilePageShell>
      <Suspense fallback={<ProfileBodySkeleton />}>
        <UserProfileData params={params} />
      </Suspense>
    </ProfilePageShell>
  )
}