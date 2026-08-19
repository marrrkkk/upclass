import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { and, eq, or } from "drizzle-orm"

import { db } from "@/db"
import { classes, classMembership, orgMembership } from "@/db/schema"
import { auth } from "@/lib/auth"

export const getOptionalSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  })
})

export async function requireSession() {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  return session
}

export const getMainShellState = cache(async () => {
  const session = await getOptionalSession()

  if (!session?.user?.id) {
    return {
      hasOrganization: false,
      isAuthenticated: false,
      userId: undefined,
      userInfo: null,
    }
  }

  // Check if user belongs to any organization
  const userOrgs = await db
    .select({ id: orgMembership.id })
    .from(orgMembership)
    .where(eq(orgMembership.userId, session.user.id))
    .limit(1)

  return {
    hasOrganization: userOrgs.length > 0,
    isAuthenticated: true,
    userId: session.user.id,
    userInfo: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  }
})

export const getUserRole = cache(async (userId: string): Promise<"teacher" | "student"> => {
  const teacherMembership = await db
    .select({ id: classes.id })
    .from(classes)
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      or(
        eq(classes.ownerId, userId),
        and(eq(classMembership.userId, userId), eq(classMembership.role, "teacher")),
      ),
    )
    .limit(1)

  return teacherMembership.length > 0 ? "teacher" : "student"
})
