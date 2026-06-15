-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;

-- Recreate it without the self-referencing subquery on user_roles
CREATE POLICY "Admins manage all roles" ON public.user_roles
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND (
                (raw_app_meta_data ->> 'role' = 'admin') OR
                (raw_user_meta_data ->> 'role' = 'admin')
            )
        )
    );
