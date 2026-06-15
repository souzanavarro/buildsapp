-- Remover políticas antigas de rotas que usavam company_id
DROP POLICY IF EXISTS "View company routes or assigned driver" ON public.routes;
DROP POLICY IF EXISTS "Insert routes for own company" ON public.routes;
DROP POLICY IF EXISTS "Update company routes" ON public.routes;
DROP POLICY IF EXISTS "Delete company routes" ON public.routes;
DROP POLICY IF EXISTS "Admins can view all routes" ON public.routes;
DROP POLICY IF EXISTS "Users can view their own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can create their own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can update their own routes" ON public.routes;

-- Criar novas políticas estritas para rotas
CREATE POLICY "Users can view own routes" ON public.routes
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = driver_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own routes" ON public.routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes" ON public.routes
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own routes" ON public.routes
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Ajustar políticas de entregas (deliveries)
DROP POLICY IF EXISTS "View deliveries via route" ON public.deliveries;
DROP POLICY IF EXISTS "Manage deliveries via route" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries of their routes" ON public.deliveries;
DROP POLICY IF EXISTS "Users can manage deliveries of their routes" ON public.deliveries;

CREATE POLICY "Users can view own deliveries" ON public.deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes 
      WHERE routes.id = deliveries.route_id 
      AND (routes.user_id = auth.uid() OR routes.driver_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can manage own deliveries" ON public.deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.routes 
      WHERE routes.id = deliveries.route_id 
      AND (routes.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Ajustar políticas de uploads (route_uploads)
DROP POLICY IF EXISTS "View uploads via route" ON public.route_uploads;
DROP POLICY IF EXISTS "Insert uploads via route" ON public.route_uploads;

CREATE POLICY "Users can view own uploads" ON public.route_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes 
      WHERE routes.id = route_uploads.route_id 
      AND (routes.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert own uploads" ON public.route_uploads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routes 
      WHERE routes.id = route_uploads.route_id 
      AND (routes.user_id = auth.uid())
    )
  );
