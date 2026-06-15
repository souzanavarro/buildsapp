-- Ensure authenticated users can create a company for themselves
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Authenticated users can create company'
    ) THEN
        CREATE POLICY "Authenticated users can create company"
        ON public.companies
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = owner_user_id);
    END IF;
END $$;

-- Ensure users can update their own profile (specifically for company_id and other setup fields)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Allow profile self-update'
    ) THEN
        CREATE POLICY "Allow profile self-update"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
