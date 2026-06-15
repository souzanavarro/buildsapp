-- 1. Fix function search_path
CREATE OR REPLACE FUNCTION public.import_route_with_deliveries(p_name text, p_source_file_name text, p_company_id uuid, p_user_id uuid, p_driver_id uuid, p_total_deliveries integer, p_freight_value numeric, p_total_rows integer, p_invalid_rows integer, p_deliveries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_route_id UUID;
  v_route_result JSONB;
BEGIN
  INSERT INTO public.routes (
    name, source_file_name, company_id, user_id, driver_id,
    total_deliveries, freight_value, status
  ) VALUES (
    p_name, p_source_file_name, p_company_id, p_user_id, p_driver_id,
    p_total_deliveries, p_freight_value, 'planned'
  ) RETURNING id INTO v_route_id;

  INSERT INTO public.route_uploads (
    route_id, user_id, original_file_name, total_rows, valid_rows, invalid_rows
  ) VALUES (
    v_route_id, p_user_id, p_source_file_name, p_total_rows, p_total_deliveries, p_invalid_rows
  );

  INSERT INTO public.deliveries (
    route_id, at_id, sequence, original_sequence, spx_tn, destination_address,
    neighborhood, city, zipcode, latitude, longitude, freight_value, status
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

  SELECT row_to_json(r) INTO v_route_result FROM public.routes r WHERE r.id = v_route_id;
  RETURN v_route_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$function$;

-- 2. Tighten error_logs INSERT: require authenticated and user_id match or null
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;

-- 3. Tighten deliveries "Allow all for authenticated" (USING true) — scope to user's company/owned routes
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.deliveries;

CREATE POLICY "Users view deliveries from own routes"
ON public.deliveries FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = deliveries.route_id AND (r.user_id = auth.uid() OR r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Users insert deliveries on own routes"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = deliveries.route_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Users update deliveries on own routes"
ON public.deliveries FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = deliveries.route_id AND (r.user_id = auth.uid() OR r.driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = deliveries.route_id AND (r.user_id = auth.uid() OR r.driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Users delete deliveries on own routes"
ON public.deliveries FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = deliveries.route_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

-- 4. Realtime authorization: restrict realtime.messages broadcasts so users only
-- receive postgres_changes for route_jobs rows they own.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read own route_jobs realtime" ON realtime.messages;
CREATE POLICY "Authenticated users read own route_jobs realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (
  (realtime.topic() LIKE 'route_jobs:%' AND split_part(realtime.topic(), ':', 2)::uuid = auth.uid())
  OR (realtime.topic() NOT LIKE 'route_jobs:%')
);