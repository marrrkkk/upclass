import type { Metadata } from "next"
import { headers } from "next/headers"
import { and, eq, sql } from "drizzle-orm"

import { ClassesClient } from "@/components/classes/classes-client"
import { ClassesPageWrapper } from "@/components/classes/classes-page-wrapper"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, classMembership, user } from "@/db/schema"

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

export const revalidate = 30 // Revalidate every 30 seconds

export default async function ClassesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  let userRole: "teacher" | "student" | null = null
  let teachingRows: ClassRow[] = []
  let enrolledRows: ClassRow[] = []

  if (isAuthenticated && userId) {
    // Get user role
    const userData = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    userRole = userData.length > 0 ? userData[0].role : null

    // Get enrollment counts excluding teachers
    const enrollmentCounts = await db
      .select({
        classId: classMembership.classId,
        count: sql<number>`count(${classMembership.id})`,
      })
      .from(classMembership)
      .where(eq(classMembership.role, "student"))
      .groupBy(classMembership.classId)

    const countMap = new Map<string, number>()
    enrollmentCounts.forEach((row) => countMap.set(row.classId, Number(row.count)))

    teachingRows = await db
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
      .innerJoin(user, eq(classes.ownerId, user.id))

    enrolledRows = await db
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
      .innerJoin(user, eq(classes.ownerId, user.id))
  }

  // Get enrollment counts for public display
  const enrollmentCounts = await db
    .select({
      classId: classMembership.classId,
      count: sql<number>`count(${classMembership.id})`,
    })
    .from(classMembership)
    .where(eq(classMembership.role, "student"))
    .groupBy(classMembership.classId)

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
    <ClassesPageWrapper userRole={userRole} isAuthenticated={isAuthenticated}>
      <ClassesClient
        teachingClasses={mapRows(teachingRows, "teaching")}
        enrolledClasses={mapRows(enrolledRows, "enrolled")}
        isAuthenticated={isAuthenticated}
      />
    </ClassesPageWrapper>
  )
}

