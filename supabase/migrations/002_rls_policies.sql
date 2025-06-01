-- Smart Office Assistant - Row Level Security Policies
-- This migration sets up RLS policies for data access control

-- Enable RLS on all user-specific tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read access for rooms and parking spots (no RLS needed)
-- System settings will have admin-only access

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID from auth
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Employee details policies
CREATE POLICY "Users can view own employee details" ON public.employee_details
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own employee details" ON public.employee_details
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own employee details" ON public.employee_details
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all employee details" ON public.employee_details
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all employee details" ON public.employee_details
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences" ON public.user_preferences
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Room bookings policies
CREATE POLICY "Users can view own bookings" ON public.room_bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings" ON public.room_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON public.room_bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own bookings" ON public.room_bookings
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" ON public.room_bookings
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all bookings" ON public.room_bookings
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete all bookings" ON public.room_bookings
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Parking reservations policies
CREATE POLICY "Users can view own parking reservations" ON public.parking_reservations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own parking reservations" ON public.parking_reservations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own parking reservations" ON public.parking_reservations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own parking reservations" ON public.parking_reservations
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all parking reservations" ON public.parking_reservations
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all parking reservations" ON public.parking_reservations
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Attendance records policies
CREATE POLICY "Users can view own attendance" ON public.attendance_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own attendance" ON public.attendance_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attendance" ON public.attendance_records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attendance" ON public.attendance_records
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all attendance" ON public.attendance_records
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Chat messages policies
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all chat messages" ON public.chat_messages
  FOR SELECT USING (public.is_admin(auth.uid()));

-- System settings policies (admin only)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view system settings" ON public.system_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update system settings" ON public.system_settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert system settings" ON public.system_settings
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete system settings" ON public.system_settings
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Public read access for rooms and parking spots (no authentication required)
-- These are needed for the booking interfaces

-- Grant public access to rooms
GRANT SELECT ON public.rooms TO anon, authenticated;

-- Grant public access to parking spots
GRANT SELECT ON public.parking_spots TO anon, authenticated;

-- Grant authenticated users access to their own data
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.employee_details TO authenticated;
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.room_bookings TO authenticated;
GRANT ALL ON public.parking_reservations TO authenticated;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;

-- Grant admin access to system settings
GRANT ALL ON public.system_settings TO authenticated;
