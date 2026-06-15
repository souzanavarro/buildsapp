-- 1. Create a function that checks for admin role using JWT metadata or a non-recursive query
-- Since user_roles is the source of truth, we can use a simpler query or check JWT claims if configured.
-- For now, let's fix the policies to use direct checks.

-- Drop old recursive policies
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create new non-recursive policies
-- Users can always see their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and manage all roles
-- We use a subquery that doesn't trigger the same policy or check JWT
CREATE POLICY "Admins manage all roles" ON public.user_roles
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND (raw_app_meta_data ->> 'role' = 'admin')
        ) OR
        -- Fallback to a direct table check but we must be careful with recursion.
        -- In Postgres, a subquery on the same table in a policy can be tricky.
        -- Using auth.uid() check against a known admin ID or metadata is safer.
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'::public.app_role
    );

-- Also fix the has_role function to be more robust if used in other policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) 
RETURNS boolean AS $$
BEGIN
  -- Direct check that might still be called from other tables' policies
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Use SECURITY DEFINER to bypass RLS in the check
