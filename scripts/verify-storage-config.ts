import "dotenv/config"

import { createClient } from "@supabase/supabase-js"

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

const REQUIRED_BUCKETS = ["avatars", "resources", "media"]

async function verifyStorageConfig() {
  console.log("🔍 Verifying Supabase Storage configuration...\n")

  const supabase = getStorageClient()

  // Check buckets
  console.log("📦 Checking buckets...")
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error("❌ Failed to list buckets:", bucketsError.message)
    return false
  }

  const existingBuckets = new Set(buckets?.map((b) => b.name) || [])
  let allBucketsExist = true

  for (const bucket of REQUIRED_BUCKETS) {
    if (existingBuckets.has(bucket)) {
      const bucketData = buckets?.find((b) => b.name === bucket)
      const isPublic = bucketData?.public ? "✓" : "⚠"
      console.log(`  ${isPublic} ${bucket} - ${bucketData?.public ? "public" : "private"}`)
    } else {
      console.log(`  ❌ ${bucket} - MISSING`)
      allBucketsExist = false
    }
  }

  if (!allBucketsExist) {
    console.log("\n⚠️  Some buckets are missing. Run: npm run storage:setup\n")
    return false
  }

  // Test public access to resources bucket
  console.log("\n🔐 Testing public read access...")

  // List files in resources bucket (requires at least one file)
  const { data: files, error: filesError } = await supabase.storage
    .from("resources")
    .list("", { limit: 1 })

  if (filesError) {
    console.error("❌ Cannot list files in resources bucket:", filesError.message)
    return false
  }

  if (!files || files.length === 0) {
    console.log("  ℹ️  No files in resources bucket yet (upload one to test)")
  } else {
    // Try to get a public URL for the first file
    const firstFile = files[0]
    const { data } = supabase.storage.from("resources").getPublicUrl(firstFile.name)

    console.log(`  ✓ Public URL generation works`)
    console.log(`  Sample URL: ${data.publicUrl}`)

    // Test if the URL is actually accessible
    try {
      const response = await fetch(data.publicUrl, { method: "HEAD" })
      if (response.ok) {
        console.log(`  ✓ Public URL is accessible (HTTP ${response.status})`)
      } else if (response.status === 404) {
        console.log(`  ⚠️  Public URL returns 404 - file might not exist`)
      } else {
        console.log(`  ⚠️  Public URL returns HTTP ${response.status}`)
        console.log(`  This might indicate RLS policy issues`)
      }
    } catch (fetchError) {
      console.log(`  ⚠️  Cannot fetch public URL:`, fetchError)
    }
  }

  // Check RLS policies (requires specific SQL query)
  console.log("\n🔐 Checking RLS policies...")
  
  const { data: policies, error: policiesError } = await supabase
    .from("pg_policies")
    .select("policyname, tablename, cmd, roles")
    .eq("schemaname", "storage")
    .eq("tablename", "objects")

  if (policiesError) {
    console.log("  ⚠️  Cannot query policies (might require postgres role)")
    console.log("  Manually verify in Supabase dashboard → Storage → Policies")
  } else if (!policies || policies.length === 0) {
    console.log("  ❌ No RLS policies found!")
    console.log("  Run: npm run storage:policies")
    return false
  } else {
    const publicReadPolicies = policies.filter(
      (p: { cmd: string; roles: string[] }) =>
        p.cmd === "SELECT" && p.roles?.includes("public")
    )

    if (publicReadPolicies.length === 0) {
      console.log("  ❌ No public read policies found!")
      console.log("  This will cause 404 errors in production")
      console.log("  Run: npm run storage:policies")
      return false
    }

    console.log(`  ✓ Found ${publicReadPolicies.length} public read policy/policies`)
    publicReadPolicies.forEach((p: { policyname: string }) => {
      console.log(`    - ${p.policyname}`)
    })
  }

  console.log("\n✅ Storage configuration looks good!\n")
  return true
}

verifyStorageConfig()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error)
    process.exit(1)
  })
