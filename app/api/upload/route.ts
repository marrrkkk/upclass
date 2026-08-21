import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@/lib/auth"

// Server-side Supabase client with service role key for storage operations
function getStorageClient() {
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

// Allowed buckets and their constraints (server-side source of truth)
const BUCKET_CONFIG: Record<
  string,
  { maxFileSize: number; maxFileCount: number; allowedTypes: string[] }
> = {
  avatars: {
    maxFileSize: 4 * 1024 * 1024,
    maxFileCount: 1,
    allowedTypes: ["image/"],
  },
  resources: {
    maxFileSize: 16 * 1024 * 1024,
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
    maxFileSize: 16 * 1024 * 1024,
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

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // 2. Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    )
  }

  const bucket = formData.get("bucket") as string | null
  if (!bucket || !BUCKET_CONFIG[bucket]) {
    return NextResponse.json(
      { error: `Invalid or missing bucket. Allowed: ${Object.keys(BUCKET_CONFIG).join(", ")}` },
      { status: 400 },
    )
  }

  const config = BUCKET_CONFIG[bucket]
  const files = formData.getAll("file") as File[]

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 })
  }

  if (files.length > config.maxFileCount) {
    return NextResponse.json(
      { error: `Maximum ${config.maxFileCount} file(s) allowed` },
      { status: 400 },
    )
  }

  // 3. Validate each file
  for (const file of files) {
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json(
        { error: "Invalid file in request" },
        { status: 400 },
      )
    }

    if (file.size > config.maxFileSize) {
      const maxMB = Math.round(config.maxFileSize / 1024 / 1024)
      return NextResponse.json(
        { error: `File "${file.name}" exceeds the ${maxMB}MB limit` },
        { status: 400 },
      )
    }

    const typeAllowed = config.allowedTypes.some((allowed) =>
      file.type.startsWith(allowed),
    )
    if (!typeAllowed) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed for the "${bucket}" bucket` },
        { status: 400 },
      )
    }
  }

  // 4. Upload to Supabase Storage
  const supabase = getStorageClient()
  const uploaded: { url: string; path: string; name: string; size: string; type: string }[] =
    []

  for (const file of files) {
    const extension = file.name.split(".").pop() || "bin"
    const path = `${userId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error("[upload] Supabase storage error:", uploadError)
      
      // Provide helpful error messages
      let errorMessage = `Failed to upload "${file.name}": ${uploadError.message}`
      
      if (uploadError.message.includes("Bucket not found")) {
        errorMessage = `Storage bucket "${bucket}" not found. Please create it in your Supabase dashboard. See SUPABASE_STORAGE_SETUP.md for instructions.`
      } else if (uploadError.message.includes("not allowed") || uploadError.message.includes("policy")) {
        errorMessage = `Permission denied. Please set up Row Level Security (RLS) policies for the "${bucket}" bucket. See SUPABASE_STORAGE_SETUP.md for instructions.`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 },
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    uploaded.push({
      url: publicUrl,
      path,
      name: file.name,
      size: file.size.toString(),
      type: file.type,
    })
  }

  return NextResponse.json({ files: uploaded })
}
