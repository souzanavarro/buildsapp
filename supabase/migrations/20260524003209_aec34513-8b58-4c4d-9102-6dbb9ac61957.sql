REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries FROM anon;
GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries TO authenticated;
