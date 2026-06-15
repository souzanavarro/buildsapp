-- Remove políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self or company members or admin" ON public.profiles;

-- Cria nova política de visualização sem recursão
CREATE POLICY "Profiles are viewable by self or admin" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'role' = 'service_role') -- Permite service role
  OR 
  has_role(auth.uid(), 'admin'::app_role) -- Usa a função de role que checa auth.users ou metadados
);

-- Garante que existe apenas uma política de inserção limpa
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Simplifica política de update
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
