-- Add user_id to route_uploads
ALTER TABLE public.route_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop and recreate function with correct return type
DROP FUNCTION IF EXISTS public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date);

CREATE OR REPLACE FUNCTION public.create_route_with_deliveries(
  p_name text,
  p_source_file_name text,
  p_company_id uuid,
  p_user_id uuid,
  p_driver_id uuid,
  p_total_deliveries integer,
  p_freight_value numeric,
  p_deliveries jsonb,
  p_route_date date DEFAULT now()
)
RETURNS public.routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route public.routes;
  v_delivery record;
BEGIN
  -- Insert route
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

  -- Insert deliveries
  FOR v_delivery IN SELECT * FROM jsonb_to_recordset(p_deliveries) AS x(
    at_id text,
    sequence integer,
    spx_tn text,
    destination_address text,
    neighborhood text,
    city text,
    zipcode text,
    latitude numeric,
    longitude numeric,
    freight_value numeric,
    status text
  )
  LOOP
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
    VALUES (
      v_route.id,
      v_delivery.at_id,
      v_delivery.sequence,
      v_delivery.sequence,
      v_delivery.spx_tn,
      v_delivery.destination_address,
      v_delivery.neighborhood,
      v_delivery.city,
      v_delivery.zipcode,
      v_delivery.latitude,
      v_delivery.longitude,
      v_delivery.freight_value,
      COALESCE(v_delivery.status, 'pending')::delivery_status
    );
  END LOOP;

  RETURN v_route;
END;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date) FROM public;
GRANT EXECUTE ON FUNCTION public.create_route_with_deliveries(text, text, uuid, uuid, uuid, integer, numeric, jsonb, date) TO authenticated;
