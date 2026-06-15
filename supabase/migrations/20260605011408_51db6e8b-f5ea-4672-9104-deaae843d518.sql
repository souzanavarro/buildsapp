-- Disable the specific security trigger
ALTER TABLE profiles DISABLE TRIGGER prevent_profile_privilege_escalation_trg;

-- Update the profile role directly
UPDATE profiles SET role = 'admin' WHERE email = 'o.souzanavarro@gmail.com';

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER prevent_profile_privilege_escalation_trg;

-- Ensure the user has the admin role in user_roles as well
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'admin' 
FROM profiles 
WHERE email = 'o.souzanavarro@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure they have the subscriber role
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'subscriber' 
FROM profiles 
WHERE email = 'o.souzanavarro@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;