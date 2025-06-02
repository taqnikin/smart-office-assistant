-- Production Seed Data for Smart Office Assistant
-- This file contains production-ready seed data with minimal demo accounts

-- Insert rooms (production-ready)
INSERT INTO public.rooms (name, floor, capacity, has_av, has_whiteboard, has_teleconference, is_active) VALUES
('Conference Room A', 1, 8, true, true, true, true),
('Conference Room B', 1, 12, true, true, true, true),
('Meeting Room 1', 2, 4, false, true, false, true),
('Meeting Room 2', 2, 6, true, true, true, true),
('Board Room', 3, 16, true, true, true, true),
('Training Room', 2, 20, true, true, true, true),
('Phone Booth 1', 1, 1, false, false, false, true),
('Phone Booth 2', 1, 1, false, false, false, true);

-- Insert parking spots (production layout - adjust numbers as needed)
INSERT INTO public.parking_spots (spot_number, spot_type, floor, is_active) VALUES
-- Car parking spots (adjust total count based on actual parking layout)
(1, 'car', 'B1', true),
(2, 'car', 'B1', true),
(3, 'car', 'B1', true),
(4, 'car', 'B1', true),
(5, 'car', 'B1', true),
(6, 'car', 'B1', true),
(7, 'car', 'B1', true),
(8, 'car', 'B1', true),
(9, 'car', 'B1', true),
(10, 'car', 'B1', true),
-- Bike parking spots
(101, 'bike', 'Ground', true),
(102, 'bike', 'Ground', true),
(103, 'bike', 'Ground', true),
(104, 'bike', 'Ground', true),
(105, 'bike', 'Ground', true);

-- Insert system settings (production values)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
('max_booking_hours', '8', 'number', 'Maximum hours for a single room booking'),
('advance_booking_days', '30', 'number', 'Maximum days in advance for room booking'),
('cancellation_hours', '2', 'number', 'Minimum hours before booking to allow cancellation'),
('max_concurrent_bookings', '3', 'number', 'Maximum concurrent room bookings per user'),
('parking_auto_release', '2', 'number', 'Auto-release unused parking spots after hours'),
('chatbot_enabled', 'true', 'boolean', 'Enable AI chatbot functionality'),
('location_tracking', 'false', 'boolean', 'Enable location-based attendance tracking'),
('office_hours_start', '08:00', 'string', 'Office opening time'),
('office_hours_end', '18:00', 'string', 'Office closing time'),
('weekend_access', 'false', 'boolean', 'Allow weekend office access'),
('notification_reminder_minutes', '15', 'number', 'Default reminder time for notifications'),
('max_room_capacity_override', 'false', 'boolean', 'Allow booking rooms over capacity');

-- PRODUCTION NOTE: Sample users for demo purposes only
-- In production, remove these or replace with actual admin accounts
-- These accounts should be created through proper Supabase Auth registration

-- NOTE: These user records are placeholders. In production, users should be created
-- through the Supabase Admin API using the seed script (scripts/seed-users.js)
-- The following data structure shows the expected format for reference:

-- Sample admin user (placeholder - create through Admin API)
INSERT INTO public.users (id, email, role, is_first_time_user) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@smartoffice.com', 'admin', false);

-- Sample regular users (placeholders - create through Admin API)
INSERT INTO public.users (id, email, role, is_first_time_user) VALUES
('00000000-0000-0000-0000-000000000002', 'sarah.johnson@smartoffice.com', 'user', false),
('00000000-0000-0000-0000-000000000003', 'michael.chen@smartoffice.com', 'user', false),
('00000000-0000-0000-0000-000000000004', 'emily.davis@smartoffice.com', 'user', false),
('00000000-0000-0000-0000-000000000005', 'david.wilson@smartoffice.com', 'user', false);

-- Employee details for all users
INSERT INTO public.employee_details (user_id, full_name, employee_id, date_of_joining, work_hours, work_mode, department, position, phone_number, location) VALUES
('00000000-0000-0000-0000-000000000001', 'System Administrator', 'ADMIN001', '2024-01-01', '8:00 AM - 5:00 PM', 'in-office', 'IT Operations', 'System Administrator', '+1 (555) 000-0001', 'Main Office'),
('00000000-0000-0000-0000-000000000002', 'Sarah Johnson', 'EMP001', '2023-03-15', '9:00 AM - 5:00 PM', 'hybrid', 'Human Resources', 'HR Manager', '+1 (555) 000-0002', 'Main Office'),
('00000000-0000-0000-0000-000000000003', 'Michael Chen', 'EMP002', '2023-06-01', '8:30 AM - 4:30 PM', 'in-office', 'Engineering', 'Senior Software Engineer', '+1 (555) 000-0003', 'Main Office'),
('00000000-0000-0000-0000-000000000004', 'Emily Davis', 'EMP003', '2023-09-10', '9:00 AM - 5:00 PM', 'wfh', 'Marketing', 'Marketing Specialist', '+1 (555) 000-0004', 'Remote'),
('00000000-0000-0000-0000-000000000005', 'David Wilson', 'EMP004', '2023-11-20', '8:00 AM - 4:00 PM', 'hybrid', 'Finance', 'Financial Analyst', '+1 (555) 000-0005', 'Main Office');

-- User preferences for all users
INSERT INTO public.user_preferences (user_id, vehicle_type, vehicle_registration, checkin_reminder, checkin_reminder_time, occupancy_reminder, occupancy_threshold) VALUES
('00000000-0000-0000-0000-000000000001', 'Car', 'ADMIN001', true, 30, true, 80),
('00000000-0000-0000-0000-000000000002', 'Car', 'HR001', true, 15, true, 75),
('00000000-0000-0000-0000-000000000003', 'Bike', 'ENG001', true, 30, false, 85),
('00000000-0000-0000-0000-000000000004', 'None', NULL, false, 60, true, 70),
('00000000-0000-0000-0000-000000000005', 'Car', 'FIN001', true, 45, true, 80);

-- Create views for common queries (production-ready)
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

-- Production deployment notes:
-- 1. Update room names and capacities to match actual office layout
-- 2. Update parking spot numbers and layout to match actual parking
-- 3. Replace sample admin account with actual admin credentials
-- 4. Adjust system settings based on company policies
-- 5. Remove or update sample data as needed
-- 6. Ensure all sensitive information is properly configured
