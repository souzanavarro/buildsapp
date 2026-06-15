-- Política para permitir que usuários criem empresas (necessário para o setup inicial via app)
CREATE POLICY "Users can create their own company" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() = owner_user_id);

-- Garante que a política de perfil permite inserção para o próprio usuário
-- (Já parece existir uma 'Users insert own profile', mas vamos reforçar se necessário ou garantir que está ativa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
