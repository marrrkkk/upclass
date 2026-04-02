import "dotenv/config"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const buckets = [
  {
    name: process.env.NEXT_PUBLIC_SUPABASE_PROFILE_MEDIA_BUCKET || "profile-media",
    fileSizeLimit: "4MB",
  },
  {
    name: process.env.NEXT_PUBLIC_SUPABASE_RESOURCE_FILES_BUCKET || "resource-files",
    fileSizeLimit: "16MB",
  },
  {
    name: process.env.NEXT_PUBLIC_SUPABASE_MESSAGE_MEDIA_BUCKET || "message-media",
    fileSizeLimit: "50MB",
  },
  {
    name: process.env.NEXT_PUBLIC_SUPABASE_SUBMISSION_ATTACHMENTS_BUCKET || "submission-attachments",
    fileSizeLimit: "16MB",
  },
  {
    name: process.env.NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET || "whiteboard-assets",
    fileSizeLimit: "16MB",
  },
]

async function ensureBucket(bucket) {
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    throw listError
  }

  const existing = existingBuckets.find((entry) => entry.name === bucket.name)
  if (existing) {
    const { error } = await supabase.storage.updateBucket(bucket.name, {
      public: true,
      fileSizeLimit: bucket.fileSizeLimit,
    })
    if (error) {
      throw error
    }
    console.log(`Updated bucket: ${bucket.name}`)
    return
  }

  const { error } = await supabase.storage.createBucket(bucket.name, {
    public: true,
    fileSizeLimit: bucket.fileSizeLimit,
  })
  if (error) {
    throw error
  }

  console.log(`Created bucket: ${bucket.name}`)
}

for (const bucket of buckets) {
  await ensureBucket(bucket)
}

console.log("Supabase storage buckets are ready.")
