
-- Fix delivery-proofs storage policies: foldername was applied to r.name (route name) instead of the storage object's path
DROP POLICY IF EXISTS "View delivery proofs by company or driver" ON storage.objects;
DROP POLICY IF EXISTS "Drivers upload delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Secure view delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Secure insert delivery proofs" ON storage.objects;

CREATE POLICY "Secure view delivery proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.routes r ON r.id = d.route_id
    WHERE d.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        r.driver_id = auth.uid()
        OR r.company_id = public.get_user_company(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Secure insert delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.routes r ON r.id = d.route_id
    WHERE d.id::text = (storage.foldername(storage.objects.name))[1]
      AND r.driver_id = auth.uid()
  )
);

CREATE POLICY "Secure delete delivery proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.routes r ON r.id = d.route_id
    WHERE d.id::text = (storage.foldername(storage.objects.name))[1]
      AND (r.driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Allow company admins to view their drivers' telemetry
CREATE POLICY "Company admins view their drivers telemetry"
ON public.driver_telemetry FOR SELECT
USING (
  public.get_user_company(auth.uid()) IS NOT NULL
  AND public.get_user_company(auth.uid()) = public.get_user_company(user_id)
);

-- Add UPDATE/DELETE policies on route-files so owners (and admins) can manage their files
CREATE POLICY "Owners update route files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'route-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Owners delete route files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'route-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
