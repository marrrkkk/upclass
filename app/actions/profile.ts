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
  const image = (formData.get("image") as string | null)?.trim()
  const cover = (formData.get("cover") as string | null)?.trim()
  const coverColor = (formData.get("coverColor") as string | null)?.trim()

  if (!name) {
    return { success: false, error: "Name is required" }
  }

  if (!role || (role !== "teacher" && role !== "student")) {
    return { success: false, error: "Role must be teacher or student" }
  }

  try {
    await db
      .update(user)
      .set({
        name,
        bio: bio || null,
        role: role as "teacher" | "student",
        image: image || null,
        cover: cover || null,
        coverColor: coverColor || "#3b82f6",
      })
      .where(eq(user.id, session.user.id))

    revalidatePath("/user")
    revalidatePath("/onboard")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("updateProfile error", error)
    return { success: false, error: "Failed to update profile" }
  }
}


