-- Smart Office Assistant - Seed Data
-- This migration populates the database with initial data

-- Insert sample rooms
INSERT INTO public.rooms (name, floor, capacity, has_av, has_whiteboard, has_teleconference, description) VALUES
('Falcon', '3rd', 8, true, true, true, 'Modern conference room with full AV setup and video conferencing capabilities'),
('Eagle', '2nd', 12, true, true, true, 'Large meeting room perfect for team meetings and presentations'),
('Hawk', '2nd', 6, true, false, false, 'Compact meeting room with AV equipment for small team discussions'),
('Sparrow', '1st', 4, false, true, false, 'Small huddle room with whiteboard for quick brainstorming sessions'),
('Condor', '4th', 20, true, true, true, 'Executive boardroom with premium AV and teleconference facilities'),
('Robin', '1st', 6, true, true, false, 'Mid-size meeting room with AV and whiteboard'),
('Owl', '3rd', 10, true, true, true, 'Versatile conference room with full meeting capabilities'),
('Raven', '4th', 15, true, true, true, 'Large presentation room with advanced AV systems');

-- Insert car parking spots (1-50)
INSERT INTO public.parking_spots (spot_number, spot_type, floor, section)
SELECT 
  generate_series(1, 50) as spot_number,
  'car' as spot_type,
  'Ground' as floor,
  CASE 
    WHEN generate_series(1, 50) <= 25 THEN 'A'
    ELSE 'B'
  END as section;

-- Insert bike parking spots (1-40)
INSERT INTO public.parking_spots (spot_number, spot_type, floor, section)
SELECT 
  generate_series(1, 40) as spot_number,
  'bike' as spot_type,
  'Ground' as floor,
  CASE 
    WHEN generate_series(1, 40) <= 20 THEN 'C'
    ELSE 'D'
  END as section;

-- Insert system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
('office_hours_start', '08:00', 'string', 'Office opening time'),
('office_hours_end', '18:00', 'string', 'Office closing time'),
('max_booking_duration', '8', 'number', 'Maximum room booking duration in hours'),
('advance_booking_days', '30', 'number', 'How many days in advance bookings are allowed'),
('parking_reservation_hours', '24', 'number', 'How many hours in advance parking can be reserved'),
('attendance_grace_period', '15', 'number', 'Grace period for late check-in in minutes'),
('notification_enabled', 'true', 'boolean', 'Enable push notifications'),
('maintenance_mode', 'false', 'boolean', 'System maintenance mode'),
('max_concurrent_bookings', '3', 'number', 'Maximum concurrent room bookings per user'),
('parking_auto_release', '2', 'number', 'Auto-release unused parking spots after hours'),
('chatbot_enabled', 'true', 'boolean', 'Enable AI chatbot functionality'),
('location_tracking', 'false', 'boolean', 'Enable location-based attendance tracking');

-- Insert sample admin user (this would typically be done through the auth system)
-- Note: In production, this should be handled through Supabase Auth
INSERT INTO public.users (id, email, role, is_first_time_user) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@smartoffice.com', 'admin', false),
('00000000-0000-0000-0000-000000000002', 'user@smartoffice.com', 'user', false);

-- Insert employee details for sample users
INSERT INTO public.employee_details (user_id, full_name, employee_id, date_of_joining, work_hours, work_mode, department, position, phone_number, location) VALUES
('00000000-0000-0000-0000-000000000001', 'System Administrator', 'ADMIN001', '2023-01-01', '8:30 AM - 4:30 PM', 'in-office', 'IT Operations', 'System Administrator', '+1 (555) 123-4567', 'Headquarters'),
('00000000-0000-0000-0000-000000000002', 'Alex Johnson', 'EMP12345', '2022-01-15', '9:00 AM - 5:00 PM', 'hybrid', 'Engineering', 'Senior Software Developer', '+1 (555) 987-6543', 'San Francisco Office');

-- Insert user preferences for sample users
INSERT INTO public.user_preferences (user_id, vehicle_type, vehicle_registration, checkin_reminder, checkin_reminder_time, occupancy_reminder, occupancy_threshold) VALUES
('00000000-0000-0000-0000-000000000001', 'Car', 'ADMIN123', true, 30, true, 80),
('00000000-0000-0000-0000-000000000002', 'Car', 'USER456', true, 15, true, 75);

