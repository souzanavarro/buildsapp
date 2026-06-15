CREATE TABLE IF NOT EXISTS public.app_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    apk_url TEXT NOT NULL,
    aab_url TEXT NOT NULL,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT ON public.app_builds TO authenticated;
GRANT ALL ON public.app_builds TO service_role;

ALTER TABLE public.app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view builds" ON public.app_builds
    FOR SELECT TO authenticated USING (true);
