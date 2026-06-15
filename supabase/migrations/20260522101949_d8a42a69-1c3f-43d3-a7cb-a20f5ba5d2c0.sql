-- Tabela para telemetria de motoristas
CREATE TABLE public.driver_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.driver_telemetry ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Motoristas podem inserir sua própria telemetria"
ON public.driver_telemetry
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Motoristas podem ver sua própria telemetria"
ON public.driver_telemetry
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver toda a telemetria"
ON public.driver_telemetry
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Índice para performance
CREATE INDEX idx_driver_telemetry_user_id ON public.driver_telemetry(user_id);
CREATE INDEX idx_driver_telemetry_created_at ON public.driver_telemetry(created_at DESC);
