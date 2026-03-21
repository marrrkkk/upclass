import type { Metadata } from "next"
import { Suspense } from "react"
import { and, eq, sql } from "drizzle-orm"

import { ClassesClient } from "@/components/classes/classes-client"
import { ClassesPageWrapper } from "@/components/classes/classes-page-wrapper"
import { ClassesPageSkeleton } from "@/components/skeletons"
import { db } from "@/db"
import { classes, classMembership, user } from "@/db/schema"
import { getOptionalSession } from "@/lib/server/auth"

type ClassRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  schedule: string | null
  createdAt: Date | null
  teacherName: string | null
  teacherImage: string | null
}

export const metadata: Metadata = {
  title: "Classes",
}

export default async function ClassesPage() {
  const session = await getOptionalSession()

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  let userRole: "teacher" | "student" | null = null

  if (isAuthenticated && userId) {
    const userData = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    userRole = userData.length > 0 ? userData[0].role : null
  }

  return (
    <ClassesPageWrapper userRole={userRole} isAuthenticated={isAuthenticated}>
      <Suspense fallback={<ClassesPageSkeleton />}>
        <ClassesPageContent
          isAuthenticated={isAuthenticated}
          userId={userId}
        />
      </Suspense>
    </ClassesPageWrapper>
  )
}

async function ClassesPageContent({
  isAuthenticated,
  userId,
}: {
  isAuthenticated: boolean
  userId?: string
}) {
  let teachingRows: ClassRow[] = []
  let enrolledRows: ClassRow[] = []

  const enrollmentCountsPromise = db
    .select({
      classId: classMembership.classId,
      count: sql<number>`count(${classMembership.id})`,
    })
    .from(classMembership)
    .where(eq(classMembership.role, "student"))
    .groupBy(classMembership.classId)

  if (isAuthenticated && userId) {
    const [teachingResult, enrolledResult] = await Promise.all([
      db
        .select({
          id: classes.id,
          title: classes.title,
          description: classes.description,
          category: classes.category,
          color: classes.color,
          schedule: classes.schedule,
          createdAt: classes.createdAt,
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
        .innerJoin(user, eq(classes.ownerId, user.id)),
      db
        .select({
          id: classes.id,
          title: classes.title,
          description: classes.description,
          category: classes.category,
          color: classes.color,
          schedule: classes.schedule,
          createdAt: classes.createdAt,
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
        .innerJoin(user, eq(classes.ownerId, user.id)),
    ])

    teachingRows = teachingResult
    enrolledRows = enrolledResult
  }

  const enrollmentCounts = await enrollmentCountsPromise
  const countMap = new Map<string, number>()
  enrollmentCounts.forEach((row) => countMap.set(row.classId, Number(row.count)))

  const mapRows = (rows: ClassRow[], role: "teaching" | "enrolled") =>
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? "",
      enrolledCount: countMap.get(row.id) ?? 0,
      role,
      teacherName: row.teacherName,
      teacherImage: row.teacherImage,
    }))

  return (
    <ClassesClient
      teachingClasses={mapRows(teachingRows, "teaching")}
      enrolledClasses={mapRows(enrolledRows, "enrolled")}
      isAuthenticated={isAuthenticated}
    />
  )
}
