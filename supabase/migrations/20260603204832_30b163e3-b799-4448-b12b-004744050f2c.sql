-- 1. Fila de Sincronização Offline
CREATE TABLE public.sync_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'delivery_update', 'telemetry', 'photo_upload'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_queue TO authenticated;
GRANT ALL ON public.sync_queue TO service_role;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sync queue" ON public.sync_queue FOR ALL USING (auth.uid() = user_id);

-- 2. Controle de Manutenção
CREATE TABLE public.maintenance_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    odometer_reading NUMERIC NOT NULL,
    cost NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own maintenance" ON public.maintenance_records FOR ALL USING (auth.uid() = user_id);

-- 3. Extensões no Perfil para Alertas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS maintenance_alert_interval_km INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS last_maintenance_odometer NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS public_tracking_enabled BOOLEAN DEFAULT true;

-- 4. Função para Token de Rastreio Seguro (evita expor IDs sequenciais)
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS tracking_token TEXT DEFAULT encode(gen_random_bytes(12), 'hex');

-- 5. Trigger para atualizar Updated At (reutilizando função existente se houver)
CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON public.sync_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
