-- Smart Office Assistant - Attendance Management System Enhancements
-- This migration adds comprehensive attendance features including:
-- - Multiple check-in verification methods (GPS, WiFi, QR codes)
-- - Work from home (WFH) approval workflow
-- - Office location and configuration management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA public;

-- =====================================================
-- 1. OFFICE LOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  geofence_radius INTEGER DEFAULT 100, -- meters
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  office_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"]}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT valid_radius CHECK (geofence_radius > 0 AND geofence_radius <= 1000)
);

-- =====================================================
-- 2. OFFICE WIFI NETWORKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.office_wifi_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_location_id UUID REFERENCES public.office_locations(id) ON DELETE CASCADE,
  ssid VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  security_level VARCHAR(20) DEFAULT 'secure' CHECK (security_level IN ('open', 'secure', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicate SSIDs per location
  UNIQUE(office_location_id, ssid)
);

-- =====================================================
-- 3. OFFICE QR CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.office_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_location_id UUID REFERENCES public.office_locations(id) ON DELETE CASCADE,
  code_value VARCHAR(255) UNIQUE NOT NULL,
  location_description VARCHAR(100) NOT NULL,
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint to ensure future expiration
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- =====================================================
-- 4. WFH APPROVALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wfh_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_date DATE NOT NULL,
  requested_for_date DATE NOT NULL,
  reason TEXT NOT NULL,
  urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'emergency')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  manager_comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- {type: 'weekly', day: 'monday', end_date: '2024-12-31'}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (requested_for_date >= request_date),
  CONSTRAINT valid_approval_date CHECK (approved_at IS NULL OR approved_at >= created_at)
);

-- =====================================================
-- 5. ATTENDANCE VERIFICATION METHODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_verification_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('gps', 'wifi', 'qr_code', 'manual')),
  verification_data JSONB,
  verification_success BOOLEAN NOT NULL,
  verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ENHANCE EXISTING TABLES
-- =====================================================

-- Add new columns to attendance_records (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'office_location_id') THEN
    ALTER TABLE public.attendance_records ADD COLUMN office_location_id UUID REFERENCES public.office_locations(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'primary_verification_method') THEN
    ALTER TABLE public.attendance_records ADD COLUMN primary_verification_method VARCHAR(20) CHECK (primary_verification_method IN ('gps', 'wifi', 'qr_code', 'manual'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'verification_confidence') THEN
    ALTER TABLE public.attendance_records ADD COLUMN verification_confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (verification_confidence BETWEEN 0 AND 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'wfh_approval_id') THEN
    ALTER TABLE public.attendance_records ADD COLUMN wfh_approval_id UUID REFERENCES public.wfh_approvals(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'check_in_method_count') THEN
    ALTER TABLE public.attendance_records ADD COLUMN check_in_method_count INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'is_verified') THEN
    ALTER TABLE public.attendance_records ADD COLUMN is_verified BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'verification_notes') THEN
    ALTER TABLE public.attendance_records ADD COLUMN verification_notes TEXT;
  END IF;
END $$;

-- Add manager relationship and WFH settings to users (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'manager_id') THEN
    ALTER TABLE public.users ADD COLUMN manager_id UUID REFERENCES public.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'can_approve_wfh') THEN
    ALTER TABLE public.users ADD COLUMN can_approve_wfh BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wfh_policy') THEN
    ALTER TABLE public.users ADD COLUMN wfh_policy JSONB DEFAULT '{"max_days_per_month": 10, "requires_advance_notice": true, "advance_notice_hours": 24}';
  END IF;
END $$;

