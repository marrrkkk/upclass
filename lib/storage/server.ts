import "server-only"

import { createClient } from "@supabase/supabase-js"

type StorageObjectRef = {
  bucket?: string | null
  path?: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseStorageAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null

export function getPublicStorageUrl(bucket: string, path: string) {
  if (!supabaseStorageAdmin) {
    throw new Error("Supabase storage admin client is not configured")
  }

  const { data } = supabaseStorageAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function createSignedStorageDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60,
) {
  if (!supabaseStorageAdmin) {
    throw new Error("Supabase storage admin client is not configured")
  }

  const { data, error } = await supabaseStorageAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw error || new Error("Failed to create a signed download URL")
  }

  return data.signedUrl
}

export async function downloadStorageObject(bucket: string, path: string) {
  if (!supabaseStorageAdmin) {
    throw new Error("Supabase storage admin client is not configured")
  }

  const { data, error } = await supabaseStorageAdmin.storage.from(bucket).download(path)

  if (error || !data) {
    throw error || new Error("Failed to download storage object")
  }

  return await data.arrayBuffer()
}

export async function createSignedStorageUpload(bucket: string, path: string) {
  if (!supabaseStorageAdmin) {
    throw new Error("Supabase storage admin client is not configured")
  }

  const { data, error } = await supabaseStorageAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, {
      upsert: false,
    })

  if (error?.message === "The related resource does not exist") {
    throw new Error(
      `Storage bucket "${bucket}" does not exist. Run npm run storage:setup or create the bucket in Supabase first.`,
    )
  }

  if (error || !data?.token) {
    throw error || new Error("Failed to create a signed upload URL")
  }

  return data.token
}

export async function removeStorageObjects(objects: StorageObjectRef[]) {
  if (!supabaseStorageAdmin) {
    throw new Error("Supabase storage admin client is not configured")
  }

  const grouped = new Map<string, string[]>()

  for (const object of objects) {
    if (!object.bucket || !object.path) continue
    const bucketPaths = grouped.get(object.bucket) || []
    bucketPaths.push(object.path)
    grouped.set(object.bucket, bucketPaths)
  }

  for (const [bucket, paths] of grouped.entries()) {
    const uniquePaths = Array.from(new Set(paths))
    if (uniquePaths.length === 0) continue

    const { error } = await supabaseStorageAdmin.storage.from(bucket).remove(uniquePaths)
    if (error) {
      console.error(`Failed to remove storage objects from ${bucket}`, error)
    }
  }
}
