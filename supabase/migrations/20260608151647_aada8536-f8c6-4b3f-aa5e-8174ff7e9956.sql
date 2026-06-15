CREATE TABLE public.github_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    repo_path TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    token_secret_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_builds ADD COLUMN repository_id UUID REFERENCES public.github_repositories(id);

GRANT ALL ON public.github_repositories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_repositories TO authenticated;

ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage github repositories" ON public.github_repositories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE TRIGGER update_github_repositories_updated_at 
    BEFORE UPDATE ON public.github_repositories 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();