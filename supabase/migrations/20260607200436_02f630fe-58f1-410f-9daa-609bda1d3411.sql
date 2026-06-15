-- 1. Fix RLS Policy Always True for role_permissions
ALTER POLICY "Everyone authenticated can view role permissions" ON public.role_permissions 
USING (auth.uid() IS NOT NULL);

-- 2. Revoke public execution of all functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public, anon, authenticated;

-- 3. Grant granular EXECUTE permissions back to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, integer, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_route(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_deliveries_original_sequence(uuid[], integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company() TO authenticated;

-- 4. Grant EXECUTE permissions to service_role for system/background tasks
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_process_route_job() TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_stuck_route_jobs() TO service_role;

-- 5. Grant ALL on public schema functions to service_role to ensure backend/edge functions work
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
