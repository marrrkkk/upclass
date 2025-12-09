"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { classes, classMembership } from "@/db/schema"

type ActionResponse =
  | { success: true }
  | { success: false; error: string }

export async function createClass(formData: FormData): Promise<ActionResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const title = (formData.get("title") as string | null)?.trim()
  const description = (formData.get("description") as string | null)?.trim()
  const category = (formData.get("category") as string | null)?.trim() || "General"

  if (!title) {
    return { success: false, error: "Title is required" }
  }

  const classId = crypto.randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(classes).values({
        id: classId,
        title,
        description,
        category,
        ownerId: session.user.id,
      })

      await tx.insert(classMembership).values({
        id: crypto.randomUUID(),
        classId,
        userId: session.user.id,
        role: "teacher",
      })
    })

    revalidatePath("/home/classes")
    revalidatePath("/home")

    return { success: true }
  } catch (error) {
    console.error("createClass error", error)
    return { success: false, error: "Failed to create class" }
  }
}

