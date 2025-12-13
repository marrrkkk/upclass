import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { user } from "@/db/schema"
import { SettingsClient } from "@/components/settings/settings-client"

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  // Get user data with all settings
  const userData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio,
      role: user.role,
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications,
      classNotifications: user.classNotifications,
      messageNotifications: user.messageNotifications,
      profileVisibility: user.profileVisibility,
      showEmail: user.showEmail,
      showClasses: user.showClasses,
      showResources: user.showResources,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (userData.length === 0) {
    redirect("/home")
  }

  return <SettingsClient userData={userData[0]} />
}
