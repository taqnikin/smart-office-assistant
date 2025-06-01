-- Smart Office Assistant - Disable RLS for Development
-- TEMPORARY FIX: This disables RLS to allow mock users to work
-- WARNING: This should NOT be used in production!

-- Disable RLS on all tables for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots DISABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users for development
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Also grant to anon for easier testing (DEVELOPMENT ONLY!)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
