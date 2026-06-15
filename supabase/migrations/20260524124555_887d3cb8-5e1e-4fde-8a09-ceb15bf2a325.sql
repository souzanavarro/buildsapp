-- Drop old function versions
DROP FUNCTION IF EXISTS public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date);

-- Create optimized bulk-insert version
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
    p_total_deliveries, -- valid_rows is p_total_deliveries here
    p_invalid_rows
  );

  -- 3. Bulk insert deliveries (much faster than a loop)
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
    (x.d->>'at_id'),
    (x.d->>'sequence')::integer,
    COALESCE((x.d->>'original_sequence')::integer, (x.d->>'sequence')::integer),
    (x.d->>'spx_tn'),
    (x.d->>'destination_address'),
    (x.d->>'neighborhood'),
    (x.d->>'city'),
    (x.d->>'zipcode'),
    (x.d->>'latitude')::numeric,
    (x.d->>'longitude')::numeric,
    (x.d->>'freight_value')::numeric,
    COALESCE((x.d->>'status'), 'pending')::delivery_status
  FROM jsonb_array_elements(p_deliveries) AS x(d);

  RETURN v_route;
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date, integer, integer) TO authenticated;
