
-- 1. Fix delivery-proofs storage policies: restrict to driver or company members
DROP POLICY IF EXISTS "Authenticated read proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public View" ON storage.objects;
DROP POLICY IF EXISTS "Drivers upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Driver Upload Proofs" ON storage.objects;

CREATE POLICY "View delivery proofs by company or driver"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.routes r ON r.id = d.route_id
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (
        r.company_id = public.get_user_company(auth.uid())
        OR r.driver_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Drivers upload delivery proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.routes r ON r.id = d.route_id
    WHERE d.id::text = (storage.foldername(name))[1]
      AND r.driver_id = auth.uid()
  )
);

-- 2. Profiles: prevent role escalation. Replace permissive update policies.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (no role change)"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND active IS NOT DISTINCT FROM (SELECT p.active FROM public.profiles p WHERE p.user_id = auth.uid())
  AND expires_at IS NOT DISTINCT FROM (SELECT p.expires_at FROM public.profiles p WHERE p.user_id = auth.uid())
  AND company_id IS NOT DISTINCT FROM (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 3. Deliveries: add explicit WITH CHECK on manage policy
DROP POLICY IF EXISTS "Users can manage own deliveries" ON public.deliveries;

CREATE POLICY "Users can manage own deliveries"
ON public.deliveries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = deliveries.route_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.id = deliveries.route_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 4. route_uploads: add explicit UPDATE/DELETE policies (owner or admin only)
CREATE POLICY "Users can update own uploads"
ON public.route_uploads FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_uploads.route_id
          AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_uploads.route_id
          AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
);

CREATE POLICY "Users can delete own uploads"
ON public.route_uploads FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_uploads.route_id
          AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
);

-- 5. Lock down SECURITY DEFINER functions: set search_path, revoke from anon
ALTER FUNCTION public.get_dashboard_stats(date, date) SET search_path = public;
ALTER FUNCTION public.update_deliveries_sequence(uuid[], integer[]) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_deliveries_sequence(uuid[], integer[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_deliveries_sequence(uuid[], integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated;
