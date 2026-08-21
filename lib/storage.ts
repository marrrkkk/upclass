import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase storage helpers. Callers run with the service role
 * key, so every removal must be guarded by an ownership check upstream —
 * paths are never trusted from client input.
 */

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  resources: "resources",
  media: "media",
} as const

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

function getStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Best-effort removal of a single storage object. Throws when the removal
 * itself fails so callers can decide whether the failure is fatal; cleanup
 * paths should usually wrap this in a catch and log.
 */
export async function removeStorageObject(
  bucket: StorageBucketName,
  path: string,
): Promise<void> {
  if (!path) return
  const supabase = getStorageAdminClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(`Storage cleanup failed for "${bucket}/${path}": ${error.message}`)
  }
}