import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { user } from "@/db/schema"
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
      hasRole: false,
      isAuthenticated: false,
      userId: undefined,
      userInfo: null,
    }
  }

  const [userData] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  return {
    hasRole: userData?.role !== null && userData?.role !== undefined,
    isAuthenticated: true,
    userId: session.user.id,
    userInfo: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  }
})
