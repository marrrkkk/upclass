import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and, count } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership, classes } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { Card } from "@/components/ui/card"
import { Users, BookOpen, Building2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Organization Dashboard",
}

export default async function OrgDashboardPage({
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

  // Get stats
  const [memberCountResult, classCountResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(orgMembership)
      .where(eq(orgMembership.organizationId, org.id)),
    db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.organizationId, org.id)),
  ])

  const memberCount = memberCountResult[0]?.count ?? 0
  const classCount = classCountResult[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
        {org.description && (
          <p className="text-muted-foreground mt-1">{org.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classCount}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold capitalize">{myMembership[0].role}</p>
              <p className="text-sm text-muted-foreground">Your Role</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
