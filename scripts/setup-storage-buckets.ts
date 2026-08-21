/**
 * Script to automatically create Supabase storage buckets
 * Run with: npx ts-node scripts/setup-storage-buckets.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

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
    fileSizeLimit: 16 * 1024 * 1024, // 16 MB (reduced for free tier compatibility)
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

async function setupStorageBuckets() {
  console.log("🚀 Setting up Supabase storage buckets...\n")

  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in your .env file")
    console.log("\n💡 Add this to your .env file:")
    console.log("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co")
    return false
  }

  if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in your .env file")
    console.log("\n💡 Find your service role key:")
    console.log("1. Go to https://supabase.com/dashboard")
    console.log("2. Select your project")
    console.log("3. Go to Project Settings → API")
    console.log("4. Copy the 'service_role' key (not the 'anon' key)")
    console.log("5. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here")
    return false
  }

  console.log("✅ Environment variables found")
  console.log(`📍 Supabase URL: ${url}\n`)

  // Create Supabase client with service role
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } =
      await supabase.storage.listBuckets()

    if (listError) {
      console.error("❌ Failed to list buckets:", listError.message)
      return false
    }

    console.log(`📦 Found ${existingBuckets?.length || 0} existing bucket(s)\n`)

    // Create each bucket
    let createdCount = 0
    let skippedCount = 0

    for (const config of BUCKETS_CONFIG) {
      const exists = existingBuckets?.some((b) => b.name === config.name)

      if (exists) {
        console.log(`⏭️  Bucket "${config.name}" already exists - skipping`)
        skippedCount++
      } else {
        console.log(`📝 Creating bucket "${config.name}"...`)

        const { error: createError } = await supabase.storage.createBucket(
          config.name,
          {
            public: config.public,
            fileSizeLimit: config.fileSizeLimit,
            allowedMimeTypes: config.allowedMimeTypes,
          }
        )

        if (createError) {
          console.error(`   ❌ Failed: ${createError.message}`)
        } else {
          console.log(`   ✅ Created successfully`)
          console.log(`      - Public: ${config.public ? "Yes" : "No"}`)
          console.log(
            `      - Max size: ${Math.round(config.fileSizeLimit / 1024 / 1024)}MB`
          )
          createdCount++
        }
      }
      console.log()
    }

    // Summary
    console.log("─────────────────────────────────────")
    console.log(`✨ Created: ${createdCount} bucket(s)`)
    console.log(`⏭️  Skipped: ${skippedCount} bucket(s) (already exist)`)
    console.log("─────────────────────────────────────\n")

    if (createdCount > 0 || skippedCount === BUCKETS_CONFIG.length) {
      console.log("🎉 Storage buckets are ready!")
      console.log("\n📝 Next steps:")
      console.log("   1. Set up Row Level Security (RLS) policies")
      console.log("      Run: npx ts-node scripts/setup-storage-policies.ts")
      console.log("   2. Verify setup:")
      console.log("      Run: npx ts-node scripts/check-storage-buckets.ts")
      console.log("   3. Restart your dev server:")
      console.log("      npm run dev")
      return true
    } else {
      console.log("⚠️  No buckets were created. Check the errors above.")
      return false
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    return false
  }
}

// Run the setup
setupStorageBuckets()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
