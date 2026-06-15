CREATE TABLE IF NOT EXISTS public.route_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    total_deliveries INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'started', 'success', 'failed'
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.route_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs" ON public.route_import_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs" ON public.route_import_logs
    FOR SELECT USING (auth.uid() = user_id);
