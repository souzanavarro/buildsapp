
-- 1. customer_notes: remove permissive policy, add scoped one
DROP POLICY IF EXISTS "Authenticated users can view all customer notes" ON public.customer_notes;
CREATE POLICY "Users view own customer notes or admin"
  ON public.customer_notes FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. profiles: remove permissive policy
DROP POLICY IF EXISTS "Profiles: Authenticated users can view" ON public.profiles;

-- 3. route_deletion_logs: remove permissive policy
DROP POLICY IF EXISTS "Users can view deletion logs" ON public.route_deletion_logs;

-- 4. realtime.messages: tighten topic policy
DROP POLICY IF EXISTS "Authenticated users read own route_jobs realtime" ON realtime.messages;
CREATE POLICY "Authenticated users read own route_jobs realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'route_jobs:%'
    AND (split_part(realtime.topic(), ':', 2))::uuid = auth.uid()
  );

-- 5. Fix mutable search_path
ALTER FUNCTION public.update_deliveries_original_sequence(uuid[], integer[]) SET search_path = public;
