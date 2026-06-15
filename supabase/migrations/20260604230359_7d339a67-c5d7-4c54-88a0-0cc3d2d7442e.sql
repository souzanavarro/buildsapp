-- Add storage_path and logs to app_builds
ALTER TABLE public.app_builds ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.app_builds ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;

-- Storage policies for app-builds bucket
-- Allow public to read objects in app-builds
CREATE POLICY "Public Access to App Builds" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'app-builds');

-- Allow service_role (GitHub Action) to manage objects
-- (Usually service_role bypasses RLS, but explicit grant is safer for some setups)
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;
