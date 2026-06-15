CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_result json;
  v_total_deliveries bigint;
  v_status_counts json;
  v_total_freight numeric;
  v_recent_routes json;
  v_total_distance numeric;
  v_fuel_price numeric := 5.80;
  v_km_per_liter numeric := 10.0;
  v_user_id uuid := auth.uid();
  v_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  SELECT json_agg(r) INTO v_recent_routes
  FROM (
    SELECT id, name, status, route_date, total_deliveries, freight_value
    FROM public.routes
    WHERE route_date >= p_date_from AND route_date <= p_date_to
      AND deleted_at IS NULL
      AND (v_is_admin OR user_id = v_user_id OR driver_id = v_user_id)
    ORDER BY created_at DESC
    LIMIT 6
  ) r;

  SELECT
    count(*),
    json_build_object(
      'pending', count(*) FILTER (WHERE d.status = 'pending'),
      'delivered', count(*) FILTER (WHERE d.status = 'delivered'),
      'problem', count(*) FILTER (WHERE d.status = 'problem')
    )
  INTO v_total_deliveries, v_status_counts
  FROM public.deliveries d
  JOIN public.routes r ON d.route_id = r.id
  WHERE r.route_date >= p_date_from AND r.route_date <= p_date_to
    AND r.deleted_at IS NULL
    AND (v_is_admin OR r.user_id = v_user_id OR r.driver_id = v_user_id);

  SELECT
    COALESCE(sum(freight_value), 0),
    COALESCE(sum(total_deliveries * 2.5), 0)
  INTO v_total_freight, v_total_distance
  FROM public.routes
  WHERE route_date >= p_date_from AND route_date <= p_date_to
    AND deleted_at IS NULL
    AND (v_is_admin OR user_id = v_user_id OR driver_id = v_user_id);

  v_result := json_build_object(
    'routes', COALESCE(v_recent_routes, '[]'::json),
    'total', v_total_deliveries,
    'byStatus', v_status_counts,
    'totalFreight', v_total_freight,
    'estimatedDistanceKm', v_total_distance,
    'estimatedFuelCost', (v_total_distance / v_km_per_liter) * v_fuel_price,
    'netProfit', v_total_freight - ((v_total_distance / v_km_per_liter) * v_fuel_price),
    'isAdmin', v_is_admin
  );

  RETURN v_result;
END;
$function$;