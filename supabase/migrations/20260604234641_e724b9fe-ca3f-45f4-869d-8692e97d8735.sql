ALTER TABLE public.app_builds ADD COLUMN IF NOT EXISTS github_run_id TEXT;
ALTER TABLE public.app_builds ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'android';
ALTER TABLE public.app_builds ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update RLS for app_builds
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_builds TO authenticated;
GRANT ALL ON public.app_builds TO service_role;

-- Ensure triggers or policies allow update by service_role
ALTER TABLE public.app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app_builds" ON public.app_builds
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can manage app_builds" ON public.app_builds
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
