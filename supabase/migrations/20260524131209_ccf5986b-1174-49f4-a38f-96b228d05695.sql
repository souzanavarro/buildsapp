CREATE OR REPLACE FUNCTION import_route_with_deliveries(
  p_name TEXT,
  p_source_file_name TEXT,
  p_company_id UUID,
  p_user_id UUID,
  p_driver_id UUID,
  p_total_deliveries INTEGER,
  p_freight_value NUMERIC,
  p_total_rows INTEGER,
  p_invalid_rows INTEGER,
  p_deliveries JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_route_id UUID;
  v_route_result JSONB;
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
  ) RETURNING id INTO v_route_id;

  -- 2. Create the upload log
  INSERT INTO public.route_uploads (
    route_id,
    user_id,
    original_file_name,
    total_rows,
    valid_rows,
    invalid_rows
  ) VALUES (
    v_route_id,
    p_user_id,
    p_source_file_name,
    p_total_rows,
    p_total_deliveries,
    p_invalid_rows
  );

  -- 3. Insert deliveries
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
    v_route_id,
    (d->>'at_id'),
    (d->>'sequence')::INTEGER,
    (d->>'original_sequence')::INTEGER,
    (d->>'spx_tn'),
    (d->>'destination_address'),
    (d->>'neighborhood'),
    (d->>'city'),
    (d->>'zipcode'),
    (d->>'latitude')::NUMERIC,
    (d->>'longitude')::NUMERIC,
    COALESCE((d->>'freight_value')::NUMERIC, 0),
    COALESCE(d->>'status', 'pending')::delivery_status
  FROM jsonb_array_elements(p_deliveries) AS d;

  -- 4. Get the created route to return
  SELECT row_to_json(r) INTO v_route_result
  FROM public.routes r
  WHERE r.id = v_route_id;

  RETURN v_route_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;
