-- Office Location Tables Only - Quick Setup
-- This creates just the essential tables for office location verification

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- 4. ENHANCE EXISTING TABLES
-- =====================================================

-- Add office location column to attendance_records (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attendance_records' 
                 AND column_name = 'office_location_id') THEN
    ALTER TABLE public.attendance_records 
    ADD COLUMN office_location_id UUID REFERENCES public.office_locations(id);
  END IF;
END $$;

-- Add office assignment to employee_details (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employee_details' 
                 AND column_name = 'primary_office_location_id') THEN
    ALTER TABLE public.employee_details 
    ADD COLUMN primary_office_location_id UUID REFERENCES public.office_locations(id),
    ADD COLUMN preferred_check_in_method VARCHAR(20) DEFAULT 'gps' CHECK (preferred_check_in_method IN ('gps', 'wifi', 'qr_code'));
  END IF;
END $$;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Office locations indexes
CREATE INDEX IF NOT EXISTS idx_office_locations_active ON public.office_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_office_locations_coordinates ON public.office_locations(latitude, longitude);

-- WiFi networks indexes
CREATE INDEX IF NOT EXISTS idx_wifi_networks_ssid ON public.office_wifi_networks(ssid);
CREATE INDEX IF NOT EXISTS idx_wifi_networks_location_active ON public.office_wifi_networks(office_location_id, is_active);

-- QR codes indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_value ON public.office_qr_codes(code_value);
CREATE INDEX IF NOT EXISTS idx_qr_codes_location_active ON public.office_qr_codes(office_location_id, is_active);

-- Enhanced attendance records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_office_location ON public.attendance_records(office_location_id);

-- Employee details indexes
CREATE INDEX IF NOT EXISTS idx_employee_details_office_location ON public.employee_details(primary_office_location_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;

-- Office configuration policies (read access for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read office locations" ON public.office_locations;
CREATE POLICY "Authenticated users can read office locations" ON public.office_locations
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can read WiFi networks" ON public.office_wifi_networks;
CREATE POLICY "Authenticated users can read WiFi networks" ON public.office_wifi_networks
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can read active QR codes" ON public.office_qr_codes;
CREATE POLICY "Authenticated users can read active QR codes" ON public.office_qr_codes
  FOR SELECT TO authenticated USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Admin policies for office configuration
DROP POLICY IF EXISTS "Admins can manage office locations" ON public.office_locations;
CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage WiFi networks" ON public.office_wifi_networks;
CREATE POLICY "Admins can manage WiFi networks" ON public.office_wifi_networks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage QR codes" ON public.office_qr_codes;
CREATE POLICY "Admins can manage QR codes" ON public.office_qr_codes
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 7. UTILITY FUNCTIONS AND TRIGGERS
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
DROP TRIGGER IF EXISTS update_office_locations_updated_at ON public.office_locations;
CREATE TRIGGER update_office_locations_updated_at 
  BEFORE UPDATE ON public.office_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_office_wifi_networks_updated_at ON public.office_wifi_networks;
CREATE TRIGGER update_office_wifi_networks_updated_at 
  BEFORE UPDATE ON public.office_wifi_networks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_office_qr_codes_updated_at ON public.office_qr_codes;
CREATE TRIGGER update_office_qr_codes_updated_at 
  BEFORE UPDATE ON public.office_qr_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SEED DATA FOR OFFICE CONFIGURATION
-- =====================================================

-- Insert default office location (with conflict handling)
INSERT INTO public.office_locations (id, name, address, latitude, longitude, geofence_radius, timezone, office_hours) 
VALUES (
  '00000000-0000-0000-0000-000000000100', 
  'Smart Office HQ', 
  '123 Innovation Drive, Tech City, TC 12345', 
  37.7749, 
  -122.4194, 
  100, 
  'America/Los_Angeles',
  '{"start": "08:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"], "flexible_hours": true, "core_hours": {"start": "10:00", "end": "15:00"}}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  geofence_radius = EXCLUDED.geofence_radius,
  timezone = EXCLUDED.timezone,
  office_hours = EXCLUDED.office_hours,
  updated_at = NOW();

-- Insert office WiFi networks
INSERT INTO public.office_wifi_networks (office_location_id, ssid, description, security_level) VALUES
('00000000-0000-0000-0000-000000000100', 'SmartOffice-5G', 'Primary 5GHz office network', 'secure'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-2.4G', 'Primary 2.4GHz office network', 'secure'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-Guest', 'Guest network for visitors', 'open'),
('00000000-0000-0000-0000-000000000100', 'SmartOffice-Secure', 'Enterprise secure network', 'enterprise')
ON CONFLICT (office_location_id, ssid) DO NOTHING;

-- Insert office QR codes for different locations
INSERT INTO public.office_qr_codes (office_location_id, code_value, location_description, generated_by, expires_at) VALUES
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4', 'Main Entrance Lobby', '00000000-0000-0000-0000-000000000001', '2024-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4', 'Floor 2 Reception Desk', '00000000-0000-0000-0000-000000000001', '2024-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_FLOOR3_RECEPTION_2024_Q4', 'Floor 3 Reception Desk', '00000000-0000-0000-0000-000000000001', '2024-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_CAFETERIA_2024_Q4', 'Cafeteria Entrance', '00000000-0000-0000-0000-000000000001', '2024-12-31 23:59:59+00'),
('00000000-0000-0000-0000-000000000100', 'SMARTOFFICE_PARKING_2024_Q4', 'Parking Garage Entrance', '00000000-0000-0000-0000-000000000001', '2024-12-31 23:59:59+00')
ON CONFLICT (code_value) DO NOTHING;

-- Update employee details with office assignments (for existing users)
UPDATE public.employee_details SET
  primary_office_location_id = '00000000-0000-0000-0000-000000000100',
  preferred_check_in_method = 'gps'
WHERE user_id IN (SELECT id FROM public.users)
  AND primary_office_location_id IS NULL;

-- Update existing attendance records with office location (for office check-ins)
UPDATE public.attendance_records SET
  office_location_id = '00000000-0000-0000-0000-000000000100'
WHERE status = 'office' 
  AND office_location_id IS NULL;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant access to new tables for authenticated users
GRANT SELECT ON public.office_locations TO authenticated;
GRANT SELECT ON public.office_wifi_networks TO authenticated;
GRANT SELECT ON public.office_qr_codes TO authenticated;

-- Grant admin access to all tables
GRANT ALL ON public.office_locations TO authenticated;
GRANT ALL ON public.office_wifi_networks TO authenticated;
GRANT ALL ON public.office_qr_codes TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) VALUES
('office_locations_migration', 'completed', 'string', 'Office locations tables created successfully')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = 'completed',
  updated_at = NOW();