-- Add office assignment to employee_details (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_details' AND column_name = 'primary_office_location_id') THEN
    ALTER TABLE public.employee_details ADD COLUMN primary_office_location_id UUID REFERENCES public.office_locations(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_details' AND column_name = 'preferred_check_in_method') THEN
    ALTER TABLE public.employee_details ADD COLUMN preferred_check_in_method VARCHAR(20) DEFAULT 'gps' CHECK (preferred_check_in_method IN ('gps', 'wifi', 'qr_code'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_details' AND column_name = 'wfh_eligibility') THEN
    ALTER TABLE public.employee_details ADD COLUMN wfh_eligibility BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_details' AND column_name = 'max_wfh_days_per_month') THEN
    ALTER TABLE public.employee_details ADD COLUMN max_wfh_days_per_month INTEGER DEFAULT 10;
  END IF;
END $$;

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Office locations indexes
CREATE INDEX idx_office_locations_active ON public.office_locations(is_active);
CREATE INDEX idx_office_locations_coordinates ON public.office_locations(latitude, longitude);

-- WiFi networks indexes
CREATE INDEX idx_wifi_networks_ssid ON public.office_wifi_networks(ssid);
CREATE INDEX idx_wifi_networks_location_active ON public.office_wifi_networks(office_location_id, is_active);

-- QR codes indexes
CREATE INDEX idx_qr_codes_value ON public.office_qr_codes(code_value);
CREATE INDEX idx_qr_codes_location_active ON public.office_qr_codes(office_location_id, is_active);
CREATE INDEX idx_qr_codes_expiration ON public.office_qr_codes(expires_at) WHERE expires_at IS NOT NULL;

-- WFH approvals indexes
CREATE INDEX idx_wfh_approvals_employee_date ON public.wfh_approvals(employee_id, requested_for_date);
CREATE INDEX idx_wfh_approvals_manager_status ON public.wfh_approvals(manager_id, status);
CREATE INDEX idx_wfh_approvals_status_date ON public.wfh_approvals(status, requested_for_date);
CREATE INDEX idx_wfh_manager_pending ON public.wfh_approvals(manager_id, status, created_at DESC) WHERE status = 'pending';

-- Verification methods indexes
CREATE INDEX idx_verification_methods_attendance ON public.attendance_verification_methods(attendance_record_id);
CREATE INDEX idx_verification_methods_type ON public.attendance_verification_methods(verification_type);
CREATE INDEX idx_verification_methods_timestamp ON public.attendance_verification_methods(verification_timestamp);

-- Enhanced attendance records indexes
CREATE INDEX idx_attendance_office_location ON public.attendance_records(office_location_id);
CREATE INDEX idx_attendance_verification_method ON public.attendance_records(primary_verification_method);
CREATE INDEX idx_attendance_wfh_approval ON public.attendance_records(wfh_approval_id);
CREATE INDEX idx_attendance_verified ON public.attendance_records(is_verified);
CREATE INDEX idx_attendance_user_date_range ON public.attendance_records(user_id, attendance_date DESC);

-- Users table indexes
CREATE INDEX idx_users_manager ON public.users(manager_id);
CREATE INDEX idx_users_can_approve_wfh ON public.users(can_approve_wfh) WHERE can_approve_wfh = true;

-- Employee details indexes
CREATE INDEX idx_employee_details_office_location ON public.employee_details(primary_office_location_id);
CREATE INDEX idx_employee_details_wfh_eligible ON public.employee_details(wfh_eligibility);

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wfh_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_verification_methods ENABLE ROW LEVEL SECURITY;

-- Office configuration policies (read access for all authenticated users)
CREATE POLICY "Authenticated users can read office locations" ON public.office_locations
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Authenticated users can read WiFi networks" ON public.office_wifi_networks
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Authenticated users can read active QR codes" ON public.office_qr_codes
  FOR SELECT TO authenticated USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Admin policies for office configuration
CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage WiFi networks" ON public.office_wifi_networks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage QR codes" ON public.office_qr_codes
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- WFH approval policies
CREATE POLICY "Users can view own WFH requests" ON public.wfh_approvals
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Users can create own WFH requests" ON public.wfh_approvals
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can view team WFH requests" ON public.wfh_approvals
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND can_approve_wfh = true)
  );

CREATE POLICY "Managers can update WFH requests" ON public.wfh_approvals
  FOR UPDATE USING (
    manager_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND can_approve_wfh = true)
  );

-- Verification methods policies
CREATE POLICY "Users can view own verification methods" ON public.attendance_verification_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records 
      WHERE id = attendance_record_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create verification methods for own attendance" ON public.attendance_verification_methods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendance_records 
      WHERE id = attendance_record_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. UTILITY FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers to new tables
CREATE TRIGGER update_office_locations_updated_at 
  BEFORE UPDATE ON public.office_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_wifi_networks_updated_at 
  BEFORE UPDATE ON public.office_wifi_networks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_qr_codes_updated_at 
  BEFORE UPDATE ON public.office_qr_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wfh_approvals_updated_at 
  BEFORE UPDATE ON public.wfh_approvals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update QR code usage statistics
CREATE OR REPLACE FUNCTION update_qr_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_type = 'qr_code' AND NEW.verification_success = true THEN
    UPDATE public.office_qr_codes 
    SET scan_count = scan_count + 1,
        last_scanned_at = NOW(),
        updated_at = NOW()
    WHERE code_value = (NEW.verification_data->>'code_value');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update QR code usage
CREATE TRIGGER update_qr_usage_trigger
  AFTER INSERT ON public.attendance_verification_methods
  FOR EACH ROW EXECUTE FUNCTION update_qr_code_usage();

-- Function to expire old WFH requests
CREATE OR REPLACE FUNCTION expire_old_wfh_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.wfh_approvals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND requested_for_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. SEED DATA FOR OFFICE CONFIGURATION
-- =====================================================

-- Insert default office location
INSERT INTO public.office_locations (id, name, address, latitude, longitude, geofence_radius, timezone, office_hours) VALUES
('00000000-0000-0000-0000-000000000100', 'Smart Office HQ', '123 Innovation Drive, Tech City, TC 12345', 37.7749, -122.4194, 100, 'America/Los_Angeles',
 '{"start": "08:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"], "flexible_hours": true, "core_hours": {"start": "10:00", "end": "15:00"}}');

-- Insert office WiFi networks
INSERT INTO public.office_wifi_networks (office_location_id, ssid, description, security_level) VALUES
('00000000-0000-0000-0000-000000000100', 'SmartOffice-5G', 'Primary 5GHz office network', 'secure'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-2.4G', 'Primary 2.4GHz office network', 'secure'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-Guest', 'Guest network for visitors', 'open'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-Secure', 'Enterprise secure network', 'enterprise');

-- Insert office QR codes for different locations
-- Only insert if the admin user exists, otherwise set generated_by to NULL
INSERT INTO public.office_qr_codes (office_location_id, code_value, location_description, generated_by, expires_at)
SELECT
  '00000000-0000-0000-0000-000000000100',
  qr_data.code_value,
  qr_data.location_description,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001')
    THEN '00000000-0000-0000-0000-000000000001'::UUID
    ELSE NULL
  END,
  qr_data.expires_at
FROM (VALUES
  ('SMARTOFFICE_MAIN_ENTRANCE_2025_Q2', 'Main Entrance Lobby', '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE),
  ('SMARTOFFICE_FLOOR2_RECEPTION_2025_Q2', 'Floor 2 Reception Desk', '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE),
  ('SMARTOFFICE_FLOOR3_RECEPTION_2025_Q2', 'Floor 3 Reception Desk', '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE),
  ('SMARTOFFICE_CAFETERIA_2025_Q2', 'Cafeteria Entrance', '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE),
  ('SMARTOFFICE_PARKING_2025_Q2', 'Parking Garage Entrance', '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE)
) AS qr_data(code_value, location_description, expires_at);

-- Update existing users with manager relationships and WFH permissions
UPDATE public.users SET
  can_approve_wfh = true,
  wfh_policy = '{"max_days_per_month": 15, "requires_advance_notice": true, "advance_notice_hours": 24, "auto_approve_emergency": true}'
WHERE role = 'admin';

-- Set up manager relationships (admin as manager for regular users)
-- Only set manager if the admin user exists
UPDATE public.users SET
  manager_id = '00000000-0000-0000-0000-000000000001'
WHERE role = 'user'
  AND id != '00000000-0000-0000-0000-000000000001'
  AND EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001');

-- Update employee details with office assignments
UPDATE public.employee_details SET
  primary_office_location_id = '00000000-0000-0000-0000-000000000100',
  preferred_check_in_method = 'gps',
  wfh_eligibility = true,
  max_wfh_days_per_month = 10
WHERE user_id IN (SELECT id FROM public.users);

-- Update existing attendance records with verification method
UPDATE public.attendance_records SET
  office_location_id = '00000000-0000-0000-0000-000000000100',
  primary_verification_method = 'gps',
  verification_confidence = 0.95,
  check_in_method_count = 1,
  is_verified = true
WHERE status = 'office';

-- Insert sample WFH approvals
-- Only insert if both employee and manager users exist
INSERT INTO public.wfh_approvals (employee_id, manager_id, request_date, requested_for_date, reason, urgency, status, approved_at, manager_comments)
SELECT
  wfh_data.employee_id,
  wfh_data.manager_id,
  wfh_data.request_date,
  wfh_data.requested_for_date,
  wfh_data.reason,
  wfh_data.urgency,
  wfh_data.status,
  wfh_data.approved_at,
  wfh_data.manager_comments
FROM (VALUES
  ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', 'Doctor appointment in the morning', 'normal', 'approved', NOW() - INTERVAL '1 day', 'Approved. Please ensure you are available for the 2 PM team meeting.'),
  ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'Home internet installation', 'normal', 'pending', NULL, NULL),
  ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', 'Family emergency', 'urgent', 'approved', NOW() - INTERVAL '4 days', 'Approved due to emergency. Hope everything is okay.')
) AS wfh_data(employee_id, manager_id, request_date, requested_for_date, reason, urgency, status, approved_at, manager_comments)
WHERE EXISTS (SELECT 1 FROM public.users WHERE id = wfh_data.employee_id)
  AND EXISTS (SELECT 1 FROM public.users WHERE id = wfh_data.manager_id);

-- Insert sample verification methods for existing attendance records
INSERT INTO public.attendance_verification_methods (attendance_record_id, verification_type, verification_data, verification_success)
SELECT
  ar.id,
  'gps',
  jsonb_build_object(
    'latitude', ar.location_lat,
    'longitude', ar.location_lng,
    'accuracy', 5 + random() * 10,
    'distance_from_office', random() * 50,
    'office_location_id', '00000000-0000-0000-0000-000000000100'
  ),
  true
FROM public.attendance_records ar
WHERE ar.status = 'office' AND ar.location_lat IS NOT NULL
LIMIT 10;

-- =====================================================
-- 11. ANALYTICS VIEWS
-- =====================================================

-- Drop existing view first to avoid column mapping conflicts
DROP VIEW IF EXISTS daily_attendance_summary;

-- Daily attendance summary with verification methods
CREATE VIEW daily_attendance_summary AS
SELECT
  ar.attendance_date,
  ar.status,
  ar.primary_verification_method,
  ol.name as office_name,
  COUNT(*) as count,
  AVG(ar.verification_confidence) as avg_confidence,
  COUNT(CASE WHEN ar.is_verified = true THEN 1 END) as verified_count
FROM public.attendance_records ar
LEFT JOIN public.office_locations ol ON ar.office_location_id = ol.id
WHERE ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ar.attendance_date, ar.status, ar.primary_verification_method, ol.name
ORDER BY ar.attendance_date DESC;

-- WFH approval metrics
CREATE OR REPLACE VIEW wfh_approval_metrics AS
SELECT
  DATE_TRUNC('week', wa.created_at) as week,
  wa.status,
  wa.urgency,
  COUNT(*) as request_count,
  AVG(CASE
    WHEN wa.approved_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (wa.approved_at - wa.created_at))/3600
    ELSE NULL
  END) as avg_approval_hours,
  COUNT(CASE WHEN wa.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN wa.status = 'denied' THEN 1 END) as denied_count
FROM public.wfh_approvals wa
WHERE wa.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', wa.created_at), wa.status, wa.urgency
ORDER BY week DESC;

-- Verification method effectiveness
CREATE OR REPLACE VIEW verification_method_stats AS
SELECT
  avm.verification_type,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN avm.verification_success = true THEN 1 END) as successful_attempts,
  ROUND(
    COUNT(CASE WHEN avm.verification_success = true THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as success_rate_percent,
  AVG(CASE
    WHEN ar.verification_confidence IS NOT NULL
    THEN ar.verification_confidence
    ELSE NULL
  END) as avg_confidence
FROM public.attendance_verification_methods avm
JOIN public.attendance_records ar ON avm.attendance_record_id = ar.id
WHERE avm.verification_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY avm.verification_type
ORDER BY success_rate_percent DESC;

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant access to new tables for authenticated users
GRANT SELECT ON public.office_locations TO authenticated;
GRANT SELECT ON public.office_wifi_networks TO authenticated;
GRANT SELECT ON public.office_qr_codes TO authenticated;
GRANT ALL ON public.wfh_approvals TO authenticated;
GRANT ALL ON public.attendance_verification_methods TO authenticated;

-- Grant access to views
GRANT SELECT ON daily_attendance_summary TO authenticated;
GRANT SELECT ON wfh_approval_metrics TO authenticated;
GRANT SELECT ON verification_method_stats TO authenticated;

-- Grant admin access to all tables
GRANT ALL ON public.office_locations TO authenticated;
GRANT ALL ON public.office_wifi_networks TO authenticated;
GRANT ALL ON public.office_qr_codes TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
('attendance_enhancements_migration', 'completed', 'string', 'Attendance management system enhancements migration completed')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = 'completed',
  updated_at = NOW();
