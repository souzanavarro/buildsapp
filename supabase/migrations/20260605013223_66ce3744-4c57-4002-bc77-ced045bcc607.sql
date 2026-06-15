-- Create table for role-based permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role, permission_text)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Everyone authenticated can view role permissions" ON public.role_permissions
    FOR SELECT TO authenticated
    USING (true);

-- Insert default permissions for admin
INSERT INTO public.role_permissions (role, permission_text) VALUES 
('admin', 'dashboard'),
('admin', 'analytics'),
('admin', 'upload'),
('admin', 'routes'),
('admin', 'map'),
('admin', 'fleet'),
('admin', 'customers'),
('admin', 'finance'),
('admin', 'admin'),
('admin', 'builds')
ON CONFLICT DO NOTHING;

-- Insert default permissions for subscriber
INSERT INTO public.role_permissions (role, permission_text) VALUES 
('subscriber', 'dashboard'),
('subscriber', 'analytics'),
('subscriber', 'upload'),
('subscriber', 'routes'),
('subscriber', 'map'),
('subscriber', 'finance')
ON CONFLICT DO NOTHING;

-- Insert default permissions for driver
INSERT INTO public.role_permissions (role, permission_text) VALUES 
('driver', 'dashboard'),
('driver', 'routes'),
('driver', 'builds')
ON CONFLICT DO NOTHING;