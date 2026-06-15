-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'subscriber', 'driver');
CREATE TYPE public.subscription_status AS ENUM ('active', 'overdue', 'cancelled', 'pending');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'failed', 'refunded');
CREATE TYPE public.route_status AS ENUM ('draft', 'planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.optimization_mode AS ENUM ('original', 'shortest_distance', 'fastest_time');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'in_route', 'delivered', 'problem', 'rescheduled', 'returned', 'cancelled');

-- ============ HELPER: updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES (separate for security) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company for the user
  INSERT INTO public.companies (name, owner_user_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.id)
  RETURNING id INTO new_company_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email, phone, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    new_company_id
  );

  -- Default role: subscriber
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'subscriber');

  -- Pending subscription
  INSERT INTO public.subscriptions (company_id, plan_name, price, status, next_due_date)
  VALUES (new_company_id, 'Plano Mensal', 20.00, 'pending', (now() + interval '7 days')::date);

  RETURN NEW;
END;
$$;

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Plano Mensal',
  price NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  status public.subscription_status NOT NULL DEFAULT 'pending',
  payment_gateway TEXT,
  payment_method TEXT,
  next_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_subs_company ON public.subscriptions(company_id);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  gateway_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_sub ON public.payments(subscription_id);

-- ============ ROUTES ============
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  source_file_name TEXT,
  route_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.route_status NOT NULL DEFAULT 'draft',
  optimization_mode public.optimization_mode NOT NULL DEFAULT 'original',
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  total_distance NUMERIC(10,2),
  estimated_duration INTEGER,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_routes_company ON public.routes(company_id);
CREATE INDEX idx_routes_driver ON public.routes(driver_id);

-- ============ ROUTE UPLOADS ============
CREATE TABLE public.route_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  file_url TEXT,
  original_file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.route_uploads ENABLE ROW LEVEL SECURITY;

-- ============ DELIVERIES ============
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  at_id TEXT,
  sequence INTEGER,
  stop INTEGER,
  spx_tn TEXT,
  destination_address TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT,
  zipcode TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status public.delivery_status NOT NULL DEFAULT 'pending',
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_at TIMESTAMPTZ,
  problem_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deliveries_route ON public.deliveries(route_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);

-- ============ DELIVERY EVENTS ============
CREATE TABLE public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_devents_delivery ON public.delivery_events(delivery_id);

-- ============ TELEMETRY ============
CREATE TABLE public.telemetry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  driver_id UUID,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed NUMERIC(6,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telemetry_points ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tele_route ON public.telemetry_points(route_id);

-- ============ PROOF OF DELIVERY ============
CREATE TABLE public.proof_of_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  photo_url TEXT,
  signature_url TEXT,
  receiver_name TEXT,
  document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proof_of_delivery ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- companies
CREATE POLICY "Users see own company" ON public.companies FOR SELECT
  USING (id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners update own company" ON public.companies FOR UPDATE
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins all companies" ON public.companies FOR ALL
  USING (public.has_role(auth.uid(),'admin'));

-- profiles
CREATE POLICY "Profiles viewable by self or company members or admin" ON public.profiles FOR SELECT
  USING (user_id = auth.uid() OR company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- subscriptions
CREATE POLICY "View own subscription" ON public.subscriptions FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage subs" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- payments
CREATE POLICY "View own payments" ON public.payments FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.company_id = public.get_user_company(auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- routes
CREATE POLICY "View company routes or assigned driver" ON public.routes FOR SELECT
  USING (
    company_id = public.get_user_company(auth.uid())
    OR driver_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "Insert routes for own company" ON public.routes FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Update company routes" ON public.routes FOR UPDATE
  USING (company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete company routes" ON public.routes FOR DELETE
  USING (company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- route_uploads
CREATE POLICY "View uploads via route" ON public.route_uploads FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.routes r WHERE r.id = route_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Insert uploads via route" ON public.route_uploads FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.routes r WHERE r.id = route_id AND r.company_id = public.get_user_company(auth.uid()))
  );

-- deliveries
CREATE POLICY "View deliveries via route" ON public.deliveries FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.routes r WHERE r.id = route_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Manage deliveries via route" ON public.deliveries FOR ALL
  USING (
    EXISTS(SELECT 1 FROM public.routes r WHERE r.id = route_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

-- delivery_events
CREATE POLICY "View events via delivery" ON public.delivery_events FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.deliveries d JOIN public.routes r ON r.id = d.route_id
      WHERE d.id = delivery_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Insert events via delivery" ON public.delivery_events FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.deliveries d JOIN public.routes r ON r.id = d.route_id
      WHERE d.id = delivery_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid()))
  );

-- telemetry
CREATE POLICY "View telemetry via route" ON public.telemetry_points FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.routes r WHERE r.id = route_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Insert telemetry by driver" ON public.telemetry_points FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- proof_of_delivery
CREATE POLICY "View proof via delivery" ON public.proof_of_delivery FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM public.deliveries d JOIN public.routes r ON r.id = d.route_id
      WHERE d.id = delivery_id
      AND (r.company_id = public.get_user_company(auth.uid()) OR r.driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Insert proof via delivery" ON public.proof_of_delivery FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.deliveries d JOIN public.routes r ON r.id = d.route_id
      WHERE d.id = delivery_id AND r.driver_id = auth.uid())
  );

-- audit logs (admin only)
CREATE POLICY "Admins view audit" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert audit" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AUTH TRIGGER ============
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('route-files', 'route-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true);

CREATE POLICY "Authenticated upload route files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'route-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Read own route files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'route-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');
CREATE POLICY "Drivers upload proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-proofs');