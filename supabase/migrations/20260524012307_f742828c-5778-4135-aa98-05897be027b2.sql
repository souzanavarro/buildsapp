
-- 1. pg_net + pg_cron (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Status enum
DO $$ BEGIN
  CREATE TYPE public.route_job_status AS ENUM ('pending','processing','done','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Table
CREATE TABLE IF NOT EXISTS public.route_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  name text NOT NULL,
  source_file_name text,
  total_deliveries integer NOT NULL DEFAULT 0,
  freight_value numeric NOT NULL DEFAULT 0,
  deliveries jsonb NOT NULL,
  status public.route_job_status NOT NULL DEFAULT 'pending',
  progress integer NOT NULL DEFAULT 0,
  route_id uuid,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_jobs_user ON public.route_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_jobs_status ON public.route_jobs(status, created_at);

-- 4. RLS
ALTER TABLE public.route_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own jobs" ON public.route_jobs;
CREATE POLICY "Users view own jobs" ON public.route_jobs
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own jobs" ON public.route_jobs;
CREATE POLICY "Users insert own jobs" ON public.route_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own jobs" ON public.route_jobs;
CREATE POLICY "Users update own jobs" ON public.route_jobs
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Updated_at trigger
DROP TRIGGER IF EXISTS trg_route_jobs_updated_at ON public.route_jobs;
CREATE TRIGGER trg_route_jobs_updated_at
  BEFORE UPDATE ON public.route_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Realtime
ALTER TABLE public.route_jobs REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.route_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Trigger that calls the worker endpoint via pg_net
CREATE OR REPLACE FUNCTION public.trigger_process_route_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--76dd5606-d816-4114-8128-51c33ef67889.lovable.app/api/public/hooks/process-route-job',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_jobs_enqueue ON public.route_jobs;
CREATE TRIGGER trg_route_jobs_enqueue
  AFTER INSERT ON public.route_jobs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_process_route_job();

-- 8. Fallback cron: re-trigger stuck pending jobs (>30s) and fail zombies (>10min processing)
CREATE OR REPLACE FUNCTION public.recover_stuck_route_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
BEGIN
  -- Mark zombies as error
  UPDATE public.route_jobs
  SET status = 'error',
      error_message = COALESCE(error_message, 'Processamento expirou (zumbi)'),
      finished_at = now()
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes';

  -- Retry pending jobs older than 30s
  FOR v_job IN
    SELECT id FROM public.route_jobs
    WHERE status = 'pending'
      AND created_at < now() - interval '30 seconds'
      AND attempts < 5
    LIMIT 20
  LOOP
    PERFORM net.http_post(
      url := 'https://project--76dd5606-d816-4114-8128-51c33ef67889.lovable.app/api/public/hooks/process-route-job',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('job_id', v_job.id)
    );
  END LOOP;
END;
$$;

-- Schedule cron every minute (unschedule first to allow re-runs of migration)
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'recover-stuck-route-jobs';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'recover-stuck-route-jobs',
  '* * * * *',
  $$ SELECT public.recover_stuck_route_jobs(); $$
);
