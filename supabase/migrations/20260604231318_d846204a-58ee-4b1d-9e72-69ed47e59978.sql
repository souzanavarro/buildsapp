-- Create a policy for the new bucket
-- Note: supabase--storage_create_bucket creates the bucket, we just need policies.
-- We'll assume the bucket exists after the tool call.

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'internal-apks');
CREATE POLICY "Service Role Access" ON storage.objects FOR ALL USING (bucket_id = 'internal-apks') WITH CHECK (bucket_id = 'internal-apks');

-- Ensure app_builds has a column for the internal link if not already clear
-- It already has apk_url and storage_path.
