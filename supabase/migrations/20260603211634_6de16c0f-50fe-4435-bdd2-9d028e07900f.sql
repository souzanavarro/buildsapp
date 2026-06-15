-- 1. Gamificação: Scores e Badges
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_rating NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

CREATE TABLE public.driver_daily_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    on_time_delivery_rate NUMERIC DEFAULT 0,
    success_rate NUMERIC DEFAULT 0,
    safety_points INTEGER DEFAULT 100,
    final_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_daily_scores TO authenticated;
GRANT ALL ON public.driver_daily_scores TO service_role;
ALTER TABLE public.driver_daily_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can view their own scores" ON public.driver_daily_scores FOR SELECT USING (auth.uid() = driver_id);

-- 2. Simulador de Custos: Extensões na tabela de Rotas
ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS fuel_price_at_time NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_consumption_kml NUMERIC DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS estimated_fuel_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_fuel_cost NUMERIC DEFAULT 0;

-- 3. Função para calcular lucro/custo da rota
CREATE OR REPLACE FUNCTION calculate_route_financials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_distance IS NOT NULL AND NEW.fuel_price_at_time > 0 THEN
    NEW.actual_fuel_cost := (NEW.total_distance / NULLIF(NEW.vehicle_consumption_kml, 0)) * NEW.fuel_price_at_time;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_route_financials
BEFORE UPDATE ON public.routes
FOR EACH ROW
WHEN (OLD.total_distance IS DISTINCT FROM NEW.total_distance OR OLD.fuel_price_at_time IS DISTINCT FROM NEW.fuel_price_at_time)
EXECUTE FUNCTION calculate_route_financials();
