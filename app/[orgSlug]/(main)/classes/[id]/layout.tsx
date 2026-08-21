import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { PageHeaderTitleSetter } from "@/components/page-header-title-setter"
import { db } from "@/db"
import { classes, organizations } from "@/db/schema"

/** Prevent a class from one organization being opened through another organization's URL. */
export default async function ClassOrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params
  const [classInOrganization] = await db
    .select({ id: classes.id, title: classes.title })
    .from(classes)
    .innerJoin(organizations, eq(classes.orgId, organizations.id))
    .where(and(eq(classes.id, id), eq(organizations.slug, orgSlug)))
    .limit(1)

  if (!classInOrganization) notFound()
  return (
    <>
      <PageHeaderTitleSetter title={classInOrganization.title} />
      {children}
    </>
  )
}
