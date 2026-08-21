-- ============================================
-- Supabase Storage RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- Avatars Bucket Policies
-- ============================================

-- Allow authenticated users to upload their own avatars
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY IF NOT EXISTS "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY IF NOT EXISTS "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view avatars (public bucket)
CREATE POLICY IF NOT EXISTS "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- Resources Bucket Policies
-- ============================================

-- Allow authenticated users to upload resources
CREATE POLICY IF NOT EXISTS "Users can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their resources
CREATE POLICY IF NOT EXISTS "Users can update their resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their resources
CREATE POLICY IF NOT EXISTS "Users can delete their resources"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view all resources
CREATE POLICY IF NOT EXISTS "Authenticated users can view resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- ============================================
-- Media Bucket Policies
-- ============================================

-- Allow authenticated users to upload media
CREATE POLICY IF NOT EXISTS "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their media
CREATE POLICY IF NOT EXISTS "Users can update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their media
CREATE POLICY IF NOT EXISTS "Users can delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view all media
CREATE POLICY IF NOT EXISTS "Authenticated users can view media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');
