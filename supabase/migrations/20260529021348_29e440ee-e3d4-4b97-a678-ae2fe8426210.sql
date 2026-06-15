-- Remover funções existentes para evitar conflitos de sobrecarga
DROP FUNCTION IF EXISTS public.get_dashboard_stats(text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_dashboard_stats(date, date, uuid, boolean);

-- Recriar a função com tipos consistentes (text para datas é mais flexível no PostgREST)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_date_from text, 
  p_date_to text, 
  p_driver_id uuid DEFAULT NULL::uuid, 
  p_force_self boolean DEFAULT false
)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_total_deliveries bigint;
  v_status_counts json;
  v_total_freight numeric;      -- Faturamento Bruto (Total previsto)
  v_recent_routes json;
  v_total_distance numeric;     -- Distância Total
  v_total_tolls numeric;        -- Pedágios Totais
  v_fuel_price numeric := 6.62;
  v_km_per_liter numeric := 11.0;
  v_user_id uuid := auth.uid();
  v_is_admin_role boolean := has_role(auth.uid(), 'admin'::app_role);
  v_is_admin boolean := v_is_admin_role AND NOT p_force_self;
  v_avg_price numeric;
  v_avg_km numeric;
  v_target_price numeric;
  v_target_km numeric;
BEGIN
  -- 1. Obter configurações de combustível
  IF v_is_admin AND p_driver_id IS NULL THEN
    SELECT AVG(fuel_price) FILTER (WHERE fuel_price IS NOT NULL AND fuel_price > 0),
           AVG(km_per_liter) FILTER (WHERE km_per_liter IS NOT NULL AND km_per_liter > 0)
      INTO v_avg_price, v_avg_km
      FROM public.profiles;
    v_fuel_price := COALESCE(v_avg_price, 6.62);
    v_km_per_liter := COALESCE(v_avg_km, 11.0);
  ELSIF v_is_admin AND p_driver_id IS NOT NULL THEN
    SELECT fuel_price, km_per_liter INTO v_target_price, v_target_km
      FROM public.profiles WHERE user_id = p_driver_id LIMIT 1;
    v_fuel_price := COALESCE(v_target_price, 6.62);
    v_km_per_liter := COALESCE(v_target_km, 11.0);
  ELSE
    SELECT fuel_price, km_per_liter INTO v_target_price, v_target_km
      FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
    v_fuel_price := COALESCE(v_target_price, 6.62);
    v_km_per_liter := COALESCE(v_target_km, 11.0);
  END IF;

  -- 2. Roteiros recentes
  SELECT json_agg(r) INTO v_recent_routes
  FROM (
    SELECT id, name, status, route_date, total_deliveries, freight_value, total_distance, tolls_value
    FROM public.routes
    WHERE route_date::text >= p_date_from AND route_date::text <= p_date_to
      AND deleted_at IS NULL
      AND (v_is_admin OR user_id = v_user_id OR driver_id = v_user_id)
      AND (p_driver_id IS NULL OR (v_is_admin AND (driver_id = p_driver_id OR user_id = p_driver_id)))
    ORDER BY created_at DESC LIMIT 6
  ) r;

  -- 3. Contagem de entregas por status
  SELECT count(*),
    json_build_object(
      'pending', count(*) FILTER (WHERE d.status = 'pending'),
      'delivered', count(*) FILTER (WHERE d.status = 'delivered'),
      'problem', count(*) FILTER (WHERE d.status = 'problem')
    )
  INTO v_total_deliveries, v_status_counts
  FROM public.deliveries d JOIN public.routes r ON d.route_id = r.id
  WHERE r.route_date::text >= p_date_from AND r.route_date::text <= p_date_to
    AND r.deleted_at IS NULL
    AND (v_is_admin OR r.user_id = v_user_id OR r.driver_id = v_user_id)
    AND (p_driver_id IS NULL OR (v_is_admin AND (r.driver_id = p_driver_id OR r.user_id = p_driver_id)));

  -- 4. Cálculo de Frete, Distância e Pedágios
  WITH eligible_routes AS (
    SELECT id, total_distance, tolls_value, freight_value, total_deliveries
    FROM public.routes
    WHERE route_date::text >= p_date_from AND route_date::text <= p_date_to AND deleted_at IS NULL
      AND (v_is_admin OR user_id = v_user_id OR driver_id = v_user_id)
      AND (p_driver_id IS NULL OR (v_is_admin AND (driver_id = p_driver_id OR user_id = p_driver_id)))
  ),
  ordered_deliveries AS (
    SELECT d.route_id, d.latitude::float8 AS lat, d.longitude::float8 AS lng,
      ROW_NUMBER() OVER (PARTITION BY d.route_id ORDER BY COALESCE(d.sequence, 999999), d.id) AS rn
    FROM public.deliveries d JOIN eligible_routes er ON er.id = d.route_id
    WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
  ),
  pairs AS (
    SELECT a.route_id, a.lat AS lat1, a.lng AS lng1, b.lat AS lat2, b.lng AS lng2
    FROM ordered_deliveries a JOIN ordered_deliveries b ON a.route_id = b.route_id AND b.rn = a.rn + 1
  ),
  computed AS (
    SELECT route_id, SUM(2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))) AS computed_km
    FROM pairs GROUP BY route_id
  ),
  per_route AS (
    SELECT 
      er.id,
      CASE 
        WHEN er.total_distance IS NOT NULL AND er.total_distance > 0 THEN er.total_distance
        ELSE COALESCE(c.computed_km, 0) 
      END AS full_km,
      COALESCE(er.tolls_value, 0) AS full_tolls, 
      COALESCE(er.freight_value, 0) AS full_freight
    FROM eligible_routes er 
    LEFT JOIN computed c ON c.route_id = er.id
  )
  SELECT 
    COALESCE(SUM(full_freight), 0),
    COALESCE(SUM(full_km), 0),
    COALESCE(SUM(full_tolls), 0)
  INTO v_total_freight, v_total_distance, v_total_tolls FROM per_route;

  v_result := json_build_object(
    'routes', COALESCE(v_recent_routes, '[]'::json),
    'total', v_total_deliveries,
    'byStatus', v_status_counts,
    'totalFreight', v_total_freight,
    'estimatedDistanceKm', v_total_distance,
    'estimatedFuelCost', CASE WHEN v_km_per_liter > 0 THEN (v_total_distance / v_km_per_liter) * v_fuel_price ELSE 0 END,
    'tollsCost', v_total_tolls,
    'netProfit', v_total_freight - v_total_tolls - (CASE WHEN v_km_per_liter > 0 THEN (v_total_distance / v_km_per_liter) * v_fuel_price ELSE 0 END),
    'fuelSettings', json_build_object(
      'fuelPrice', v_fuel_price,
      'kmPerLiter', v_km_per_liter,
      'isAverage', (v_is_admin AND p_driver_id IS NULL AND v_avg_price IS NOT NULL)
    ),
    'isAdmin', v_is_admin,
    'isAdminRole', v_is_admin_role
  );

  RETURN v_result;
END;
$function$;
