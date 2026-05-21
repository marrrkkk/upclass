import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { eq, and, notInArray } from "drizzle-orm"

import { db } from "@/db"
import { organization, orgMembership, classes, classMembership } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import { ClassBrowser } from "@/components/organizations/class-browser"

export const metadata: Metadata = {
  title: "Browse Classes",
}

export default async function OrgEnrollPage({
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

  // Verify user is a student member of this org
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

  if (myMembership[0].role !== "student") {
    redirect(`/${slug}`)
  }

  // Get classes user is already enrolled in
  const enrolledClasses = await db
    .select({ classId: classMembership.classId })
    .from(classMembership)
    .where(eq(classMembership.userId, session.user.id))

  const enrolledClassIds = enrolledClasses.map((c) => c.classId)

  // Fetch available org classes (not already enrolled)
  const availableClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
    })
    .from(classes)
    .where(
      enrolledClassIds.length > 0
        ? and(
            eq(classes.organizationId, org.id),
            notInArray(classes.id, enrolledClassIds),
          )
        : eq(classes.organizationId, org.id),
    )
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Classes</h1>
        <p className="text-muted-foreground">
          Enroll in classes available in {org.name}
        </p>
      </div>

      <ClassBrowser orgId={org.id} classes={availableClasses} />
    </div>
  )
}
