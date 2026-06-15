DROP FUNCTION IF EXISTS public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb);

REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date) TO authenticated;
