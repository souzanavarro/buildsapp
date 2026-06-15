ALTER TABLE public.app_versions ADD COLUMN bundle_url TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_versions TO authenticated;
GRANT ALL ON public.app_versions TO service_role;