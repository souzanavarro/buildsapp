-- Revoke execute from public to prevent anonymous calls
REVOKE EXECUTE ON FUNCTION public.get_user_company() FROM PUBLIC;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_user_company() TO authenticated;

-- Ensure search_path is secure
ALTER FUNCTION public.get_user_company() SET search_path TO 'public';
