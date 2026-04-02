"use client"

import { supabase } from "@/lib/supabase-client"
import { buildWhiteboardAssetPath, STORAGE_BUCKETS } from "@/lib/storage/shared"

export function getWhiteboardBucket() {
  return STORAGE_BUCKETS.whiteboardAssets
}

export async function uploadWhiteboardImage(boardId: string, file: File) {
  if (!supabase) {
    throw new Error("Supabase client is not configured")
  }

  const bucket = getWhiteboardBucket()
  const path = buildWhiteboardAssetPath(boardId, file.name)

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
