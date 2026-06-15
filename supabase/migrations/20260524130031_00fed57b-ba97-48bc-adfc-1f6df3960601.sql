-- 1. DROP and RECREATE with better type handling and logging
DROP FUNCTION IF EXISTS public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date, integer, integer);

CREATE OR REPLACE FUNCTION public.create_route_with_deliveries(
  p_name text,
  p_source_file_name text,
  p_company_id uuid,
  p_user_id uuid,
  p_driver_id uuid,
  p_total_deliveries integer,
  p_freight_value numeric,
  p_deliveries jsonb,
  p_route_date date DEFAULT now(),
  p_total_rows integer DEFAULT 0,
  p_invalid_rows integer DEFAULT 0
)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route public.routes;
BEGIN
  -- Log start
  RAISE NOTICE 'Starting import for user %: % deliveries', p_user_id, p_total_deliveries;

  -- 1. Create the route
  INSERT INTO public.routes (
    name,
    source_file_name,
    company_id,
    user_id,
    driver_id,
    total_deliveries,
    freight_value,
    status,
    route_date
  )
  VALUES (
    p_name,
    p_source_file_name,
    p_company_id,
    p_user_id,
    p_driver_id,
    p_total_deliveries,
    p_freight_value,
    'planned',
    p_route_date
  )
  RETURNING * INTO v_route;

  -- 2. Create the upload record
  INSERT INTO public.route_uploads (
    route_id,
    user_id,
    original_file_name,
    total_rows,
    valid_rows,
    invalid_rows
  )
  VALUES (
    v_route.id,
    p_user_id,
    p_source_file_name,
    p_total_rows,
    p_total_deliveries,
    p_invalid_rows
  );

  -- 3. Bulk insert deliveries (explicit casting to avoid JSONB errors)
  INSERT INTO public.deliveries (
    route_id,
    at_id,
    sequence,
    original_sequence,
    spx_tn,
    destination_address,
    neighborhood,
    city,
    zipcode,
    latitude,
    longitude,
    freight_value,
    status
  )
  SELECT
    v_route.id,
    (d->>'at_id')::text,
    COALESCE((d->>'sequence')::integer, 0),
    COALESCE((d->>'original_sequence')::integer, 0),
    (d->>'spx_tn')::text,
    COALESCE((d->>'destination_address')::text, 'Endereço não informado'),
    (d->>'neighborhood')::text,
    (d->>'city')::text,
    (d->>'zipcode')::text,
    (d->>'latitude')::numeric,
    (d->>'longitude')::numeric,
    COALESCE((d->>'freight_value')::numeric, 0),
    COALESCE((d->>'status'), 'pending')::delivery_status
  FROM jsonb_array_elements(p_deliveries) AS d;

  RAISE NOTICE 'Import finished successfully for route %', v_route.id;
  RETURN v_route;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries TO authenticated;

-- 2. NUCLEAR RESET of RLS for critical tables to ensure 100% accessibility for authenticated users
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Routes: User can view own" ON public.routes;
DROP POLICY IF EXISTS "Routes: User can insert own" ON public.routes;
DROP POLICY IF EXISTS "Routes: User can update own" ON public.routes;
DROP POLICY IF EXISTS "Routes: User can delete own" ON public.routes;

CREATE POLICY "Allow all for own routes" ON public.routes
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deliveries: User can view and manage" ON public.deliveries;
CREATE POLICY "Allow all for authenticated" ON public.deliveries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Route Uploads: User can view and manage" ON public.route_uploads;
CREATE POLICY "Allow all for own uploads" ON public.route_uploads
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
