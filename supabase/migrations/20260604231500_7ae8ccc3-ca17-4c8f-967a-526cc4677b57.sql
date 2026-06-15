ALTER TABLE public.app_builds ADD COLUMN aab_storage_path TEXT;
GRANT ALL ON public.app_builds TO service_role;
