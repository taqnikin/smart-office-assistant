-- Smart Office Assistant - Fix RLS Policies
-- This script fixes the Row Level Security policies to allow proper CRUD operations

-- First, let's drop any existing policies that might be incomplete
DROP POLICY IF EXISTS "Users can view own room bookings" ON room_bookings;
DROP POLICY IF EXISTS "Users can create room bookings" ON room_bookings;
DROP POLICY IF EXISTS "Users can update own room bookings" ON room_bookings;
DROP POLICY IF EXISTS "Users can delete own room bookings" ON room_bookings;
DROP POLICY IF EXISTS "Admins can view all room bookings" ON room_bookings;
DROP POLICY IF EXISTS "Admins can manage all room bookings" ON room_bookings;

DROP POLICY IF EXISTS "Users can view own parking reservations" ON parking_reservations;
DROP POLICY IF EXISTS "Users can create parking reservations" ON parking_reservations;
DROP POLICY IF EXISTS "Users can update own parking reservations" ON parking_reservations;
DROP POLICY IF EXISTS "Users can delete own parking reservations" ON parking_reservations;

DROP POLICY IF EXISTS "Users can view own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can create attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can update own attendance records" ON attendance_records;

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ROOMS TABLE POLICIES (Public read access)
-- =============================================

-- All authenticated users can view rooms
CREATE POLICY "Authenticated users can view rooms" ON rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage rooms
CREATE POLICY "Admins can manage rooms" ON rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ROOM BOOKINGS POLICIES
-- =============================================

-- Users can view their own bookings
CREATE POLICY "Users can view own room bookings" ON room_bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create room bookings
CREATE POLICY "Users can create room bookings" ON room_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings
CREATE POLICY "Users can update own room bookings" ON room_bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own bookings
CREATE POLICY "Users can delete own room bookings" ON room_bookings
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all room bookings
CREATE POLICY "Admins can view all room bookings" ON room_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all room bookings
CREATE POLICY "Admins can manage all room bookings" ON room_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PARKING SPOTS POLICIES (Public read access)
-- =============================================

-- All authenticated users can view parking spots
CREATE POLICY "Authenticated users can view parking spots" ON parking_spots
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage parking spots
CREATE POLICY "Admins can manage parking spots" ON parking_spots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PARKING RESERVATIONS POLICIES
-- =============================================

-- Users can view their own parking reservations
CREATE POLICY "Users can view own parking reservations" ON parking_reservations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create parking reservations
CREATE POLICY "Users can create parking reservations" ON parking_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own parking reservations
CREATE POLICY "Users can update own parking reservations" ON parking_reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own parking reservations
CREATE POLICY "Users can delete own parking reservations" ON parking_reservations
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all parking reservations
CREATE POLICY "Admins can view all parking reservations" ON parking_reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ATTENDANCE RECORDS POLICIES
-- =============================================

-- Users can view their own attendance records
CREATE POLICY "Users can view own attendance records" ON attendance_records
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create attendance records
CREATE POLICY "Users can create attendance records" ON attendance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance records
CREATE POLICY "Users can update own attendance records" ON attendance_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all attendance records
CREATE POLICY "Admins can view all attendance records" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- EMPLOYEE DETAILS POLICIES
-- =============================================

-- Users can view their own employee details
CREATE POLICY "Users can view own employee details" ON employee_details
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own employee details
CREATE POLICY "Users can update own employee details" ON employee_details
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own employee details
CREATE POLICY "Users can create own employee details" ON employee_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all employee details
CREATE POLICY "Admins can view all employee details" ON employee_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- USER PREFERENCES POLICIES
-- =============================================

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CHAT MESSAGES POLICIES
-- =============================================

-- Users can view their own chat messages
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create chat messages
CREATE POLICY "Users can create chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all chat messages
CREATE POLICY "Admins can view all chat messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on auth schema
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure authenticated users can access all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
