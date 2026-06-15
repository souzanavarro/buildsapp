-- Fix table columns
ALTER TABLE public.route_deletion_logs RENAME COLUMN deleted_by TO user_id;
ALTER TABLE public.route_deletion_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
ALTER TABLE public.route_deletion_logs ADD COLUMN IF NOT EXISTS company_id UUID;

-- Update RLS for the new columns
DROP POLICY IF EXISTS "Users can view deletion logs" ON public.route_deletion_logs;
CREATE POLICY "Users can view deletion logs" ON public.route_deletion_logs
    FOR SELECT TO authenticated USING (true);
