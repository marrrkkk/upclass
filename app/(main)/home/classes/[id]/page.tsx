import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { eq, and, desc, asc } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { classes, classMembership, announcements, classwork, submissions, user } from "@/db/schema"
import { ClassDetailClient } from "@/components/classes/class-detail-client"

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/home")
  }

  // Get class data
  const classData = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      code: classes.code,
    })
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1)

  if (classData.length === 0) {
    notFound()
  }

  // Check if user is a member
  const membership = await db
    .select()
    .from(classMembership)
    .where(
      and(
        eq(classMembership.classId, id),
        eq(classMembership.userId, session.user.id),
      ),
    )
    .limit(1)

  if (membership.length === 0) {
    redirect("/home/classes")
  }

  const userRole = membership[0].role

  // Get announcements with author info
  const announcementsData = await db
    .select({
      id: announcements.id,
      content: announcements.content,
      createdAt: announcements.createdAt,
      author: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(announcements)
    .innerJoin(user, eq(announcements.authorId, user.id))
    .where(eq(announcements.classId, id))
    .orderBy(desc(announcements.createdAt))

  // Get classwork with submission counts
  const classworkData = await db
    .select({
      id: classwork.id,
      title: classwork.title,
      description: classwork.description,
      type: classwork.type,
      dueDate: classwork.dueDate,
      points: classwork.points,
      createdAt: classwork.createdAt,
    })
    .from(classwork)
    .where(eq(classwork.classId, id))
    .orderBy(desc(classwork.createdAt))

  // Get all submissions for this class
  const allSubmissions = await db
    .select({
      id: submissions.id,
      classworkId: submissions.classworkId,
      studentId: submissions.studentId,
      content: submissions.content,
      fileUrl: submissions.fileUrl,
      fileName: submissions.fileName,
      status: submissions.status,
      grade: submissions.grade,
      feedback: submissions.feedback,
      submittedAt: submissions.submittedAt,
      gradedAt: submissions.gradedAt,
      student: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(submissions)
    .innerJoin(user, eq(submissions.studentId, user.id))
    .innerJoin(classwork, eq(submissions.classworkId, classwork.id))
    .where(eq(classwork.classId, id))

  // Get all members
  const membersData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: classMembership.role,
    })
    .from(classMembership)
    .innerJoin(user, eq(classMembership.userId, user.id))
    .where(eq(classMembership.classId, id))
    .orderBy(asc(classMembership.role), asc(user.name))

  return (
    <ClassDetailClient
      classData={{
        id: classData[0].id,
        title: classData[0].title,
        description: classData[0].description,
        category: classData[0].category,
        code: classData[0].code,
      }}
      userId={session.user.id}
      userRole={userRole}
      announcements={announcementsData.map((a) => ({
        ...a,
        createdAt: a.createdAt?.toISOString() ?? "",
      }))}
      classwork={classworkData.map((c) => ({
        ...c,
        dueDate: c.dueDate?.toISOString() ?? null,
        createdAt: c.createdAt?.toISOString() ?? "",
      }))}
      submissions={allSubmissions.map((s) => ({
        ...s,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        gradedAt: s.gradedAt?.toISOString() ?? null,
      }))}
      members={membersData}
    />
  )
}

