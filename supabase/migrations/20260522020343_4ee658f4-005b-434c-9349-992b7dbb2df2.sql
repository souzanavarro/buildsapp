-- Grant usage on schema and types
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON TYPE public.app_role TO authenticated, anon;

-- Re-grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated, anon;

-- Ensure functions are security definer (already verified, but re-asserting for safety)
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY DEFINER;
ALTER FUNCTION public.get_user_company(uuid) SECURITY DEFINER;
