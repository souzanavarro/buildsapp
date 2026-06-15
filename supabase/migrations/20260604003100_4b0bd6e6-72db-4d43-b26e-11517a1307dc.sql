CREATE TABLE public.app_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL, -- 'android', 'web'
    version_name TEXT,
    download_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_versions TO authenticated;
GRANT ALL ON public.app_versions TO service_role;

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuário logado pode ver as versões" ON public.app_versions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Apenas admin pode gerenciar versões" ON public.app_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

INSERT INTO public.app_versions (platform, version_name, download_url, notes)
VALUES ('web', '1.0.0', 'https://souzanavarro.github.io/rotacerta/', 'Versão Web Responsiva');