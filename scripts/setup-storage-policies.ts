/**
 * Script to automatically set up Row Level Security (RLS) policies for storage buckets
 * Run with: npx ts-node scripts/setup-storage-policies.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const POLICIES_SQL = `
-- ============================================
-- Drop existing policies first (if they exist)
-- ============================================

-- Avatars policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- Resources policies
DROP POLICY IF EXISTS "Users can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to resources" ON storage.objects;

-- Media policies
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;

-- ============================================
-- Avatars Bucket Policies
-- ============================================

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- Resources Bucket Policies
-- ============================================

-- Allow authenticated users to upload resources
CREATE POLICY "Users can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their resources
CREATE POLICY "Users can update their resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their resources
CREATE POLICY "Users can delete their resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view resources (required for iframe previews)
-- Note: Authorization is checked at the application layer via resource ownership
CREATE POLICY "Public read access to resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

-- ============================================
-- Media Bucket Policies
-- ============================================

-- Allow authenticated users to upload media
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their media
CREATE POLICY "Users can update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their media
CREATE POLICY "Users can delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view media (required for iframe/image previews)
-- Note: Authorization is checked at the application layer
CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
`

async function setupStoragePolicies() {
  console.log("🔐 Setting up Row Level Security (RLS) policies...\n")

  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in your .env file")
    return false
  }

  if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in your .env file")
    return false
  }

  console.log("✅ Environment variables found")
  console.log(`📍 Supabase URL: ${url}\n`)

  // Create Supabase client
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    console.log("📝 Executing RLS policies SQL...\n")

    // Execute the SQL to create policies
    const { error } = await supabase.rpc("exec_sql", {
      sql: POLICIES_SQL,
    })

    // If exec_sql doesn't exist, try direct query
    if (error && error.message.includes("function")) {
      console.log("⚠️  exec_sql function not available")
      console.log("📋 Please run the following SQL manually in your Supabase SQL Editor:\n")
      console.log("─────────────────────────────────────")
      console.log(POLICIES_SQL)
      console.log("─────────────────────────────────────\n")
      console.log("📖 How to run it:")
      console.log("1. Go to https://supabase.com/dashboard")
      console.log("2. Select your project")
      console.log("3. Go to SQL Editor")
      console.log("4. Create a new query")
      console.log("5. Copy and paste the SQL above")
      console.log("6. Click 'Run'\n")
      return false
    } else if (error) {
      console.error("❌ Failed to set up policies:", error.message)
      console.log("\n📋 You can run the SQL manually in Supabase SQL Editor:")
      console.log("─────────────────────────────────────")
      console.log(POLICIES_SQL)
      console.log("─────────────────────────────────────\n")
      return false
    }

    console.log("✅ RLS policies created successfully!\n")
    console.log("🎉 Storage security is configured!")
    console.log("\n📝 Policies created:")
    console.log("   ✅ Avatars: 4 policies (upload, update, delete, view)")
    console.log("   ✅ Resources: 4 policies (upload, update, delete, view)")
    console.log("   ✅ Media: 4 policies (upload, update, delete, view)\n")
    console.log("📝 Next steps:")
    console.log("   1. Verify setup:")
    console.log("      Run: npx ts-node scripts/check-storage-buckets.ts")
    console.log("   2. Restart your dev server:")
    console.log("      npm run dev")
    console.log("   3. Test file upload in the app")
    return true
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    console.log("\n📋 Run this SQL manually in Supabase SQL Editor:")
    console.log("─────────────────────────────────────")
    console.log(POLICIES_SQL)
    console.log("─────────────────────────────────────")
    return false
  }
}

// Run the setup
setupStoragePolicies()
  .then((success) => {
    if (!success) {
      console.log("\n💡 Alternative: Copy the SQL from the output above")
      console.log("   and run it in your Supabase SQL Editor")
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
