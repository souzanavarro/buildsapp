-- Clean up existing route policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can insert own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can update own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can delete own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can view their own routes" ON public.routes;

-- Robust Route Policies
CREATE POLICY "Routes: User can view own" 
ON public.routes FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR auth.uid() = driver_id);

CREATE POLICY "Routes: User can insert own" 
ON public.routes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Routes: User can update own" 
ON public.routes FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Routes: User can delete own" 
ON public.routes FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Deliveries: Allow authenticated users to manage deliveries linked to their routes
DROP POLICY IF EXISTS "Users can view own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can manage own deliveries" ON public.deliveries;

CREATE POLICY "Deliveries: User can view and manage"
ON public.deliveries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes r 
    WHERE r.id = deliveries.route_id 
    AND (r.user_id = auth.uid() OR r.driver_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes r 
    WHERE r.id = deliveries.route_id 
    AND r.user_id = auth.uid()
  )
);

-- Route Uploads: Allow authenticated users to manage their own uploads
DROP POLICY IF EXISTS "Users can view own uploads" ON public.route_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.route_uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON public.route_uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON public.route_uploads;

CREATE POLICY "Route Uploads: User can view and manage"
ON public.route_uploads FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure profiles are accessible for company check
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Profiles: Authenticated users can view"
ON public.profiles FOR SELECT
TO authenticated
USING (true); -- Needed to find company info for others/system, but RLS on companies handles the sensitive parts
