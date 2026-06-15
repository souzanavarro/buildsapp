-- Adicionar coluna de role se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Garantir que o usuário específico seja admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'o.souzanavarro@gmail.com';

-- Políticas de RLS para administradores
-- Nota: Como o sistema usa RLS baseado em user_id/company_id, precisamos garantir que admins passem por cima disso.

-- Exemplo para a tabela profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Exemplo para a tabela companies
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
CREATE POLICY "Admins can view all companies" 
ON public.companies 
FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Exemplo para a tabela routes
DROP POLICY IF EXISTS "Admins can view all routes" ON public.routes;
CREATE POLICY "Admins can view all routes" 
ON public.routes 
FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);