-- Insert sample room bookings (for demonstration)
INSERT INTO public.room_bookings (user_id, room_id, booking_date, start_time, end_time, duration_hours, purpose, status) VALUES
('00000000-0000-0000-0000-000000000002', 
 (SELECT id FROM public.rooms WHERE name = 'Falcon' LIMIT 1), 
 CURRENT_DATE + INTERVAL '1 day', 
 '10:00:00', 
 '11:00:00', 
 1, 
 'Team standup meeting', 
 'confirmed'),
('00000000-0000-0000-0000-000000000002', 
 (SELECT id FROM public.rooms WHERE name = 'Eagle' LIMIT 1), 
 CURRENT_DATE + INTERVAL '2 days', 
 '14:00:00', 
 '16:00:00', 
 2, 
 'Client presentation', 
 'confirmed');

-- Insert sample parking reservations
INSERT INTO public.parking_reservations (user_id, parking_spot_id, reservation_date, status) VALUES
('00000000-0000-0000-0000-000000000001',
 (SELECT id FROM public.parking_spots WHERE spot_type = 'car' AND spot_number = 1 LIMIT 1),
 CURRENT_DATE,
 'active'),
('00000000-0000-0000-0000-000000000002',
 (SELECT id FROM public.parking_spots WHERE spot_type = 'car' AND spot_number = 42 LIMIT 1),
 CURRENT_DATE,
 'active');

-- Insert sample attendance records
INSERT INTO public.attendance_records (user_id, attendance_date, status, check_in_time, check_out_time, transport_mode) VALUES
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day', 'office', '08:30:00', '16:30:00', 'car'),
('00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '1 day', 'office', '09:15:00', '17:45:00', 'car'),
('00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days', 'office', '08:45:00', '16:15:00', 'car'),
('00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days', 'wfh', '09:05:00', '18:10:00', null),
('00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '3 days', 'leave', null, null, null);

-- Insert sample chat messages
INSERT INTO public.chat_messages (user_id, message_text, is_bot_message, intent) VALUES
('00000000-0000-0000-0000-000000000002', 'Hello, I need to book a meeting room', false, null),
('00000000-0000-0000-0000-000000000002', 'I can help you book a meeting room. What date and time do you need?', true, 'room_booking'),
('00000000-0000-0000-0000-000000000002', 'Tomorrow at 2 PM for 1 hour', false, null),
('00000000-0000-0000-0000-000000000002', 'I found several available rooms for tomorrow at 2 PM. Would you like to see the options?', true, 'room_booking');

-- Create views for common queries
CREATE OR REPLACE VIEW public.room_availability AS
SELECT 
  r.id,
  r.name,
  r.floor,
  r.capacity,
  r.has_av,
  r.has_whiteboard,
  r.has_teleconference,
  COALESCE(booking_count.count, 0) as current_bookings
FROM public.rooms r
LEFT JOIN (
  SELECT 
    room_id, 
    COUNT(*) as count
  FROM public.room_bookings 
  WHERE booking_date = CURRENT_DATE 
    AND status = 'confirmed'
  GROUP BY room_id
) booking_count ON r.id = booking_count.room_id
WHERE r.is_active = true;

CREATE OR REPLACE VIEW public.parking_availability AS
SELECT 
  spot_type,
  COUNT(*) as total_spots,
  COUNT(*) - COALESCE(reserved_count.count, 0) as available_spots,
  COALESCE(reserved_count.count, 0) as reserved_spots
FROM public.parking_spots ps
LEFT JOIN (
  SELECT 
    ps.spot_type,
    COUNT(*) as count
  FROM public.parking_reservations pr
  JOIN public.parking_spots ps ON pr.parking_spot_id = ps.id
  WHERE pr.reservation_date = CURRENT_DATE 
    AND pr.status = 'active'
  GROUP BY ps.spot_type
) reserved_count ON ps.spot_type = reserved_count.spot_type
WHERE ps.is_active = true
GROUP BY ps.spot_type, reserved_count.count;

CREATE OR REPLACE VIEW public.daily_attendance_summary AS
SELECT 
  attendance_date,
  COUNT(*) as total_employees,
  COUNT(CASE WHEN status = 'office' THEN 1 END) as in_office,
  COUNT(CASE WHEN status = 'wfh' THEN 1 END) as work_from_home,
  COUNT(CASE WHEN status = 'leave' THEN 1 END) as on_leave
FROM public.attendance_records
GROUP BY attendance_date
ORDER BY attendance_date DESC;
