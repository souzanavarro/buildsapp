-- Drop the policy that was causing permission issues by trying to access auth.users directly
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;

-- Recreate the policy using only JWT claims which are available to the database without querying auth.users
-- This avoids the 'permission denied for table users' error
CREATE POLICY "Admins manage all roles" ON public.user_roles
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    );
