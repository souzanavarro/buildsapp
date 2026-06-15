-- Driver Journey Tracking
CREATE TABLE public.driver_journey (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL, -- 'driving', 'resting', 'stopped'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Returns Management
CREATE TABLE public.delivery_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gamification
CREATE TABLE public.driver_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    points INTEGER DEFAULT 0,
    efficiency_score DECIMAL(5,2) DEFAULT 0.0,
    deliveries_on_time INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training
CREATE TABLE public.training_videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER,
    required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Emergency
CREATE TABLE public.emergency_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES auth.users(id),
    location_lat DECIMAL(10,8),
    location_long DECIMAL(11,8),
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_journey TO authenticated;
GRANT ALL ON public.driver_journey TO service_role;
ALTER TABLE public.driver_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers manage their journey" ON public.driver_journey FOR ALL USING (auth.uid() = driver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_returns TO authenticated;
GRANT ALL ON public.delivery_returns TO service_role;
ALTER TABLE public.delivery_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers report returns" ON public.delivery_returns FOR ALL USING (true);

GRANT SELECT ON public.driver_stats TO authenticated;
GRANT ALL ON public.driver_stats TO service_role;
ALTER TABLE public.driver_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers view their stats" ON public.driver_stats FOR SELECT USING (true);

GRANT SELECT ON public.training_videos TO authenticated;
GRANT ALL ON public.training_videos TO service_role;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views trainings" ON public.training_videos FOR SELECT USING (true);

GRANT SELECT, INSERT ON public.emergency_alerts TO authenticated;
GRANT ALL ON public.emergency_alerts TO service_role;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers trigger panic" ON public.emergency_alerts FOR INSERT WITH CHECK (auth.uid() = driver_id);