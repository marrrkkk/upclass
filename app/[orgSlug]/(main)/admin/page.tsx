import { Suspense } from "react"

import { AdminPageShell } from "@/components/organization/admin-page-shell"
import { AdminBodySkeleton } from "@/components/skeletons"
import { AdminData } from "./admin-data"

export const metadata = { title: "Organization" }

export default function OrganizationAdminPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminBodySkeleton />}>
        <AdminData params={params} />
      </Suspense>
    </AdminPageShell>
  )
}