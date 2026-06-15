-- 1. Restringir acesso a funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM public, authenticated;

-- 2. Adicionar índices ausentes para performance e RLS
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_uploads_route_id ON public.route_uploads(route_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_delivery_id ON public.proof_of_delivery(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON public.delivery_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_points_route_id ON public.telemetry_points(route_id);

-- 3. Garantir updated_at automático em todas as tabelas
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar gatilho em tabelas que possuem a coluna updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
    END LOOP;
END;
$$;

-- 4. Corrigir políticas de Storage (Segurança Crítica)
-- Remover política de acesso público
DROP POLICY IF EXISTS "Public Access for Proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Proofs" ON storage.objects;

-- Nova política de SELECT para proofs: Apenas driver da rota ou admin ou empresa dona da rota
CREATE POLICY "Secure view delivery proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-proofs' AND (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.routes r ON r.id = d.route_id
      WHERE (d.id)::text = (storage.foldername(name))[1]
      AND (r.driver_id = auth.uid() OR r.company_id = get_user_company(auth.uid()) OR has_role(auth.uid(), 'admin'))
    )
  )
);

-- Nova política de INSERT para proofs: Apenas motorista designado
CREATE POLICY "Secure insert delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-proofs' AND (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.routes r ON r.id = d.route_id
      WHERE (d.id)::text = (storage.foldername(name))[1]
      AND r.driver_id = auth.uid()
    )
  )
);

-- 5. Otimizar política de atualização de perfil (evitar subqueries complexas)
DROP POLICY IF EXISTS "Users can update own profile (no role change)" ON public.profiles;
CREATE POLICY "Users can update own profile (restricted fields)"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Impede alteração de campos sensíveis por usuários comuns
  (
    has_role(auth.uid(), 'admin') OR (
      role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) AND
      active = (SELECT active FROM public.profiles WHERE user_id = auth.uid()) AND
      expires_at = (SELECT expires_at FROM public.profiles WHERE user_id = auth.uid()) AND
      company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);
