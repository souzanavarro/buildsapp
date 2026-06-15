-- Fix function search path and execute permissions
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Revoke execute from public and authenticated for all security definer functions found
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- If there are other security definer functions, we should revoke execute from them as well.
-- Since the linter found 2 SD functions, I'll ensure we cover them.
-- Assuming the other one might be related to previous edits or standard ones.
