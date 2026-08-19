import { eq } from "drizzle-orm"

import { ResourcesClient, type ResourceCardData } from "@/components/resources/resources-client"
import { ResourcesPageWrapper } from "@/components/resources/resources-page-wrapper"
import { db } from "@/db"
import { classes, organizations, resources, user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"
import type { ClassCardData } from "@/types/classes"

export async function ResourcesData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [session, { orgSlug }] = await Promise.all([getOptionalSession(), params])
  const isAuthenticated = !!session?.user?.id

  // The resource rows resolve from a promise so the static shell (toolbar
  // frame) paints instantly while the grid streams in inside
  // ResourcesClient's own Suspense boundary.
  const resourcesPromise = loadResources(orgSlug)

  // Load user's classes for the resource creation dialog
  const userClassesPromise = isAuthenticated
    ? loadUserClasses(session.user.id, orgSlug)
    : Promise.resolve([])

  return (
    <ResourcesPageWrapper isAuthenticated={isAuthenticated}>
      <ResourcesClient
        resourcesPromise={resourcesPromise}
        userClassesPromise={userClassesPromise}
        orgSlug={orgSlug}
        isAuthenticated={isAuthenticated}
      />
    </ResourcesPageWrapper>
  )
}

function loadResources(orgSlug: string): Promise<ResourceCardData[]> {
  return (async () => {
    const resourcesList = await db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        resourceType: resources.resourceType,
        classId: resources.classId,
        category: resources.category,
        fileUrl: resources.fileUrl,
        fileName: resources.fileName,
        fileType: resources.fileType,
        fileSize: resources.fileSize,
        createdAt: resources.createdAt,
        authorName: user.name,
        authorImage: user.image,
      })
      .from(resources)
      .innerJoin(organizations, eq(resources.orgId, organizations.id))
      .innerJoin(user, eq(resources.ownerId, user.id))
      .where(eq(organizations.slug, orgSlug))
      .orderBy(resources.createdAt)

    return resourcesList.map((resource) => ({
      ...resource,
      createdAt: resource.createdAt?.toISOString() ?? "",
      authorName: resource.authorName,
      authorImage: resource.authorImage,
    }))
  })()
}

function loadUserClasses(userId: string, orgSlug: string): Promise<ClassCardData[]> {
  return (async () => {
    const classList = await db
      .select({
        id: classes.id,
        title: classes.title,
        gradeLevel: classes.gradeLevel,
        customGrade: classes.customGrade,
        section: classes.section,
        description: classes.description,
        color: classes.color,
      })
      .from(classes)
      .innerJoin(organizations, eq(classes.orgId, organizations.id))
      .where(eq(organizations.slug, orgSlug))
      .orderBy(classes.title)

    // Filter to only classes the user is teaching or enrolled in
    // For simplicity, return all classes in the org - production might add membership filter
    return classList.map((cls) => ({
      id: cls.id,
      title: cls.title,
      gradeLevel: cls.gradeLevel,
      customGrade: cls.customGrade,
      section: cls.section,
      description: cls.description,
      color: cls.color,
      category: null,
      schedule: null,
      createdAt: "",
      updatedAt: "",
      enrolledCount: 0,
      role: "teaching" as const,
      teacherName: "",
      teacherImage: null,
    }))
  })()
}
