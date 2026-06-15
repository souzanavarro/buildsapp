REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Restrict proof bucket listing: drop broad public read, allow only authenticated
DROP POLICY IF EXISTS "Public read proofs" ON storage.objects;
CREATE POLICY "Authenticated read proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-proofs');

UPDATE storage.buckets SET public = false WHERE id = 'delivery-proofs';