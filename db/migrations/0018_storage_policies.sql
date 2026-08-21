-- Configure Supabase Storage access through the normal Drizzle migration path.
-- The policy guards keep this migration safe to re-run on existing projects.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can upload their own avatar') THEN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can update their own avatar') THEN
    CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can delete their own avatar') THEN
    CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Avatars are publicly accessible') THEN
    CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can upload resources') THEN
    CREATE POLICY "Users can upload resources" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can update their resources') THEN
    CREATE POLICY "Users can update their resources" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can delete their resources') THEN
    CREATE POLICY "Users can delete their resources" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Authenticated users can view resources') THEN
    CREATE POLICY "Authenticated users can view resources" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'resources');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can upload media') THEN
    CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can update their media') THEN
    CREATE POLICY "Users can update their media" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Users can delete their media') THEN
    CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Authenticated users can view media') THEN
    CREATE POLICY "Authenticated users can view media" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'media');
  END IF;
END $$;
