/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { user } from "@/db/schema"
import { collectUserManagedStorageRefs } from "@/lib/storage/cleanup"
import { didManagedStorageChange, readManagedStorageFields } from "@/lib/storage/managed-files"
import { removeStorageObjects } from "@/lib/storage/server"

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
    const staleFiles: Array<{ bucket?: string | null; path?: string | null }> = []

    if (section === "profile") {
      const name = (formData.get("name") as string | null)?.trim()
      const bio = (formData.get("bio") as string | null)?.trim()

      if (!name) {
        return { success: false, error: "Name is required" }
      }

      const existingUser = await db
        .select({
          image: user.image,
          imageStorageBucket: user.imageStorageBucket,
          imageStoragePath: user.imageStoragePath,
        })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1)

      if (existingUser.length === 0) {
        return { success: false, error: "User not found" }
      }

      const currentUser = existingUser[0]
      const hasImageField = formData.has("image")
      const nextImage = readManagedStorageFields(formData, "image")
      const resolvedImageUrl = hasImageField ? nextImage.url : currentUser.image
      const resolvedImageBucket = hasImageField ? nextImage.bucket : currentUser.imageStorageBucket
      const resolvedImagePath = hasImageField ? nextImage.path : currentUser.imageStoragePath

      updateData.name = name
      updateData.bio = bio || null
      updateData.image = resolvedImageUrl || null
      updateData.imageStorageBucket = resolvedImageBucket || null
      updateData.imageStoragePath = resolvedImagePath || null

      if (
        hasImageField &&
        didManagedStorageChange(
          {
            bucket: currentUser.imageStorageBucket,
            path: currentUser.imageStoragePath,
          },
          {
            bucket: resolvedImageBucket,
            path: resolvedImagePath,
          },
        )
      ) {
        staleFiles.push({
          bucket: currentUser.imageStorageBucket,
          path: currentUser.imageStoragePath,
        })
      }
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

    await removeStorageObjects(staleFiles)

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
    const staleFiles = await collectUserManagedStorageRefs(session.user.id)
    await db
      .delete(user)
      .where(eq(user.id, session.user.id))
    await removeStorageObjects(staleFiles)

    return { success: true }
  } catch (error) {
    console.error("deleteAccount error", error)
    return { success: false, error: "Failed to delete account" }
  }
}

