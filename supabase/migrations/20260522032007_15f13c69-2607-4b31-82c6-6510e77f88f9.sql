-- Fix search path for security
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Revoke execute from public/authenticated for security definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- If there are other security definer functions, handle them too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
        ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
        -- authenticated might need to execute has_role, so we keep it if it's used in RLS
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company') THEN
        ALTER FUNCTION public.get_user_company(uuid) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM PUBLIC;
    END IF;
END $$;
