import { and, asc, eq, inArray, sql } from "drizzle-orm"

import { ClassesClient, type ClassesData } from "@/components/classes/classes-client"
import { db } from "@/db"
import { classes, classMembership, classwork, organizations, user } from "@/db/schema"
import { getOrganizationMembership } from "@/lib/org-validation"
import { canCreateClass } from "@/lib/org-permissions"
import { getOptionalSession } from "@/lib/server/auth"
import type { ClassCardData, ClassMemberPreview } from "@/types/classes"

/** Student faces fetched per class before the card stack collapses into `+N`. */
const STUDENT_PREVIEW_LIMIT = 5

type ClassRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  gradeLevel: string | null
  customGrade: string | null
  section: string | null
  color: string | null
  schedule: string | null
  createdAt: Date | null
  updatedAt: Date | null
  teacherName: string | null
  teacherImage: string | null
}

export async function ClassesData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [session, { orgSlug }] = await Promise.all([getOptionalSession(), params])
  const userId = session?.user?.id
  const isAuthenticated = Boolean(userId)
  const membership = userId ? await getOrganizationMembership(userId, orgSlug) : null
  const canCreate = membership ? canCreateClass(membership.role) : false

  // The class rows resolve from a promise so the static shell (title,
  // description, search controls) paints instantly while the grid streams in
  // inside ClassesClient's own Suspense boundary.
  const classesPromise = loadClasses({ isAuthenticated, userId, orgSlug })

  return (
    <ClassesClient
      classesPromise={classesPromise}
      isAuthenticated={isAuthenticated}
      canCreateClass={canCreate}
      orgSlug={orgSlug}
    />
  )
}

function loadClasses({
  isAuthenticated,
  userId,
  orgSlug,
}: {
  isAuthenticated: boolean
  userId?: string
  orgSlug: string
}): Promise<ClassesData> {
  return (async () => {
    let teachingRows: ClassRow[] = []
    let enrolledRows: ClassRow[] = []

    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1)

    if (!organization) {
      return { teachingClasses: [], enrolledClasses: [] }
    }

    if (isAuthenticated && userId) {
      const [teachingResult, enrolledResult] = await Promise.all([
        db
          .select({
            id: classes.id,
            title: classes.title,
            description: classes.description,
            category: classes.category,
            gradeLevel: classes.gradeLevel,
            customGrade: classes.customGrade,
            section: classes.section,
            color: classes.color,
            schedule: classes.schedule,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
            teacherName: user.name,
            teacherImage: user.image,
          })
          .from(classes)
          .innerJoin(
            classMembership,
            and(
              eq(classMembership.classId, classes.id),
              eq(classMembership.userId, userId),
              eq(classMembership.role, "teacher"),
            ),
          )
          .innerJoin(user, eq(classes.ownerId, user.id))
          .where(eq(classes.orgId, organization.id)),
        db
          .select({
            id: classes.id,
            title: classes.title,
            description: classes.description,
            category: classes.category,
            gradeLevel: classes.gradeLevel,
            customGrade: classes.customGrade,
            section: classes.section,
            color: classes.color,
            schedule: classes.schedule,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
            teacherName: user.name,
            teacherImage: user.image,
          })
          .from(classes)
          .innerJoin(
            classMembership,
            and(
              eq(classMembership.classId, classes.id),
              eq(classMembership.userId, userId),
              eq(classMembership.role, "student"),
            ),
          )
          .innerJoin(user, eq(classes.ownerId, user.id))
          .where(eq(classes.orgId, organization.id)),
      ])

      teachingRows = teachingResult
      enrolledRows = enrolledResult
    }

    const classIds = Array.from(
      new Set([...teachingRows, ...enrolledRows].map((row) => row.id)),
    )

    if (classIds.length === 0) {
      return { teachingClasses: [], enrolledClasses: [] }
    }

    // Card metadata is scoped to the classes actually being rendered — this is
    // the user's own roster, so the membership rows stay small enough to slice
    // the avatar preview in memory instead of running a query per class.
    const [studentCounts, classworkCounts, studentRows] = await Promise.all([
      db
        .select({
          classId: classMembership.classId,
          count: sql<number>`count(${classMembership.id})`,
        })
        .from(classMembership)
        .where(
          and(inArray(classMembership.classId, classIds), eq(classMembership.role, "student")),
        )
        .groupBy(classMembership.classId),
      db
        .select({
          classId: classwork.classId,
          count: sql<number>`count(${classwork.id})`,
        })
        .from(classwork)
        .where(inArray(classwork.classId, classIds))
        .groupBy(classwork.classId),
      db
        .select({
          classId: classMembership.classId,
          userId: classMembership.userId,
          name: user.name,
          image: user.image,
        })
        .from(classMembership)
        .innerJoin(user, eq(classMembership.userId, user.id))
        .where(
          and(inArray(classMembership.classId, classIds), eq(classMembership.role, "student")),
        )
        .orderBy(asc(classMembership.createdAt)),
    ])

    const studentCountMap = new Map<string, number>()
    studentCounts.forEach((row) => studentCountMap.set(row.classId, Number(row.count)))

    const classworkCountMap = new Map<string, number>()
    classworkCounts.forEach((row) => classworkCountMap.set(row.classId, Number(row.count)))

    const studentPreviewMap = new Map<string, ClassMemberPreview[]>()
    studentRows.forEach((row) => {
      const preview = studentPreviewMap.get(row.classId) ?? []
      if (preview.length >= STUDENT_PREVIEW_LIMIT) return
      preview.push({ id: row.userId, name: row.name, image: row.image })
      studentPreviewMap.set(row.classId, preview)
    })

    const mapRows = (rows: ClassRow[], role: "teaching" | "enrolled"): ClassCardData[] =>
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt?.toISOString() ?? "",
        updatedAt: (row.updatedAt ?? row.createdAt)?.toISOString() ?? "",
        enrolledCount: studentCountMap.get(row.id) ?? 0,
        classworkCount: classworkCountMap.get(row.id) ?? 0,
        students: studentPreviewMap.get(row.id) ?? [],
        role,
        teacherName: row.teacherName,
        teacherImage: row.teacherImage,
      }))

    return {
      teachingClasses: mapRows(teachingRows, "teaching"),
      enrolledClasses: mapRows(enrolledRows, "enrolled"),
    }
  })()
}
