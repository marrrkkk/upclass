# Troubleshooting Supabase Storage 404 Errors

This guide addresses the `{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}` error that appears when trying to preview or download uploaded resources (PDFs, documents, etc.) in production.

## Symptoms

- Resource uploads appear successful in the UI
- Resources are listed in the resources page
- Opening a resource shows the error in the preview iframe
- The error is a JSON response from Supabase Storage

## Root Causes

### 1. Storage Bucket Not Created in Production

The `resources` bucket must exist in your Supabase project.

**Fix:**

```bash
npm run storage:setup
npm run storage:policies
npm run storage:check
```

Or manually in the Supabase dashboard:
1. Go to **Storage** → **New bucket**
2. Create a **public** bucket named `resources`
3. Set max file size to at least 16 MB
4. Enable RLS policies (see step 3 below)

### 2. RLS Policies Not Applied

Supabase Storage requires Row Level Security (RLS) policies even for public buckets.

**Check current policies:**

```bash
npm run storage:check
```

**Apply policies:**

```bash
npm run storage:policies
```

**Manual setup:** In the Supabase dashboard SQL Editor:

```sql
-- Allow authenticated uploads to own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated updates to own objects
CREATE POLICY "Users can update their own objects"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'resources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated deletes of own objects
CREATE POLICY "Users can delete their own objects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public reads (required for preview/download)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');
```

### 3. File Was Never Uploaded

The upload might have failed silently due to:
- Network timeout
- Supabase service outage
- Invalid service role key
- Insufficient permissions

**Diagnose:**

```bash
npm run db:diagnose-storage
```

This checks all resources in the database and verifies whether their files exist in Storage.

**Fix for specific resource:**
- Delete the broken resource entry
- Re-upload the file

### 4. File Was Deleted But Database Wasn't Updated

If someone manually deleted files from the Supabase Storage dashboard, the database still references them.

**Find orphaned records:**

```bash
npm run db:diagnose-storage
```

**Clean up:**

Delete the resource from the app (this will try to remove the Storage file too):

```ts
import { deleteResource } from "@/app/actions/resources"

await deleteResource(resourceId)
```

### 5. URL Format Mismatch

Older resources might have incorrectly formatted URLs pointing to app routes instead of Storage.

**Repair:**

```bash
npm run db:repair-resource-urls
```

This rewrites `fileUrl` values that point to `/api/resources/[id]/file` to use the direct Storage public URL from `storagePath`.

### 6. Environment Variable Mismatch

The upload succeeds in development but fails in production because:
- `NEXT_PUBLIC_SUPABASE_URL` differs between environments
- `SUPABASE_SERVICE_ROLE_KEY` is incorrect or missing in production

**Verify in Vercel:**

```bash
vercel env pull
```

Check that:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Rotate keys if needed:**
1. Supabase dashboard → **Settings** → **API**
2. Copy **URL** and **service_role** key
3. Update in Vercel → **Settings** → **Environment Variables**
4. Redeploy

## Diagnostic Workflow

### Step 1: Check Storage Setup

```bash
npm run storage:check
```

Expected output:
```
✓ Bucket 'avatars' exists
✓ Bucket 'resources' exists
✓ Bucket 'media' exists
```

If any bucket is missing, run:
```bash
npm run storage:setup
```

### Step 2: Check RLS Policies

```bash
npm run storage:policies
```

Review the generated SQL and apply it in the Supabase SQL Editor.

### Step 3: Verify Files Exist

```bash
npm run db:diagnose-storage
```

This will output:
- ✓ Files that exist in Storage
- ✗ Files missing from Storage (broken references)
- ⚠ App-route URLs that need repair

### Step 4: Repair Known Issues

```bash
npm run db:repair-resource-urls
```

### Step 5: Manual Cleanup (if needed)

For resources with permanently lost files:

```sql
-- Find resources with broken Storage references
SELECT id, title, "fileUrl", "storagePath", "fileName"
FROM resources
WHERE "fileUrl" LIKE '%/storage/v1/object/public/resources/%';

-- Delete a specific broken resource
DELETE FROM resources WHERE id = '<resource-id>';
```

## Prevention

### Production Deployment Checklist

Before deploying:

1. ✓ Storage buckets created (`npm run storage:setup`)
2. ✓ RLS policies applied (`npm run storage:policies`)
3. ✓ Environment variables set in Vercel
4. ✓ Test upload works in staging/preview

### Upload Error Handling

The upload route already handles common errors. If uploads consistently fail:

1. Check Supabase dashboard **Logs** → **Storage**
2. Check Vercel **Functions** logs for `/api/upload`
3. Verify `SUPABASE_SERVICE_ROLE_KEY` has Storage permissions

### Monitoring

Watch for these patterns in production logs:

```
[upload] Supabase storage error: Bucket not found
[upload] Supabase storage error: new row violates row-level security policy
[createResource] storage cleanup failed
```

## Common Production Scenarios

### Scenario A: "Works in dev, 404 in production"

**Cause:** Storage bucket or policies not set up in production Supabase project.

**Fix:**
```bash
# In production environment
npm run storage:setup
npm run storage:policies
```

### Scenario B: "Upload succeeds, but preview shows 404"

**Cause:** Public read policy missing.

**Fix:** Apply the "Public read access" policy (see RLS section above).

### Scenario C: "Old resources work, new ones fail"

**Cause:** Service role key changed or expired.

**Fix:** Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy.

### Scenario D: "All PDFs show 404, but text files work"

**Cause:** File size limit exceeded or MIME type not allowed.

**Fix:** Increase bucket size limit in Supabase dashboard:
- Go to **Storage** → **resources** → **Settings**
- Set **File size limit** to at least 16 MB

## Related Files

- `app/api/upload/route.ts` - Upload handler
- `app/api/resources/[id]/file/route.ts` - Fallback file serving
- `lib/resource-file.ts` - URL classification and repair logic
- `scripts/diagnose-storage.ts` - Diagnostic tool
- `scripts/repair-resource-urls.ts` - URL repair script
- `scripts/setup-storage-buckets.ts` - Bucket creation
- `scripts/setup-storage-policies.ts` - RLS policy generation

## Support

If the issue persists after following this guide:

1. Run `npm run db:diagnose-storage` and save the output
2. Check Supabase dashboard logs
3. Check Vercel function logs for `/api/upload`
4. Contact support with the diagnostic output
