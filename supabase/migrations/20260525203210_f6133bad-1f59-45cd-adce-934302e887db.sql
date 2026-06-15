CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
  v_total_deliveries bigint;
  v_status_counts json;
  v_total_freight numeric;
  v_recent_routes json;
  v_total_distance numeric;
  v_fuel_price numeric := 5.80; -- Preço médio gasolina/diesel
  v_km_per_liter numeric := 10.0; -- Média de consumo
BEGIN
  -- Get recent routes
  SELECT json_agg(r) INTO v_recent_routes
  FROM (
    SELECT id, name, status, route_date, total_deliveries, freight_value
    FROM public.routes
    WHERE route_date >= p_date_from AND route_date <= p_date_to
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 6
  ) r;

  -- Get total deliveries and status counts
  SELECT 
    count(*),
    json_build_object(
      'pending', count(*) FILTER (WHERE d.status = 'pending'),
      'delivered', count(*) FILTER (WHERE d.status = 'delivered'),
      'problem', count(*) FILTER (WHERE d.status = 'problem')
    )
  INTO 
    v_total_deliveries,
    v_status_counts
  FROM public.deliveries d
  JOIN public.routes r ON d.route_id = r.id
  WHERE r.route_date >= p_date_from AND r.route_date <= p_date_to
  AND r.deleted_at IS NULL;

  -- Get total freight value and estimate distance based on delivery counts and random average per delivery (2.5km)
  SELECT 
    COALESCE(sum(freight_value), 0),
    COALESCE(sum(total_deliveries * 2.5), 0)
  INTO 
    v_total_freight,
    v_total_distance
  FROM public.routes
  WHERE route_date >= p_date_from AND route_date <= p_date_to
  AND deleted_at IS NULL;

  v_result := json_build_object(
    'routes', COALESCE(v_recent_routes, '[]'::json),
    'total', v_total_deliveries,
    'byStatus', v_status_counts,
    'totalFreight', v_total_freight,
    'estimatedDistanceKm', v_total_distance,
    'estimatedFuelCost', (v_total_distance / v_km_per_liter) * v_fuel_price,
    'netProfit', v_total_freight - ((v_total_distance / v_km_per_liter) * v_fuel_price)
  );

  RETURN v_result;
END;
$function$;