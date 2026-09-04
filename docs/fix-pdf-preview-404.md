# Fix: PDF Preview 404 Error in Production

## Problem

When opening a resource (PDF, document, etc.) in production, the preview shows:

```json
{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

## Root Cause

**The Supabase Storage RLS (Row Level Security) policy blocks public read access.**

PDF previews are loaded in an `<iframe>` that makes a direct GET request to the Supabase Storage public URL. This request doesn't include authentication headers, so it requires a **public read policy** on the Storage bucket.

The initial RLS setup only allowed `authenticated` users, which blocks the browser's direct file requests.

## Quick Fix

### Option 1: Run the Updated Policy Script (Recommended)

```bash
npm run storage:policies
```

This generates SQL that includes the public read policy. Copy the output and run it in the Supabase SQL Editor.

### Option 2: Manually Add the Policy

1. Go to your Supabase dashboard → **SQL Editor**
2. Create a new query
3. Run this SQL:

```sql
-- Allow public read access to resources bucket
CREATE POLICY IF NOT EXISTS "Public read access to resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

-- Also update media bucket if needed
CREATE POLICY IF NOT EXISTS "Public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
```

4. Click **Run**

### Option 3: Update via Supabase Dashboard

1. Go to **Storage** → **Policies**
2. Find the `resources` bucket
3. Edit the SELECT policy
4. Change from `TO authenticated` to `TO public`
5. Save

## Verify the Fix

### Step 1: Check Policies Are Active

In Supabase SQL Editor:

```sql
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
```

Look for:
- `"Public read access to resources"` with `roles: {public}` and `cmd: SELECT`

### Step 2: Test the Storage URL Directly

Get a resource's storage URL from your database:

```sql
SELECT 
  title,
  "fileUrl",
  "fileName"
FROM resources
WHERE "fileType" = 'pdf'
LIMIT 1;
```

Copy the `fileUrl` and open it in an incognito browser window (no authentication). It should download or display the PDF.

If you get a 404, the policy is not active.

### Step 3: Test in the App

1. Open the app
2. Navigate to a resource with a PDF
3. The preview should load without the 404 error

## Why This Happens

### Development vs Production

- **In development**, you might be using local seeded files (`/seeded-resources/*`) which bypass Storage entirely
- **In production**, all resources go through Supabase Storage with RLS policies

### Authentication Context

The iframe preview uses a direct URL like:

```
https://<project>.supabase.co/storage/v1/object/public/resources/<userId>/<file>.pdf
```

This is a **separate HTTP request** from the main app. It:
- Doesn't include cookies
- Doesn't include Authorization headers
- Is treated as an **anonymous/public** request by Supabase

### Security Implications

**Is public read access safe?**

Yes, because:

1. **URLs are not enumerable** - File paths include user IDs and random UUIDs
2. **Authorization is enforced at the app layer** - Users can only see resources they have permission to access through the UpClass UI
3. **Upload/update/delete remain protected** - Only the owner can modify files
4. **The buckets are already marked as "public"** in Supabase - this policy just enables the read access that was intended

Alternative approaches that don't work:
- ❌ Signed URLs expire and break cached/shared links
- ❌ Proxy routes add latency and bypass CDN caching
- ❌ Restricting to authenticated breaks iframe loading

## Additional Issues

If the policy fix doesn't resolve the 404, check these:

### 1. File Doesn't Exist in Storage

The database has a reference, but the file was never uploaded or was deleted.

**Diagnose:**
```bash
npm run db:diagnose-storage
```

**Fix:**
- Re-upload the file, or
- Delete the broken database record

### 2. Incorrect Storage Path

The `fileUrl` in the database doesn't match the actual Storage path.

**Fix:**
```bash
npm run db:repair-resource-urls
```

### 3. Bucket Doesn't Exist

The `resources` bucket wasn't created in production.

**Fix:**
```bash
npm run storage:setup
npm run storage:check
```

## Prevention: Deployment Checklist

Before deploying to production:

- [ ] Run `npm run storage:setup` in production
- [ ] Run `npm run storage:policies` and apply the SQL
- [ ] Verify with `npm run storage:check`
- [ ] Test upload and preview in a staging/preview deployment
- [ ] Check Supabase dashboard → **Storage** → **resources** shows "Public" badge

## Related Documentation

- [Full Storage Troubleshooting Guide](./troubleshooting-storage.md)
- [Supabase Storage Setup](../SUPABASE_STORAGE_SETUP.md)
- [Deployment Guide](../DEPLOYMENT.md)
