GRANT EXECUTE ON FUNCTION public.get_user_company() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;