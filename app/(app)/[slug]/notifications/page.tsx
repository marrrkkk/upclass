import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { Card } from "@/components/ui/card"
import { Bell } from "lucide-react"

export const metadata: Metadata = {
  title: "Organization Notifications",
}

export default async function OrgNotificationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Fetch org by slug
  const orgs = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)

  if (orgs.length === 0) {
    redirect("/")
  }

  const org = orgs[0]

  // Verify user membership
  const myMembership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, org.id),
        eq(orgMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (myMembership.length === 0) {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Notifications for {org.name}
        </p>
      </div>

      <Card className="p-8 text-center">
        <Bell className="mx-auto size-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No notifications yet</p>
      </Card>
    </div>
  )
}
