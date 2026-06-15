CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from date, p_date_to date)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_result json;
  v_total_deliveries bigint;
  v_status_counts json;
  v_total_freight numeric;
  v_recent_routes json;
BEGIN
  -- Get recent routes
  SELECT json_agg(r) INTO v_recent_routes
  FROM (
    SELECT id, name, status, route_date, total_deliveries, freight_value
    FROM public.routes
    WHERE route_date >= p_date_from AND route_date <= p_date_to
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
    ),
    COALESCE(sum(r.freight_value), 0)
  INTO 
    v_total_deliveries,
    v_status_counts,
    v_total_freight
  FROM public.deliveries d
  JOIN public.routes r ON d.route_id = r.id
  WHERE r.route_date >= p_date_from AND r.route_date <= p_date_to;

  v_result := json_build_object(
    'routes', COALESCE(v_recent_routes, '[]'::json),
    'total', v_total_deliveries,
    'byStatus', v_status_counts,
    'totalFreight', v_total_freight
  );

  RETURN v_result;
END;
$function$;