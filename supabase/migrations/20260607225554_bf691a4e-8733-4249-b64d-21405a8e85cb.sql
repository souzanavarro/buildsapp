-- Vehicle Maintenance
CREATE TABLE public.vehicle_maintenance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id),
    odometer INTEGER NOT NULL,
    fuel_level DECIMAL(3,2), -- 0.0 to 1.0
    alerts TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist
CREATE TABLE public.route_checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id TEXT NOT NULL,
    driver_id UUID NOT NULL REFERENCES auth.users(id),
    items JSONB NOT NULL, -- e.g. {"tires": true, "oil": true, "cargo": true}
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.delivery_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    document_url TEXT NOT NULL,
    document_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.delivery_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid'
    method TEXT, -- 'pix', 'card'
    pix_qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can manage their maintenance logs" ON public.vehicle_maintenance FOR ALL USING (auth.uid() = driver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_checklists TO authenticated;
GRANT ALL ON public.route_checklists TO service_role;
ALTER TABLE public.route_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can manage their checklists" ON public.route_checklists FOR ALL USING (auth.uid() = driver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_documents TO authenticated;
GRANT ALL ON public.delivery_documents TO service_role;
ALTER TABLE public.delivery_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can view/add documents" ON public.delivery_documents FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_payments TO authenticated;
GRANT ALL ON public.delivery_payments TO service_role;
ALTER TABLE public.delivery_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can manage payments" ON public.delivery_payments FOR ALL USING (true);