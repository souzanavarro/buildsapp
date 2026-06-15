-- Adicionar campo active e expires_at à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at DATE;

-- Garantir que usuários existentes tenham expires_at se necessário ou apenas permitir nulo para ilimitado
-- Por padrão, vamos deixar nulo (sem expiração forçada inicial) ou podemos definir uma data futura.

-- Criar política para impedir acesso de usuários inativos (opcional, dependendo de como o auth é tratado)
-- Nota: RLS no profiles afeta leitura/escrita. O bloqueio de login real deve ser via Auth Hooks ou na lógica da aplicação.

-- Atualizar políticas existentes se necessário
-- (Assumindo que já existem políticas, vamos apenas adicionar os campos)
