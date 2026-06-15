
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  destination_address TEXT NOT NULL,
  address_key TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT,
  category TEXT NOT NULL,
  note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_notes_address_key ON public.customer_notes(address_key);
CREATE INDEX idx_customer_notes_created_at ON public.customer_notes(created_at DESC);

GRANT SELECT, INSERT ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all customer notes"
  ON public.customer_notes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customer notes"
  ON public.customer_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can delete customer notes"
  ON public.customer_notes FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
