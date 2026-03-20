import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { SettingsClient } from "@/components/settings/settings-client"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Get user data with all settings
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (userData.length === 0) {
    redirect("/home")
  }

  return (
    <SettingsClient
      userData={{
        id: userData[0].id,
        name: userData[0].name,
        email: userData[0].email,
        image: userData[0].image,
        bio: userData[0].bio,
        role: userData[0].role,
        emailNotifications: userData[0].emailNotifications,
        pushNotifications: userData[0].pushNotifications,
        classNotifications: userData[0].classNotifications,
        messageNotifications: userData[0].messageNotifications,
        profileVisibility: userData[0].profileVisibility,
        showEmail: userData[0].showEmail,
        showClasses: userData[0].showClasses,
        showResources: userData[0].showResources,
        createdAt: String(userData[0].createdAt),
      }}
    />
  )
}
