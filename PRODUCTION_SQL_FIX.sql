-- Fix PDF preview 404 errors by enabling public read access
-- Step 1: Drop existing policies if they exist (ignore errors if they don't exist)

DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to resources" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;

-- Step 2: Create new public read policies

CREATE POLICY "Public read access to resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
