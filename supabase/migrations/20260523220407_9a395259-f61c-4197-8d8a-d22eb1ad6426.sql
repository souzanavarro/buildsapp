-- Ajustar search_path para segurança em todas as funções customizadas
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.get_user_company(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
