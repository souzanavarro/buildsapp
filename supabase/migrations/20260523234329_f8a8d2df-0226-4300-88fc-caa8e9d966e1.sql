-- Create AI Projects table
CREATE TABLE public.ai_projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    app_config JSONB DEFAULT '{}'::jsonb, -- Stores the structure, screens, and components
    preview_url TEXT,
    status TEXT DEFAULT 'draft', -- draft, generating, ready, deploying
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ai_projects
ALTER TABLE public.ai_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI projects" 
ON public.ai_projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI projects" 
ON public.ai_projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI projects" 
ON public.ai_projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI projects" 
ON public.ai_projects FOR DELETE 
USING (auth.uid() = user_id);

-- Create AI Prompts table (Chat history for the builder)
CREATE TABLE public.ai_prompts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prompts for their projects" 
ON public.ai_prompts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert prompts for their projects" 
ON public.ai_prompts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create AI Builds table
CREATE TABLE public.ai_builds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'android', 'ios', 'pwa'
    status TEXT DEFAULT 'pending', -- pending, building, completed, failed
    artifact_url TEXT,
    logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ai_builds
ALTER TABLE public.ai_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view builds for their projects" 
ON public.ai_builds FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.ai_projects 
        WHERE ai_projects.id = ai_builds.project_id 
        AND ai_projects.user_id = auth.uid()
    )
);

-- Add triggers for updated_at
CREATE TRIGGER update_ai_projects_updated_at
BEFORE UPDATE ON public.ai_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_builds_updated_at
BEFORE UPDATE ON public.ai_builds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
