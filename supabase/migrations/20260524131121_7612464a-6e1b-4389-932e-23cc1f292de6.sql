DROP TRIGGER IF EXISTS tr_updated_at ON public.deliveries;
DROP TRIGGER IF EXISTS tr_updated_at ON public.routes;
-- We keep trg_deliveries_updated and trg_routes_updated as they seem to be the standard ones.
