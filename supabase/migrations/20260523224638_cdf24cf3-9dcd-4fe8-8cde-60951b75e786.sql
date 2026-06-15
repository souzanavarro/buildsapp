-- Grant execute permission to authenticated users for the has_role function
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Simplify profiles update policy to avoid potential has_role permission issues during update
DROP POLICY IF EXISTS "Users can update own profile (restricted fields)" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile self-update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile during onboarding" ON public.profiles;

CREATE POLICY "Profiles update policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure everyone can execute necessary functions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
