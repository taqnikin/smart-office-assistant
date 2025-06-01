-- Smart Office Assistant - Initial Database Schema Migration
-- This migration creates all the core tables and relationships

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_first_time_user BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Employee Details table
CREATE TABLE public.employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  date_of_joining DATE NOT NULL,
  work_hours VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
  work_mode VARCHAR(20) DEFAULT 'hybrid' CHECK (work_mode IN ('in-office', 'wfh', 'hybrid')),
  department VARCHAR(100),
  position VARCHAR(100),
  phone_number VARCHAR(20),
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('Car', 'Bike', 'None')),
  vehicle_registration VARCHAR(20),
  checkin_reminder BOOLEAN DEFAULT true,
  checkin_reminder_time INTEGER DEFAULT 30,
  occupancy_reminder BOOLEAN DEFAULT true,
  occupancy_threshold INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  capacity INTEGER NOT NULL,
  has_av BOOLEAN DEFAULT false,
  has_whiteboard BOOLEAN DEFAULT false,
  has_teleconference BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Room Bookings table
CREATE TABLE public.room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Parking Spots table
CREATE TABLE public.parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_number INTEGER NOT NULL,
  spot_type VARCHAR(10) NOT NULL CHECK (spot_type IN ('car', 'bike')),
  floor VARCHAR(10),
  section VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_number, spot_type)
);

-- 7. Parking Reservations table
CREATE TABLE public.parking_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  parking_spot_id UUID REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME DEFAULT '00:00:00',
  end_time TIME DEFAULT '23:59:59',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Attendance Records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('office', 'wfh', 'leave')),
  check_in_time TIME,
  check_out_time TIME,
  transport_mode VARCHAR(20) CHECK (transport_mode IN ('car', 'bike', 'public', 'walk')),
  leave_reason TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, attendance_date)
);

-- 9. Chat Messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_bot_message BOOLEAN DEFAULT false,
  intent VARCHAR(50),
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. System Settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for room booking overlaps
ALTER TABLE public.room_bookings 
ADD CONSTRAINT no_overlap EXCLUDE USING gist (
  room_id WITH =,
  tsrange(
    (booking_date + start_time)::timestamp,
    (booking_date + end_time)::timestamp
  ) WITH &&
) WHERE (status = 'confirmed');

-- Add constraint for unique parking reservations per user per day
CREATE UNIQUE INDEX idx_unique_parking_reservation 
ON public.parking_reservations(user_id, reservation_date) 
WHERE (status = 'active');

-- Performance indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_employee_details_employee_id ON public.employee_details(employee_id);
CREATE INDEX idx_room_bookings_date_room ON public.room_bookings(booking_date, room_id);
CREATE INDEX idx_room_bookings_user_date ON public.room_bookings(user_id, booking_date);
CREATE INDEX idx_parking_reservations_date ON public.parking_reservations(reservation_date);
CREATE INDEX idx_parking_reservations_user_date ON public.parking_reservations(user_id, reservation_date);
CREATE INDEX idx_attendance_records_user_date ON public.attendance_records(user_id, attendance_date);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(attendance_date);
CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_details_updated_at BEFORE UPDATE ON public.employee_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_spots_updated_at BEFORE UPDATE ON public.parking_spots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_reservations_updated_at BEFORE UPDATE ON public.parking_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
