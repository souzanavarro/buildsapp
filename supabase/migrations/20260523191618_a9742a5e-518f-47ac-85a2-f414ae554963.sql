-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public view (optional, but useful if we want to share links)
CREATE POLICY "Public View"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');

-- Policy for drivers to upload
CREATE POLICY "Driver Upload Proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-proofs' 
  AND auth.role() = 'authenticated'
);
