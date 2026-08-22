# Supabase Storage Setup Guide

This guide will help you set up the required storage buckets for UpClass.

## Quick Setup (Automated)

The easiest way to set up storage is using the provided scripts:

```bash
# 1. Create all storage buckets
npm run storage:setup

# 2. Set up Row Level Security policies  
npm run storage:policies

# 3. Verify everything is configured
npm run storage:check
```

That's it! If the scripts work, you're done. Skip to [Verify Environment Variables](#4-verify-environment-variables).

If the automated setup doesn't work, continue with the manual setup below.

---

## Manual Setup

### Required Storage Buckets

The app requires three storage buckets:

1. **`avatars`** - User profile images
2. **`resources`** - Class resources (PDFs, documents, presentations)
3. **`media`** - General media files (images, videos, audio, documents)

## Setup Instructions

### 1. Access Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your UpClass project

### 2. Create Storage Buckets

1. In the left sidebar, click **Storage**
2. Click **New bucket** button

#### Create `avatars` Bucket:
- **Name**: `avatars`
- **Public bucket**: ✅ Checked (avatars should be publicly accessible)
- **File size limit**: 4 MB
- **Allowed MIME types**: Leave default or add `image/*`
- Click **Create bucket**

#### Create `resources` Bucket:
- **Name**: `resources`
- **Public bucket**: ✅ Checked (so students can view resources)
- **File size limit**: 16 MB
- **Allowed MIME types**: 
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.*`
  - `application/msword`
  - `application/vnd.ms-*`
  - `text/*`
- Click **Create bucket**

#### Create `media` Bucket:
- **Name**: `media`
- **Public bucket**: ✅ Checked
- **File size limit**: 16 MB
- **Allowed MIME types**:
  - `image/*`
  - `video/*`
  - `audio/*`
  - `application/pdf`
  - `text/*`
- Click **Create bucket**

### 3. Set Up Storage Policies (RLS)

For each bucket, you need to set up Row Level Security (RLS) policies:

#### Avatars Bucket Policies:

```sql
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
```

#### Resources Bucket Policies:

```sql
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

-- Allow authenticated users to view all resources
CREATE POLICY "Authenticated users can view resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');
```

#### Media Bucket Policies:

```sql
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

-- Allow authenticated users to view all media
CREATE POLICY "Authenticated users can view media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');
```

### 4. Verify Environment Variables

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
NEXT_PUBLIC_SUPABASE_WHITEBOARD_BUCKET=whiteboards
```

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for server-side uploads. You can find it in:
- Supabase Dashboard → Project Settings → API → Service Role Key

### 5. Test the Upload

1. Restart your development server: `npm run dev`
2. Try uploading a file (avatar, resource, or media)
3. Check the browser console for any errors
4. Verify the file appears in Supabase Storage dashboard

## Troubleshooting

### "Bucket not found" Error
- ✅ Verify all three buckets are created in Supabase dashboard
- ✅ Check bucket names are exactly: `avatars`, `resources`, `media` (lowercase, no spaces)

### "Unauthorized" or "403" Errors
- ✅ Verify RLS policies are set up correctly
- ✅ Make sure user is authenticated
- ✅ Check that `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables

### Upload Fails Without Error
- ✅ Check browser console for CORS errors
- ✅ Verify Supabase URL is correct
- ✅ Check file size doesn't exceed bucket limits

### "Invalid MIME type" Error
- ✅ Verify the file type matches allowed types in bucket configuration
- ✅ Check BUCKET_CONFIG in `app/api/upload/route.ts`

## Quick Setup Script

If you prefer to set up everything via SQL, run this in the Supabase SQL Editor:

```sql
-- This script assumes buckets are already created via the dashboard
-- It only sets up the RLS policies

-- Avatars policies
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

-- Resources policies
CREATE POLICY "Users can upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their resources" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their resources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated users can view resources" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources');

-- Media policies
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated users can view media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
```

## Need Help?

If you continue to have issues:
1. Check the Supabase logs in your dashboard
2. Verify your authentication is working correctly
3. Test with a small file first (< 1MB)
4. Check the Network tab in browser DevTools for detailed error messages
