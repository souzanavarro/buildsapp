-- 1. Fix permissive RLS policies
-- driver_stats
DROP POLICY IF EXISTS "Drivers view their stats" ON public.driver_stats;
CREATE POLICY "Drivers view their own stats" ON public.driver_stats
    FOR SELECT USING (
        driver_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
        )
    );

-- training_videos
DROP POLICY IF EXISTS "Everyone views trainings" ON public.training_videos;
CREATE POLICY "Authenticated users view trainings" ON public.training_videos
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Fix Security Definer Functions
-- Check if has_role exists and update it
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'has_role' AND n.nspname = 'public') THEN
    ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'get_user_company' AND n.nspname = 'public') THEN
    ALTER FUNCTION public.get_user_company(uuid) SECURITY INVOKER;
  END IF;
END $$;

-- 3. Restrict Execute permissions on internal functions
DO $$
BEGIN
  -- We use DO block to gracefully handle if functions don't exist yet
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC';

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
