-- Add soft delete support to routes
ALTER TABLE public.routes 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create deletion logs table
CREATE TABLE public.route_deletion_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL,
    route_name TEXT,
    deleted_by UUID NOT NULL REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reason TEXT,
    error_details JSONB,
    metadata JSONB
);

-- Enable RLS
ALTER TABLE public.route_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX idx_routes_deleted_at ON public.routes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_route_deletion_logs_route_id ON public.route_deletion_logs(route_id);

-- Update routes policies to exclude deleted ones for regular operations
-- Note: We modify existing policies by adding 'AND deleted_at IS NULL'
-- Assuming standard user policies exist from previous turns.

DO $$ 
BEGIN
    -- Update existing select policy
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routes' AND policyname = 'Users can view their own routes') THEN
        DROP POLICY "Users can view their own routes" ON public.routes;
    END IF;
    
    CREATE POLICY "Users can view their own routes" 
    ON public.routes 
    FOR SELECT 
    USING (auth.uid() = user_id AND deleted_at IS NULL);

    -- Special policy for admins to see deleted routes (if needed)
    -- CREATE POLICY "Admins can view deleted routes" ON public.routes FOR SELECT USING (is_admin() = true);

END $$;

-- Policies for logs
CREATE POLICY "Users can view their own deletion logs"
ON public.route_deletion_logs
FOR SELECT
USING (auth.uid() = deleted_by);

-- Function to handle soft delete via RPC if direct update is restricted by other policies
CREATE OR REPLACE FUNCTION public.soft_delete_route(p_route_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_route_name TEXT;
BEGIN
    -- Get route name for logging
    SELECT name INTO v_route_name FROM public.routes WHERE id = p_route_id;
    
    -- Mark as deleted
    UPDATE public.routes 
    SET deleted_at = now() 
    WHERE id = p_route_id AND user_id = auth.uid();
    
    IF FOUND THEN
        -- Log the deletion
        INSERT INTO public.route_deletion_logs (route_id, route_name, deleted_by, reason)
        VALUES (p_route_id, v_route_name, auth.uid(), p_reason);
    ELSE
        RAISE EXCEPTION 'Route not found or permission denied';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
