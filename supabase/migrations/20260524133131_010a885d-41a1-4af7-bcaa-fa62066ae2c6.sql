-- 1. Function to safely get the user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Data preservation
-- Never delete production data from an application migration. Earlier versions of
-- this migration cleared operational tables here, which could wipe routes,
-- deliveries, proofs and import history during a fresh deploy or replay.

-- 3. Update/Enforce RLS Rules for Routes
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view routes of their company" ON public.routes;
CREATE POLICY "Users can view routes of their company"
ON public.routes FOR SELECT
USING (company_id = public.get_user_company());

DROP POLICY IF EXISTS "Users can create routes for their company" ON public.routes;
CREATE POLICY "Users can create routes for their company"
ON public.routes FOR INSERT
WITH CHECK (company_id = public.get_user_company());

DROP POLICY IF EXISTS "Users can update routes of their company" ON public.routes;
CREATE POLICY "Users can update routes of their company"
ON public.routes FOR UPDATE
USING (company_id = public.get_user_company());

DROP POLICY IF EXISTS "Users can delete routes of their company" ON public.routes;
CREATE POLICY "Users can delete routes of their company"
ON public.routes FOR DELETE
USING (company_id = public.get_user_company());

-- 4. Update/Enforce RLS Rules for Deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deliveries of their routes" ON public.deliveries;
CREATE POLICY "Users can view deliveries of their routes"
ON public.deliveries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.routes 
    WHERE id = deliveries.route_id 
    AND company_id = public.get_user_company()
  )
);

DROP POLICY IF EXISTS "Users can insert deliveries to their routes" ON public.deliveries;
CREATE POLICY "Users can insert deliveries to their routes"
ON public.deliveries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes 
    WHERE id = route_id 
    AND company_id = public.get_user_company()
  )
);

DROP POLICY IF EXISTS "Users can update deliveries of their routes" ON public.deliveries;
CREATE POLICY "Users can update deliveries of their routes"
ON public.deliveries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.routes 
    WHERE id = deliveries.route_id 
    AND company_id = public.get_user_company()
  )
);

DROP POLICY IF EXISTS "Users can delete deliveries of their routes" ON public.deliveries;
CREATE POLICY "Users can delete deliveries of their routes"
ON public.deliveries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.routes 
    WHERE id = deliveries.route_id 
    AND company_id = public.get_user_company()
  )
);

-- 5. Rules for Route Uploads
ALTER TABLE public.route_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own uploads" ON public.route_uploads;
CREATE POLICY "Users can manage their own uploads"
ON public.route_uploads FOR ALL
USING (user_id = auth.uid());

-- 6. Rules for Import Logs
ALTER TABLE public.route_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own import logs" ON public.route_import_logs;
CREATE POLICY "Users can view their own import logs"
ON public.route_import_logs FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System/User can insert import logs" ON public.route_import_logs;
CREATE POLICY "System/User can insert import logs"
ON public.route_import_logs FOR INSERT
WITH CHECK (user_id = auth.uid());
