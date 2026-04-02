"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { user } from "@/db/schema"
import { didManagedStorageChange, readManagedStorageFields } from "@/lib/storage/managed-files"
import { removeStorageObjects } from "@/lib/storage/server"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function updateProfile(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const name = (formData.get("name") as string | null)?.trim()
  const bio = (formData.get("bio") as string | null)?.trim()
  const role = (formData.get("role") as string | null)?.trim()
  const coverColor = (formData.get("coverColor") as string | null)?.trim()

  if (!name) {
    return { success: false, error: "Name is required" }
  }

  if (!role || (role !== "teacher" && role !== "student")) {
    return { success: false, error: "Role must be teacher or student" }
  }

  try {
    const existingUser = await db
      .select({
        image: user.image,
        imageStorageBucket: user.imageStorageBucket,
        imageStoragePath: user.imageStoragePath,
        cover: user.cover,
        coverStorageBucket: user.coverStorageBucket,
        coverStoragePath: user.coverStoragePath,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    if (existingUser.length === 0) {
      return { success: false, error: "User not found" }
    }

    const currentUser = existingUser[0]
    const hasImageField = formData.has("image")
    const hasCoverField = formData.has("cover")
    const nextImage = readManagedStorageFields(formData, "image")
    const nextCover = readManagedStorageFields(formData, "cover")
    const resolvedImageUrl = hasImageField ? nextImage.url : currentUser.image
    const resolvedCoverUrl = hasCoverField ? nextCover.url : currentUser.cover
    const resolvedImageBucket = hasImageField ? nextImage.bucket : currentUser.imageStorageBucket
    const resolvedImagePath = hasImageField ? nextImage.path : currentUser.imageStoragePath
    const resolvedCoverBucket = hasCoverField ? nextCover.bucket : currentUser.coverStorageBucket
    const resolvedCoverPath = hasCoverField ? nextCover.path : currentUser.coverStoragePath

    await db
      .update(user)
      .set({
        name,
        bio: bio || null,
        role: role as "teacher" | "student",
        image: resolvedImageUrl || null,
        imageStorageBucket: resolvedImageBucket || null,
        imageStoragePath: resolvedImagePath || null,
        cover: resolvedCoverUrl || null,
        coverStorageBucket: resolvedCoverBucket || null,
        coverStoragePath: resolvedCoverPath || null,
        coverColor: coverColor || "#3b82f6",
      })
      .where(eq(user.id, session.user.id))

    const staleFiles = []
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

    if (
      hasCoverField &&
      didManagedStorageChange(
        {
          bucket: currentUser.coverStorageBucket,
          path: currentUser.coverStoragePath,
        },
        {
          bucket: resolvedCoverBucket,
          path: resolvedCoverPath,
        },
      )
    ) {
      staleFiles.push({
        bucket: currentUser.coverStorageBucket,
        path: currentUser.coverStoragePath,
      })
    }

    await removeStorageObjects(staleFiles)

    revalidatePath("/user")
    revalidatePath("/onboard")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("updateProfile error", error)
    return { success: false, error: "Failed to update profile" }
  }
}


