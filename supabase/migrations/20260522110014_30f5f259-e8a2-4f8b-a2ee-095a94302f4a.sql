-- Function to update multiple delivery sequences at once
CREATE OR REPLACE FUNCTION public.update_deliveries_sequence(delivery_ids uuid[], sequences integer[])
RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(delivery_ids, 1) LOOP
    UPDATE public.deliveries
    SET sequence = sequences[i]
    WHERE id = delivery_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard stats in one go
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from date, p_date_to date)
RETURNS json AS $$
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
      'pending', count(*) FILTER (WHERE status = 'pending'),
      'delivered', count(*) FILTER (WHERE status = 'delivered'),
      'problem', count(*) FILTER (WHERE status = 'problem')
    ),
    COALESCE(sum(freight_value), 0)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliveries_route_id ON public.deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_routes_route_date ON public.routes(route_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
