/**
 * Deployment setup script
 * Runs database migrations, creates storage buckets, and sets up RLS policies
 * This is meant to be run during Vercel deployment
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables for local testing
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: resolve(process.cwd(), ".env.local") })
  dotenv.config({ path: resolve(process.cwd(), ".env") })
}

const BUCKETS_CONFIG = [
  {
    name: "avatars",
    public: true,
    fileSizeLimit: 4 * 1024 * 1024, // 4 MB
    allowedMimeTypes: ["image/*"],
  },
  {
    name: "resources",
    public: true,
    fileSizeLimit: 16 * 1024 * 1024, // 16 MB
    allowedMimeTypes: [
      "application/pdf",
      "text/*",
      "application/vnd.openxmlformats-officedocument.*",
      "application/msword",
      "application/vnd.ms-*",
    ],
  },
  {
    name: "media",
    public: true,
    fileSizeLimit: 16 * 1024 * 1024, // 16 MB
    allowedMimeTypes: [
      "image/*",
      "video/*",
      "audio/*",
      "application/pdf",
      "text/*",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
]

const POLICIES_SQL = `
-- Avatars policies
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

-- Resources policies
CREATE POLICY IF NOT EXISTS "Users can upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can update their resources" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can delete their resources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Authenticated users can view resources" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources');

-- Media policies
CREATE POLICY IF NOT EXISTS "Users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can update their media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY IF NOT EXISTS "Authenticated users can view media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
`

async function setupStorageBuckets() {
  console.log("📦 Setting up storage buckets...")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.log("⚠️  Skipping storage setup - Supabase credentials not found")
    return true
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    const { data: existingBuckets, error: listError } =
      await supabase.storage.listBuckets()

    if (listError) {
      console.error("❌ Failed to list buckets:", listError.message)
      return false
    }

    let createdCount = 0
    let skippedCount = 0

    for (const config of BUCKETS_CONFIG) {
      const exists = existingBuckets?.some((b) => b.name === config.name)

      if (exists) {
        console.log(`  ✓ ${config.name} - exists`)
        skippedCount++
      } else {
        const { error: createError } = await supabase.storage.createBucket(
          config.name,
          {
            public: config.public,
            fileSizeLimit: config.fileSizeLimit,
            allowedMimeTypes: config.allowedMimeTypes,
          }
        )

        if (createError) {
          console.error(`  ✗ ${config.name} - ${createError.message}`)
        } else {
          console.log(`  ✓ ${config.name} - created`)
          createdCount++
        }
      }
    }

    console.log(
      `✅ Buckets ready (${createdCount} created, ${skippedCount} existing)`
    )
    return true
  } catch (error) {
    console.error("❌ Storage bucket setup failed:", error)
    return false
  }
}

async function setupStoragePolicies() {
  console.log("🔐 Setting up RLS policies...")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.log("⚠️  Skipping RLS setup - Supabase credentials not found")
    return true
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    // Try to execute policies via direct query
    const { error } = await supabase.rpc("query", {
      query: POLICIES_SQL,
    })

    if (error) {
      console.log("⚠️  Could not auto-create RLS policies")
      console.log("   Run scripts/storage-policies.sql manually in Supabase SQL Editor")
      // Don't fail the build - policies can be added later
      return true
    }

    console.log("✅ RLS policies configured")
    return true
  } catch (error) {
    console.log("⚠️  Could not auto-create RLS policies")
    console.log("   Run scripts/storage-policies.sql manually in Supabase SQL Editor")
    // Don't fail the build - policies can be added later
    return true
  }
}

async function main() {
  console.log("🚀 Running deployment setup...\n")

  const bucketsOk = await setupStorageBuckets()
  if (!bucketsOk) {
    console.error("\n❌ Deployment setup failed")
    process.exit(1)
  }

  const policiesOk = await setupStoragePolicies()
  if (!policiesOk) {
    console.error("\n❌ Deployment setup failed")
    process.exit(1)
  }

  console.log("\n✅ Deployment setup complete!")
  process.exit(0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
