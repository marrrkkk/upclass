import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership, classes, classMembership } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { Card } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Organization Classes",
}

export default async function OrgClassesPage({
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

  // Get org classes
  const orgClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
    })
    .from(classes)
    .where(eq(classes.organizationId, org.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Classes</h1>
        <p className="text-muted-foreground">
          Classes in {org.name}
        </p>
      </div>

      {orgClasses.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No classes yet</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgClasses.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold">{cls.title}</h3>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {cls.description}
                  </p>
                )}
                {cls.category && (
                  <p className="text-xs text-muted-foreground mt-2">{cls.category}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
