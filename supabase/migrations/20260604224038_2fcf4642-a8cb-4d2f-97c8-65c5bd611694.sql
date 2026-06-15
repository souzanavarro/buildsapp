CREATE TABLE IF NOT EXISTS public.telegram_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_token TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.telegram_settings TO authenticated;
GRANT ALL ON public.telegram_settings TO service_role;

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage telegram settings" ON public.telegram_settings
    FOR ALL TO authenticated USING (true);

-- Insert initial values based on existing workflow
INSERT INTO public.telegram_settings (bot_token, chat_id)
VALUES ('8785024491:AAEIzLo_BUWHPBwD3KKZAW0eUaB0MIJTKeg', '526029871')
ON CONFLICT DO NOTHING;
