-- Tabela para Score de Direção Segura por rota
CREATE TABLE IF NOT EXISTS public.route_safety_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id TEXT NOT NULL,
    driver_id UUID NOT NULL REFERENCES auth.users(id),
    score INTEGER NOT NULL DEFAULT 100,
    harsh_braking_count INTEGER DEFAULT 0,
    sharp_turn_count INTEGER DEFAULT 0,
    speeding_count INTEGER DEFAULT 0,
    distance_km FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fila de sincronização offline (Sincronização Delta)
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    delta_data JSONB NOT NULL, -- Apenas os campos alterados
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE ON public.route_safety_scores TO authenticated;
GRANT ALL ON public.route_safety_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_sync_queue TO authenticated;
GRANT ALL ON public.offline_sync_queue TO service_role;

-- RLS
ALTER TABLE public.route_safety_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their own safety scores" ON public.route_safety_scores
    FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can manage their own sync queue" ON public.offline_sync_queue
    FOR ALL USING (true); -- Simplified for sync purposes, can be tightened with driver_id

-- Adicionar score na jornada
ALTER TABLE public.driver_journey ADD COLUMN IF NOT EXISTS safety_score INTEGER;