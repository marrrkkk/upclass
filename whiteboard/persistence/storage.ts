"use client"

import { supabase } from "@/lib/supabase-client"

const DEFAULT_BUCKET = "whiteboard-assets"

export function getWhiteboardBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET || DEFAULT_BUCKET
}

export async function uploadWhiteboardImage(boardId: string, file: File) {
  if (!supabase) {
    throw new Error("Supabase client is not configured")
  }

  const bucket = getWhiteboardBucket()
  const extension = file.name.split(".").pop() || "png"
  const path = `${boardId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    bucket,
    path,
    publicUrl: data.publicUrl,
  }
}
