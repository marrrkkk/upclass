import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, sql, inArray } from "drizzle-orm"
import { GraduationCap, BookOpen, FolderOpen, Users } from "lucide-react"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user, classes, classMembership, resources } from "@/db/schema"
import { ProfileClient } from "@/components/profile/profile-client"

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Get user data
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (userData.length === 0) {
    redirect("/sign-in")
  }

  const currentUser = userData[0]

  // Get classes created (if teacher)
  const createdClasses = currentUser.role === "teacher"
    ? await db
        .select({
          id: classes.id,
          title: classes.title,
          description: classes.description,
          category: classes.category,
          color: classes.color,
          createdAt: classes.createdAt,
        })
        .from(classes)
        .where(eq(classes.ownerId, session.user.id))
        .orderBy(classes.createdAt)
    : []

  // Get classes joined (enrolled as student or teacher)
  const enrolledClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      category: classes.category,
      color: classes.color,
      role: classMembership.role,
      createdAt: classes.createdAt,
    })
    .from(classMembership)
    .innerJoin(classes, eq(classMembership.classId, classes.id))
    .where(eq(classMembership.userId, session.user.id))
    .orderBy(classes.createdAt)

  // Get enrollment counts for created classes
  const classIds = createdClasses.map(c => c.id)
  let enrollmentCounts: { classId: string; count: number }[] = []
  
  if (classIds.length > 0) {
    // Use IN operator for multiple class IDs
    const counts = await db
      .select({
        classId: classMembership.classId,
        count: sql<number>`count(${classMembership.id})`,
      })
      .from(classMembership)
      .where(inArray(classMembership.classId, classIds))
      .groupBy(classMembership.classId)
    
    enrollmentCounts = counts.map(row => ({
      classId: row.classId,
      count: Number(row.count),
    }))
  }

  const countMap = new Map<string, number>()
  enrollmentCounts.forEach((row) => countMap.set(row.classId, Number(row.count)))

  // Get resources created
  const createdResources = await db
    .select()
    .from(resources)
    .where(eq(resources.ownerId, session.user.id))
    .orderBy(resources.createdAt)

  return (
    <ProfileClient
      user={{
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
        bio: currentUser.bio,
        role: currentUser.role,
      }}
      createdClasses={createdClasses.map(c => ({
        ...c,
        createdAt: c.createdAt?.toISOString() ?? "",
        enrolledCount: countMap.get(c.id) ?? 0,
      }))}
      enrolledClasses={enrolledClasses.map(c => ({
        ...c,
        createdAt: c.createdAt?.toISOString() ?? "",
      }))}
      createdResources={createdResources.map(r => ({
        ...r,
        createdAt: r.createdAt?.toISOString() ?? "",
      }))}
    />
  )
}

