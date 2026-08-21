"use client"

import { useState, useCallback } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadedFile = {
  url: string
  /** Storage object path (bucket-relative), used for later removals. */
  path: string
  name: string
  size: string
  type: string
}

export type UploadResult = UploadedFile[]

// Bucket names matching Supabase Storage buckets
export const BUCKETS = {
  avatars: "avatars",
  resources: "resources",
  media: "media",
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

// ---------------------------------------------------------------------------
// Allowed MIME types per bucket (mirrors the old UploadThing route config)
// ---------------------------------------------------------------------------

const BUCKET_CONFIG: Record<
  BucketName,
  { maxFileSize: number; maxFileCount: number; allowedTypes: string[] }
> = {
  avatars: {
    maxFileSize: 4 * 1024 * 1024, // 4 MB
    maxFileCount: 1,
    allowedTypes: ["image/"],
  },
  resources: {
    maxFileSize: 16 * 1024 * 1024, // 16 MB
    maxFileCount: 5,
    allowedTypes: [
      "application/pdf",
      "text/",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
  },
  media: {
    maxFileSize: 16 * 1024 * 1024, // 16 MB (Supabase free tier limit)
    maxFileCount: 10,
    allowedTypes: [
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "text/",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
}

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

function validateFiles(bucket: BucketName, files: File[]): string | null {
  const config = BUCKET_CONFIG[bucket]
  if (!config) return `Unknown bucket: ${bucket}`

  if (files.length > config.maxFileCount) {
    return `Maximum ${config.maxFileCount} file(s) allowed`
  }

  for (const file of files) {
    if (file.size > config.maxFileSize) {
      const maxMB = Math.round(config.maxFileSize / 1024 / 1024)
      return `File "${file.name}" exceeds the ${maxMB}MB limit`
    }

    const typeAllowed = config.allowedTypes.some((allowed) =>
      file.type.startsWith(allowed),
    )
    if (!typeAllowed) {
      return `File type "${file.type}" is not allowed for this upload`
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Upload function – calls the /api/upload route
// ---------------------------------------------------------------------------

async function uploadFiles(
  bucket: BucketName,
  files: File[],
): Promise<UploadResult> {
  const validationError = validateFiles(bucket, files)
  if (validationError) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  formData.append("bucket", bucket)
  for (const file of files) {
    formData.append("file", file)
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Upload failed" }))
    throw new Error(body.error || `Upload failed (${res.status})`)
  }

  const data = await res.json()
  return data.files as UploadResult
}

// ---------------------------------------------------------------------------
// React hook – drop-in replacement for useUploadThing()
// ---------------------------------------------------------------------------

export function useSupabaseUpload(bucket: BucketName) {
  const [isUploading, setIsUploading] = useState(false)

  const startUpload = useCallback(
    async (files: File[]): Promise<UploadResult | undefined> => {
      setIsUploading(true)
      try {
        const result = await uploadFiles(bucket, files)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed"
        console.error(`[supabase-storage] Failed to upload to "${bucket}" bucket:`, errorMessage)
        
        // Re-throw with enhanced error message
        if (errorMessage.includes("Bucket not found")) {
          throw new Error(
            `Storage bucket "${bucket}" not found. Please create it in your Supabase dashboard.\n\n` +
            `See SUPABASE_STORAGE_SETUP.md in the project root for setup instructions.`
          )
        } else if (errorMessage.includes("Permission denied") || errorMessage.includes("policy")) {
          throw new Error(
            `Permission denied for "${bucket}" bucket. Please set up Row Level Security policies.\n\n` +
            `See SUPABASE_STORAGE_SETUP.md in the project root for setup instructions.`
          )
        }
        
        throw error
      } finally {
        setIsUploading(false)
      }
    },
    [bucket],
  )

  return { startUpload, isUploading }
}
