-- Smart Office Assistant - Create Demo Users in Supabase Auth
-- This script creates real users in Supabase auth system that match our mock users

-- Note: These INSERT statements need to be run in the Supabase SQL editor
-- as they require admin privileges to insert into auth.users

-- First, let's create the demo users in the auth.users table
-- These will be real authenticated users that work with RLS

-- Demo User 1: Regular Employee
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'demo@smartoffice.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "user"}',
  false,
  'authenticated'
);

-- Demo User 2: Admin User
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@smartoffice.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "admin"}',
  false,
  'authenticated'
);

-- Now create corresponding records in our users table
INSERT INTO users (id, email, role, is_first_time_user) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'demo@smartoffice.com', 'user', false),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'admin@smartoffice.com', 'admin', false);

-- Create employee details for the demo users
INSERT INTO employee_details (
  user_id,
  full_name,
  employee_id,
  department,
  position,
  phone_number,
  date_of_joining,
  work_hours,
  work_mode
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Alex Johnson',
    'EMP12345',
    'Engineering',
    'Senior Software Developer',
    '+1 (555) 987-6543',
    '2022-01-15',
    '9-5',
    'in-office'
  ),
  (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Admin User',
    'ADMIN001',
    'IT Operations',
    'System Administrator',
    '+1 (555) 123-4567',
    '2020-01-01',
    '9-5',
    'in-office'
  );

-- Create user preferences for the demo users
INSERT INTO user_preferences (
  user_id,
  theme,
  notifications_enabled,
  language,
  timezone,
  work_hours_start,
  work_hours_end,
  preferred_transport_mode
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'light',
    true,
    'en',
    'America/New_York',
    '09:00',
    '17:00',
    'car'
  ),
  (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'light',
    true,
    'en',
    'America/New_York',
    '09:00',
    '17:00',
    'car'
  );

-- Re-enable RLS with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Apply the comprehensive RLS policies from fix-rls-policies.sql
-- (The policies from the previous file should be applied after this)
