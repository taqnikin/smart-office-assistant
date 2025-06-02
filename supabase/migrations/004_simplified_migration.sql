-- Simplified Migration (without PostGIS)
-- Use this if the main migration fails due to PostGIS extension

-- Enable UUID extension only
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. OFFICE LOCATIONS TABLE
-- =====================================================
CREATE TABLE public.office_locations (
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
CREATE TABLE public.office_wifi_networks (
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
CREATE TABLE public.office_qr_codes (
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
CREATE TABLE public.wfh_approvals (
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
  recurrence_pattern JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (requested_for_date >= request_date),
  CONSTRAINT valid_approval_date CHECK (approved_at IS NULL OR approved_at >= created_at)
);

-- =====================================================
-- 5. ATTENDANCE VERIFICATION METHODS TABLE
-- =====================================================
CREATE TABLE public.attendance_verification_methods (
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

-- Add new columns to attendance_records
ALTER TABLE public.attendance_records 
ADD COLUMN office_location_id UUID REFERENCES public.office_locations(id),
ADD COLUMN primary_verification_method VARCHAR(20) CHECK (primary_verification_method IN ('gps', 'wifi', 'qr_code', 'manual')),
ADD COLUMN verification_confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (verification_confidence BETWEEN 0 AND 1),
ADD COLUMN wfh_approval_id UUID REFERENCES public.wfh_approvals(id),
ADD COLUMN check_in_method_count INTEGER DEFAULT 1,
ADD COLUMN is_verified BOOLEAN DEFAULT true,
ADD COLUMN verification_notes TEXT;

-- Add manager relationship and WFH settings to users
ALTER TABLE public.users 
ADD COLUMN manager_id UUID REFERENCES public.users(id),
ADD COLUMN can_approve_wfh BOOLEAN DEFAULT false,
ADD COLUMN wfh_policy JSONB DEFAULT '{"max_days_per_month": 10, "requires_advance_notice": true, "advance_notice_hours": 24}';

-- Add office assignment to employee_details
ALTER TABLE public.employee_details 
ADD COLUMN primary_office_location_id UUID REFERENCES public.office_locations(id),
ADD COLUMN preferred_check_in_method VARCHAR(20) DEFAULT 'gps' CHECK (preferred_check_in_method IN ('gps', 'wifi', 'qr_code')),
ADD COLUMN wfh_eligibility BOOLEAN DEFAULT true,
ADD COLUMN max_wfh_days_per_month INTEGER DEFAULT 10;

-- =====================================================
-- 7. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_office_locations_active ON public.office_locations(is_active);
CREATE INDEX idx_office_locations_coordinates ON public.office_locations(latitude, longitude);
CREATE INDEX idx_attendance_office_location ON public.attendance_records(office_location_id);
CREATE INDEX idx_employee_details_office_location ON public.employee_details(primary_office_location_id);

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wfh_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_verification_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read office locations" ON public.office_locations
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 9. SEED DATA
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

-- Insert office QR codes
INSERT INTO public.office_qr_codes (office_location_id, code_value, location_description, generated_by, expires_at) VALUES
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_MAIN_ENTRANCE_2025_Q2', 'Main Entrance Lobby', '00000000-0000-0000-0000-000000000001', '2025-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_FLOOR2_RECEPTION_2025_Q2', 'Floor 2 Reception Desk', '00000000-0000-0000-0000-000000000001', '2025-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_FLOOR3_RECEPTION_2025_Q2', 'Floor 3 Reception Desk', '00000000-0000-0000-0000-000000000001', '2025-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_CAFETERIA_2025_Q2', 'Cafeteria Entrance', '00000000-0000-0000-0000-000000000001', '2025-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_PARKING_2025_Q2', 'Parking Garage Entrance', '00000000-0000-0000-0000-000000000001', '2025-12-31 23:59:59+00');

-- Update employee details with office assignments
UPDATE public.employee_details SET
  primary_office_location_id = '00000000-0000-0000-0000-000000000100',
  preferred_check_in_method = 'gps',
  wfh_eligibility = true,
  max_wfh_days_per_month = 10
WHERE user_id IN (SELECT id FROM public.users);

-- Update existing attendance records
UPDATE public.attendance_records SET
  office_location_id = '00000000-0000-0000-0000-000000000100',
  primary_verification_method = 'gps',
  verification_confidence = 0.95,
  check_in_method_count = 1,
  is_verified = true
WHERE status = 'office';

-- Grant permissions
GRANT SELECT ON public.office_locations TO authenticated;
GRANT SELECT ON public.office_wifi_networks TO authenticated;
GRANT SELECT ON public.office_qr_codes TO authenticated;
GRANT ALL ON public.office_locations TO authenticated;
GRANT ALL ON public.office_wifi_networks TO authenticated;
GRANT ALL ON public.office_qr_codes TO authenticated;

-- Migration complete
SELECT 'Migration completed successfully!' as status;
