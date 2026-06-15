-- Ensure the log table exists
CREATE TABLE IF NOT EXISTS public.route_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID,
    user_id UUID REFERENCES auth.users(id),
    route_name TEXT,
    company_id UUID,
    reason TEXT,
    status TEXT, -- 'success', 'failed'
    error_details TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see logs (in a real app, you might restrict this to admins)
CREATE POLICY "Users can view deletion logs" ON public.route_deletion_logs
    FOR SELECT TO authenticated USING (true);

-- Create an index for the admin page
CREATE INDEX IF NOT EXISTS idx_route_deletion_logs_date ON public.route_deletion_logs (deleted_at DESC);
