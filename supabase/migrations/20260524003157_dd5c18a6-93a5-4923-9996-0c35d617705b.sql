CREATE OR REPLACE FUNCTION public.create_route_with_deliveries(
  p_name TEXT,
  p_source_file_name TEXT,
  p_company_id UUID,
  p_user_id UUID,
  p_driver_id UUID,
  p_total_deliveries INTEGER,
  p_freight_value NUMERIC,
  p_deliveries JSONB
)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route public.routes;
BEGIN
  -- 1. Insert the route
  INSERT INTO public.routes (
    name,
    source_file_name,
    company_id,
    user_id,
    driver_id,
    total_deliveries,
    freight_value,
    status
  ) VALUES (
    p_name,
    p_source_file_name,
    p_company_id,
    p_user_id,
    p_driver_id,
    p_total_deliveries,
    p_freight_value,
    'planned'
  )
  RETURNING * INTO v_route;

  -- 2. Bulk insert deliveries from JSONB
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
    (d->>'at_id')::TEXT,
    (d->>'sequence')::INTEGER,
    (d->>'original_sequence')::INTEGER,
    (d->>'spx_tn')::TEXT,
    (d->>'destination_address')::TEXT,
    (d->>'neighborhood')::TEXT,
    (d->>'city')::TEXT,
    (d->>'zipcode')::TEXT,
    (d->>'latitude')::NUMERIC,
    (d->>'longitude')::NUMERIC,
    (d->>'freight_value')::NUMERIC,
    COALESCE((d->>'status')::public.delivery_status, 'pending'::public.delivery_status)
  FROM jsonb_array_elements(p_deliveries) AS d;

  -- 3. Return the route
  RETURN v_route;
END;
$$;
