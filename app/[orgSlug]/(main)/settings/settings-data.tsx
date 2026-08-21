import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { SettingsClient } from "@/components/settings/settings-client"
import { db } from "@/db"
import { user } from "@/db/schema"
import { getOptionalSession, getUserRole } from "@/lib/server/auth"

export async function SettingsData({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getOptionalSession()
  const { orgSlug } = await params

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
    redirect(`/${orgSlug}/dashboard`)
  }

  const userRole = await getUserRole(session.user.id)

  return (
    <SettingsClient
      userData={{
        id: userData[0].id,
        name: userData[0].name,
        email: userData[0].email,
        image: userData[0].image,
        bio: userData[0].bio,
        role: userRole,
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