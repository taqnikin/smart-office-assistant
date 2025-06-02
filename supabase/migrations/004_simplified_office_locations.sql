-- Simplified Office Locations Migration
-- Run this if the full migration fails

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create office_locations table
CREATE TABLE IF NOT EXISTS public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  geofence_radius INTEGER DEFAULT 100,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  office_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"]}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND 
    longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT valid_radius CHECK (geofence_radius > 0 AND geofence_radius <= 1000)
);

-- 2. Add office location columns to existing tables
DO $$ 
BEGIN
  -- Add to attendance_records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'attendance_records' AND column_name = 'office_location_id') THEN
    ALTER TABLE public.attendance_records 
    ADD COLUMN office_location_id UUID REFERENCES public.office_locations(id);
  END IF;

  -- Add to employee_details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employee_details' AND column_name = 'primary_office_location_id') THEN
    ALTER TABLE public.employee_details 
    ADD COLUMN primary_office_location_id UUID REFERENCES public.office_locations(id),
    ADD COLUMN preferred_check_in_method VARCHAR(20) DEFAULT 'gps',
    ADD COLUMN wfh_eligibility BOOLEAN DEFAULT true,
    ADD COLUMN max_wfh_days_per_month INTEGER DEFAULT 10;
  END IF;
END $$;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_office_locations_active ON public.office_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_office_locations_coordinates ON public.office_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_attendance_office_location ON public.attendance_records(office_location_id);
CREATE INDEX IF NOT EXISTS idx_employee_details_office_location ON public.employee_details(primary_office_location_id);

-- 4. Enable RLS
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
DROP POLICY IF EXISTS "Authenticated users can read office locations" ON public.office_locations;
CREATE POLICY "Authenticated users can read office locations" ON public.office_locations
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage office locations" ON public.office_locations;
CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Insert default office location
INSERT INTO public.office_locations (id, name, address, latitude, longitude, geofence_radius, timezone) 
VALUES (
  '00000000-0000-0000-0000-000000000100', 
  'Smart Office HQ', 
  '123 Innovation Drive, Tech City, TC 12345', 
  37.7749, 
  -122.4194, 
  100, 
  'America/Los_Angeles'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  geofence_radius = EXCLUDED.geofence_radius,
  timezone = EXCLUDED.timezone,
  updated_at = NOW();

-- 7. Assign all users to default office
UPDATE public.employee_details SET
  primary_office_location_id = '00000000-0000-0000-0000-000000000100',
  preferred_check_in_method = 'gps',
  wfh_eligibility = true,
  max_wfh_days_per_month = 10
WHERE primary_office_location_id IS NULL;

-- 8. Update existing attendance records
UPDATE public.attendance_records SET
  office_location_id = '00000000-0000-0000-0000-000000000100'
WHERE status = 'office' AND office_location_id IS NULL;

-- 9. Grant permissions
GRANT SELECT ON public.office_locations TO authenticated;
GRANT ALL ON public.office_locations TO authenticated;

-- 10. Verification query
SELECT 
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM public.office_locations) as office_locations_count,
  (SELECT COUNT(*) FROM public.employee_details WHERE primary_office_location_id IS NOT NULL) as users_assigned_count,
  (SELECT COUNT(*) FROM public.attendance_records WHERE office_location_id IS NOT NULL) as attendance_records_updated_count;
