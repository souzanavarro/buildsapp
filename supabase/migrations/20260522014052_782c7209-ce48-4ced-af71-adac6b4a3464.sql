-- Revoke execute permissions from public/authenticated for all security definer functions in public schema
-- Using the exact argument names and types returned by the query
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
