"use client"

import { useState } from "react"

import { fetchJson } from "@/lib/fetch-json"
import { supabase } from "@/lib/supabase-client"
import type { SignedUploadDescriptor, UploadContext, UploadFileMetadata, UploadPurpose } from "@/lib/storage/shared"

type StartUploadParams = {
  purpose: UploadPurpose
  files: File[]
  context?: UploadContext
}

type UploadUrlResponse = {
  uploads: SignedUploadDescriptor[]
}

export type UploadedFile = UploadFileMetadata & {
  bucket: string
  path: string
  url: string
}

export function useStorageUpload() {
  const [isUploading, setIsUploading] = useState(false)

  const startUpload = async ({ purpose, files, context }: StartUploadParams): Promise<UploadedFile[]> => {
    if (!supabase) {
      throw new Error("Supabase client is not configured")
    }
    const client = supabase

    if (files.length === 0) {
      return []
    }

    setIsUploading(true)

    try {
      const fileMetadata: UploadFileMetadata[] = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))

      const { uploads } = await fetchJson<UploadUrlResponse>("/api/storage/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose,
          files: fileMetadata,
          context,
        }),
      })

      const results = await Promise.all(
        uploads.map(async (descriptor, index) => {
          const file = files[index]
          if (!file) {
            throw new Error("Missing file for upload descriptor")
          }

          const { error } = await client.storage
            .from(descriptor.bucket)
            .uploadToSignedUrl(descriptor.path, descriptor.token, file, {
              cacheControl: "3600",
              contentType: file.type || undefined,
            })

          if (error) {
            throw error
          }

          return {
            bucket: descriptor.bucket,
            path: descriptor.path,
            url: descriptor.publicUrl,
            name: descriptor.name,
            size: descriptor.size,
            type: descriptor.type,
          }
        }),
      )

      return results
    } finally {
      setIsUploading(false)
    }
  }

  return {
    startUpload,
    isUploading,
  }
}
