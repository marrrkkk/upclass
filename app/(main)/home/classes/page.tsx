import { headers } from "next/headers"
import { and, eq, sql } from "drizzle-orm"

import { ClassesClient } from "@/components/classes/classes-client"
import { ClassesPageWrapper } from "@/components/classes/classes-page-wrapper"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, classMembership } from "@/db/schema"

type ClassRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  createdAt: Date | null
}

export default async function ClassesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return (
      <section className="flex-1">
        <p className="text-muted-foreground">Please sign in to view classes.</p>
      </section>
    )
  }

  const userId = session.user.id

  const enrollmentCounts = await db
    .select({
      classId: classMembership.classId,
      count: sql<number>`count(${classMembership.id})`,
    })
    .from(classMembership)
    .groupBy(classMembership.classId)

  const countMap = new Map<string, number>()
  enrollmentCounts.forEach((row) => countMap.set(row.classId, Number(row.count)))

  const teachingRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      color: classes.color,
      createdAt: classes.createdAt,
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

  const enrolledRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      color: classes.color,
      createdAt: classes.createdAt,
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

  const mapRows = (rows: ClassRow[], role: "teaching" | "enrolled") =>
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? "",
      enrolledCount: countMap.get(row.id) ?? 0,
      role,
    }))

  return (
    <ClassesPageWrapper>
      <ClassesClient
        teachingClasses={mapRows(teachingRows, "teaching")}
        enrolledClasses={mapRows(enrolledRows, "enrolled")}
      />
    </ClassesPageWrapper>
  )
}

