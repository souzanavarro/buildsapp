
-- 1. Telegram settings: admin-only
DROP POLICY IF EXISTS "Admins can manage telegram settings" ON public.telegram_settings;
CREATE POLICY "Admins manage telegram settings"
  ON public.telegram_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. app_builds: remove permissive SELECT (Admins manage policy already covers admin SELECT)
DROP POLICY IF EXISTS "Admins can view builds" ON public.app_builds;

-- 3. driver_daily_scores: add admin SELECT and service role manage
CREATE POLICY "Admins can view all driver scores"
  ON public.driver_daily_scores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages driver scores"
  ON public.driver_daily_scores FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 4. Storage: remove public access, restrict to admins
DROP POLICY IF EXISTS "Builds Android são públicos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to App Builds" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Admins read android-builds"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'android-builds' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read app-builds"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read internal-apks"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'internal-apks' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix mutable search_path on functions
ALTER FUNCTION public.calculate_route_financials() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
