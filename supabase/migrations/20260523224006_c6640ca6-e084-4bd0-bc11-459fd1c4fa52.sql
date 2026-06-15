-- Allow users to update their own profile company_id during setup
CREATE POLICY "Users can update their own profile during onboarding"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);