-- Security fix for soft_delete_route
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure error_logs has RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own error logs" ON public.error_logs;
CREATE POLICY "Users can view their own error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')));

DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Fix trigger_process_route_job to be more robust
CREATE OR REPLACE FUNCTION public.trigger_process_route_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We use a generic approach if possible or ensure it points to the correct endpoint
  -- In this environment, we keep the existing URL but wrap it in error handling
  BEGIN
    PERFORM net.http_post(
      url := 'https://project--76dd5606-d816-4114-8128-51c33ef67889.lovable.app/api/public/hooks/process-route-job',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('job_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log internal error but don't fail the insert
    INSERT INTO public.error_logs (error_message, metadata)
    VALUES ('Failed to trigger pg_net job: ' || SQLERRM, jsonb_build_object('job_id', NEW.id));
  END;
  RETURN NEW;
END;
$$;
