/**
 * Script to check if Supabase storage buckets are properly configured
 * Run with: npx ts-node scripts/check-storage-buckets.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const REQUIRED_BUCKETS = ["avatars", "resources", "media"]

async function checkStorageBuckets() {
  console.log("🔍 Checking Supabase storage buckets...\n")

  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set")
    return false
  }

  if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set")
    return false
  }

  console.log("✅ Environment variables are set")
  console.log(`📍 Supabase URL: ${url}\n`)

  // Create Supabase client
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("❌ Failed to list buckets:", error.message)
      return false
    }

    console.log(`📦 Found ${buckets?.length || 0} bucket(s) in Supabase:\n`)

    // Check each required bucket
    let allBucketsExist = true
    for (const bucketName of REQUIRED_BUCKETS) {
      const exists = buckets?.some((b) => b.name === bucketName)

      if (exists) {
        const bucket = buckets?.find((b) => b.name === bucketName)
        console.log(`✅ ${bucketName}`)
        console.log(`   - Public: ${bucket?.public ? "Yes" : "No"}`)
        console.log(`   - Created: ${bucket?.created_at}`)
      } else {
        console.log(`❌ ${bucketName} - MISSING`)
        allBucketsExist = false
      }
      console.log()
    }

    // Summary
    if (allBucketsExist) {
      console.log("🎉 All required storage buckets are configured!")
      console.log("\n📝 Next steps:")
      console.log("   1. Verify RLS policies are set up (see SUPABASE_STORAGE_SETUP.md)")
      console.log("   2. Test uploading a file in the app")
      return true
    } else {
      console.log("⚠️  Some buckets are missing. Please create them:")
      console.log("\n📖 See SUPABASE_STORAGE_SETUP.md for detailed instructions")
      console.log("\n🔧 Quick setup:")
      console.log("   1. Go to your Supabase dashboard")
      console.log("   2. Navigate to Storage")
      console.log("   3. Create these public buckets:")
      REQUIRED_BUCKETS.forEach((name) => {
        if (!buckets?.some((b) => b.name === name)) {
          console.log(`      - ${name}`)
        }
      })
      return false
    }
  } catch (error) {
    console.error("❌ Error checking buckets:", error)
    return false
  }
}

// Run the check
checkStorageBuckets()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
