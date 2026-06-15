-- Create enum for confidence if not exists
DO $$ BEGIN
    CREATE TYPE public.delivery_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create cep_cache table
CREATE TABLE IF NOT EXISTS public.cep_cache (
    cep TEXT PRIMARY KEY,
    logradouro TEXT,
    bairro TEXT,
    localidade TEXT,
    uf TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns to deliveries
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS confidence public.delivery_confidence DEFAULT 'high',
ADD COLUMN IF NOT EXISTS confidence_reason TEXT,
ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1;

-- Set up permissions and RLS for cep_cache
GRANT SELECT, INSERT ON public.cep_cache TO authenticated;
GRANT SELECT, INSERT ON public.cep_cache TO anon;
GRANT ALL ON public.cep_cache TO service_role;

ALTER TABLE public.cep_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read from cep_cache" 
ON public.cep_cache FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert into cep_cache" 
ON public.cep_cache FOR INSERT 
WITH CHECK (true);
