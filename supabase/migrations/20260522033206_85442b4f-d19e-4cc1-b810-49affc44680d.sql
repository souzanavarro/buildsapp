-- Ensure there is a policy allowing users to create their own company
DROP POLICY IF EXISTS "Users can create their own company" ON public.companies;

CREATE POLICY "Users can create their own company" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Ensure users can also view companies they own if they are not yet linked via profile
DROP POLICY IF EXISTS "Users see own company" ON public.companies;
CREATE POLICY "Users see own company" ON public.companies
  FOR SELECT USING (
    (id = get_user_company(auth.uid())) OR 
    (owner_user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );
