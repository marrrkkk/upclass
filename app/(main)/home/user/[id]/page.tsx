import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { eq, and, sql, inArray, or } from "drizzle-orm"
import { GraduationCap, BookOpen, FolderOpen, Users } from "lucide-react"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user, classes, classMembership, resources, messages } from "@/db/schema"
import { ProfileClient } from "@/components/profile/profile-client"

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const { id: userId } = await params
  const currentUserId = session.user.id

  // Get user data
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (userData.length === 0) {
    notFound()
  }

  const profileUser = userData[0]
  const isOwnProfile = userId === currentUserId

  // Check privacy settings
  let isPrivate = false
  if (!isOwnProfile) {
    // Check profile visibility
    if (profileUser.profileVisibility === "private") {
      isPrivate = true // Private profile - show private message
    } else if (profileUser.profileVisibility === "contacts") {
      // Check if users have messaged each other
      const hasMessaged = await db
        .select()
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, currentUserId),
              eq(messages.receiverId, userId)
            ),
            and(
              eq(messages.senderId, userId),
              eq(messages.receiverId, currentUserId)
            )
          )
        )
        .limit(1)

      if (hasMessaged.length === 0) {
        isPrivate = true // No previous messages - profile not accessible
      }
    }
  }

  // Get classes created (if teacher and showClasses is enabled)
  const createdClasses = (profileUser.role === "teacher" && (isOwnProfile || profileUser.showClasses))
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
      .where(eq(classes.ownerId, userId))
      .orderBy(classes.createdAt)
    : []

  // Get classes joined (enrolled as student or teacher) - only if showClasses is enabled
  const enrolledClasses = (isOwnProfile || profileUser.showClasses)
    ? await db
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
      .where(eq(classMembership.userId, userId))
      .orderBy(classes.createdAt)
    : []

  // Get enrollment counts for created classes
  const classIds = createdClasses.map(c => c.id)
  let enrollmentCounts: { classId: string; count: number }[] = []

  if (classIds.length > 0) {
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

  // Get resources created - only if showResources is enabled
  const createdResources = (isOwnProfile || profileUser.showResources)
    ? await db
      .select()
      .from(resources)
      .where(eq(resources.ownerId, userId))
      .orderBy(resources.createdAt)
    : []

  return (
    <ProfileClient
      user={{
        id: profileUser.id,
        name: profileUser.name,
        email: isOwnProfile || profileUser.showEmail ? profileUser.email : null,
        image: profileUser.image,
        bio: profileUser.bio,
        role: profileUser.role,
      }}
      createdClasses={isPrivate ? [] : createdClasses.map(c => ({
        ...c,
        createdAt: c.createdAt?.toISOString() ?? "",
        enrolledCount: countMap.get(c.id) ?? 0,
      }))}
      enrolledClasses={isPrivate ? [] : enrolledClasses.map(c => ({
        ...c,
        createdAt: c.createdAt?.toISOString() ?? "",
      }))}
      createdResources={isPrivate ? [] : createdResources.map(r => ({
        ...r,
        createdAt: r.createdAt?.toISOString() ?? "",
      }))}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUserId}
      isPrivate={isPrivate}
    />
  )
}

