-- Multiple photos support for deliveries
CREATE TABLE public.delivery_photos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    photo_type TEXT, -- e.g., 'receipt', 'location'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat/Messages table
CREATE TABLE public.delivery_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_photos TO authenticated;
GRANT ALL ON public.delivery_photos TO service_role;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage photos for their deliveries" ON public.delivery_photos FOR ALL USING (true); -- Simplified for now

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_messages TO authenticated;
GRANT ALL ON public.delivery_messages TO service_role;
ALTER TABLE public.delivery_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages for their deliveries" ON public.delivery_messages FOR ALL USING (auth.uid() = sender_id);