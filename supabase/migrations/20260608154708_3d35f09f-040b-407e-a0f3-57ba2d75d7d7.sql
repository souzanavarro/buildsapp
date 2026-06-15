ALTER TABLE public.app_builds ALTER COLUMN apk_url DROP NOT NULL;
ALTER TABLE public.app_builds ALTER COLUMN aab_url DROP NOT NULL;
ALTER TABLE public.app_builds ALTER COLUMN apk_url SET DEFAULT '';
ALTER TABLE public.app_builds ALTER COLUMN aab_url SET DEFAULT '';