# Production Fix: PDF Preview 404 Errors

## Immediate Action Required

Your production deployment is showing 404 errors when users try to preview uploaded PDFs. This is caused by missing Supabase Storage RLS (Row Level Security) policies.

## Quick Fix (5 minutes)

### Step 1: Apply the Public Read Policy

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your production project
3. Navigate to **SQL Editor**
4. Create a new query
5. Paste and run this SQL:

```sql
-- Fix PDF preview 404 errors by allowing public read access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;

-- Create new public read policies
CREATE POLICY "Public read access to resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
```

6. Click **Run**

### Step 2: Verify the Fix

Test in production:
1. Open any resource with a PDF
2. The preview should now load correctly

## Why This Happened

The Storage buckets were created with RLS policies that only allowed `authenticated` users to read files. However, PDF previews are loaded in an `<iframe>` which makes a direct HTTP request to the Storage URL **without authentication headers**, so it needs a public read policy.

**This is safe because:**
- File paths include user IDs and random UUIDs (not enumerable)
- Application-layer authorization still controls who can see resources
- Only read access is public; upload/update/delete remain protected

## Full Production Setup (for new deployments)

If you're deploying to a new environment, run these scripts **in your local terminal** with production environment variables:

```bash
# 1. Create Storage buckets
npm run storage:setup

# 2. Generate and apply RLS policies
npm run storage:policies

# 3. Verify everything is configured correctly
npm run storage:verify

# 4. Check all existing resources
npm run db:diagnose-storage

# 5. Repair any broken URL references
npm run db:repair-resource-urls
```

## Diagnostic Commands

If issues persist, use these scripts to diagnose:

| Command | Purpose |
|---------|---------|
| `npm run storage:check` | Verify buckets exist |
| `npm run storage:verify` | Comprehensive configuration check |
| `npm run db:diagnose-storage` | Check all resource files exist in Storage |
| `npm run db:repair-resource-urls` | Fix incorrect database URLs |

## Environment Variables Checklist

Verify these are set in Vercel → **Settings** → **Environment Variables**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

To get these values:
1. Supabase dashboard → **Settings** → **API**
2. Copy **URL** and **service_role** key (not anon key!)
3. Paste into Vercel environment variables
4. Redeploy if you changed them

## Prevention: Pre-Deploy Checklist

Before every production deployment:

- [ ] Storage buckets created (`npm run storage:setup`)
- [ ] RLS policies applied with public read access
- [ ] Test upload and preview in staging/preview deployment
- [ ] Environment variables verified in deployment platform

## Documentation References

- **Quick fix**: `docs/fix-pdf-preview-404.md`
- **Full troubleshooting**: `docs/troubleshooting-storage.md`
- **Storage setup**: `SUPABASE_STORAGE_SETUP.md`
- **Deployment**: `DEPLOYMENT.md`

## Support

If the fix doesn't resolve the issue:

1. Run `npm run storage:verify` and save the output
2. Run `npm run db:diagnose-storage` and save the output
3. Check Supabase dashboard → **Logs** → **Storage**
4. Check Vercel → **Functions** → Filter for `/api/upload`
5. Contact support with the diagnostic outputs

---

**Status after fix:**
- [ ] SQL policy applied
- [ ] PDF previews working in production
- [ ] No more 404 errors in resources

**Deployment platform:** Vercel  
**Storage provider:** Supabase  
**Affected routes:** `/[orgSlug]/resources/[id]`
