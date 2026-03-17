/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { user } from "@/db/schema"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function updateSettings(
  formData: FormData,
  section: "profile" | "notifications" | "privacy"
): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const updateData: any = {}

    if (section === "profile") {
      const name = (formData.get("name") as string | null)?.trim()
      const bio = (formData.get("bio") as string | null)?.trim()
      const image = (formData.get("image") as string | null)?.trim()

      if (!name) {
        return { success: false, error: "Name is required" }
      }

      updateData.name = name
      updateData.bio = bio || null
      updateData.image = image || null
    } else if (section === "notifications") {
      updateData.emailNotifications = formData.get("emailNotifications") === "true"
      updateData.pushNotifications = formData.get("pushNotifications") === "true"
      updateData.classNotifications = formData.get("classNotifications") === "true"
      updateData.messageNotifications = formData.get("messageNotifications") === "true"
    } else if (section === "privacy") {
      const profileVisibility = formData.get("profileVisibility") as string | null
      if (profileVisibility && ["public", "private", "contacts"].includes(profileVisibility)) {
        updateData.profileVisibility = profileVisibility
      }
      updateData.showEmail = formData.get("showEmail") === "true"
      updateData.showClasses = formData.get("showClasses") === "true"
      updateData.showResources = formData.get("showResources") === "true"
    }

    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id))

    revalidatePath("/settings")
    revalidatePath("/user")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("updateSettings error", error)
    return { success: false, error: "Failed to update settings" }
  }
}

export async function deleteAccount(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const confirm = formData.get("confirm") as string | null

  if (confirm !== "DELETE") {
    return { success: false, error: "Please type DELETE to confirm" }
  }

  try {
    // Delete user (cascade will handle related data)
    await db
      .delete(user)
      .where(eq(user.id, session.user.id))

    return { success: true }
  } catch (error) {
    console.error("deleteAccount error", error)
    return { success: false, error: "Failed to delete account" }
  }
}

