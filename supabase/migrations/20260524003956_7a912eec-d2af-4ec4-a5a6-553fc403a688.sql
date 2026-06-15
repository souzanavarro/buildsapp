DROP POLICY IF EXISTS "Company admins view their drivers telemetry" ON public.driver_telemetry;

CREATE POLICY "Company admins view their drivers telemetry"
ON public.driver_telemetry
FOR SELECT
TO authenticated
USING (
  get_user_company(auth.uid()) IS NOT NULL
  AND get_user_company(auth.uid()) = get_user_company(user_id)
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
  THEN
    RAISE EXCEPTION 'Não é permitido alterar campos sensíveis do perfil (role, active, expires_at, company_id)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "Owners update route files" ON storage.objects;
CREATE POLICY "Owners update route files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'route-files'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Owners delete route files" ON storage.objects;
CREATE POLICY "Owners delete route files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'route-files'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);