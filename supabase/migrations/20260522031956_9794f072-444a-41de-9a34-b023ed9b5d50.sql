-- Update handle_new_user function to include trial expiration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles with 3-day trial
  INSERT INTO public.profiles (user_id, email, full_name, role, expires_at, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'subscriber',
    (CURRENT_DATE + INTERVAL '3 days')::DATE,
    true
  );

  -- Insert into user_roles as subscriber
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'subscriber');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users without an expiration date to have a 3-day trial from today
UPDATE public.profiles 
SET expires_at = (CURRENT_DATE + INTERVAL '3 days')::DATE,
    active = true,
    role = 'subscriber'
WHERE expires_at IS NULL;

-- Ensure existing users have the subscriber role in user_roles if they don't
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'subscriber'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'subscriber'
);
