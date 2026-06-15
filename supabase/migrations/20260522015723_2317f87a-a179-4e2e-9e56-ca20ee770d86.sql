-- Grant execute permission on helper functions used in RLS
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated, anon;
