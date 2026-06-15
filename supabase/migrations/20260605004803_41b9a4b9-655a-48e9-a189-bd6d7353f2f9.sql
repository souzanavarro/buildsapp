-- Ensure RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all roles (checking if it exists first to avoid error)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all roles' AND tablename = 'user_roles') THEN
        CREATE POLICY "Admins can view all roles" 
        ON public.user_roles 
        FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
END $$;

-- Secure admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all audit logs' AND tablename = 'admin_audit_logs') THEN
        CREATE POLICY "Admins can view all audit logs" 
        ON public.admin_audit_logs 
        FOR SELECT 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
END $$;

-- Ensure service role can always bypass
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.admin_audit_logs TO service_role;
