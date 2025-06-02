# Attendance Management System - Database Schema Changes

## 📋 Overview

This document details all database schema changes required for the comprehensive attendance management system with multiple check-in verification methods and WFH approval workflows.

---

## 🗄️ **NEW TABLES REQUIRED**

### **1. WFH Approvals Table (`wfh_approvals`)**
**Purpose:** Track work-from-home approval requests and their status

```sql
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
  recurrence_pattern JSONB, -- {type: 'weekly', day: 'monday', end_date: '2024-12-31'}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (requested_for_date >= request_date),
  CONSTRAINT valid_approval_date CHECK (approved_at IS NULL OR approved_at >= created_at)
);

-- Indexes for performance
CREATE INDEX idx_wfh_approvals_employee_date ON public.wfh_approvals(employee_id, requested_for_date);
CREATE INDEX idx_wfh_approvals_manager_status ON public.wfh_approvals(manager_id, status);
CREATE INDEX idx_wfh_approvals_status_date ON public.wfh_approvals(status, requested_for_date);
```

### **2. Office Locations Table (`office_locations`)**
**Purpose:** Store office location data for geofencing and verification

```sql
CREATE TABLE public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  geofence_radius INTEGER DEFAULT 100, -- meters
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  office_hours JSONB, -- {start: '09:00', end: '18:00', days: ['mon','tue','wed','thu','fri']}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND 
    longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT valid_radius CHECK (geofence_radius > 0 AND geofence_radius <= 1000)
);

-- Indexes
CREATE INDEX idx_office_locations_active ON public.office_locations(is_active);
CREATE INDEX idx_office_locations_coordinates ON public.office_locations(latitude, longitude);
```

### **3. Office WiFi Networks Table (`office_wifi_networks`)**
**Purpose:** Store authorized office WiFi networks for verification

```sql
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

-- Indexes
CREATE INDEX idx_wifi_networks_ssid ON public.office_wifi_networks(ssid);
CREATE INDEX idx_wifi_networks_location_active ON public.office_wifi_networks(office_location_id, is_active);
```

### **4. Office QR Codes Table (`office_qr_codes`)**
**Purpose:** Manage QR codes for office check-in verification

```sql
CREATE TABLE public.office_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_location_id UUID REFERENCES public.office_locations(id) ON DELETE CASCADE,
  code_value VARCHAR(255) UNIQUE NOT NULL,
  location_description VARCHAR(100) NOT NULL, -- 'Main Entrance', 'Floor 3 Reception'
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

-- Indexes
CREATE INDEX idx_qr_codes_value ON public.office_qr_codes(code_value);
CREATE INDEX idx_qr_codes_location_active ON public.office_qr_codes(office_location_id, is_active);
CREATE INDEX idx_qr_codes_expiration ON public.office_qr_codes(expires_at) WHERE expires_at IS NOT NULL;
```

### **5. Attendance Verification Methods Table (`attendance_verification_methods`)**
**Purpose:** Track which verification method was used for each check-in

```sql
CREATE TABLE public.attendance_verification_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('gps', 'wifi', 'qr_code', 'manual')),
  verification_data JSONB, -- Store method-specific data
  verification_success BOOLEAN NOT NULL,
  verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Examples of verification_data:
  -- GPS: {latitude: 37.7749, longitude: -122.4194, accuracy: 5, distance_from_office: 45}
  -- WiFi: {ssid: 'OfficeMain-5G', signal_strength: -45, mac_address: 'xx:xx:xx:xx:xx:xx'}
  -- QR: {qr_code_id: 'uuid', location_description: 'Main Entrance', scan_duration: 1.2}
  -- Manual: {approved_by: 'uuid', reason: 'System maintenance', override_reason: 'GPS unavailable'}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_verification_methods_attendance ON public.attendance_verification_methods(attendance_record_id);
CREATE INDEX idx_verification_methods_type ON public.attendance_verification_methods(verification_type);
CREATE INDEX idx_verification_methods_timestamp ON public.attendance_verification_methods(verification_timestamp);
```

---

## 🔄 **MODIFIED EXISTING TABLES**

### **1. Enhanced Attendance Records Table**
**Changes to existing `attendance_records` table:**

```sql
-- Add new columns to existing attendance_records table
ALTER TABLE public.attendance_records 
ADD COLUMN office_location_id UUID REFERENCES public.office_locations(id),
ADD COLUMN primary_verification_method VARCHAR(20) CHECK (primary_verification_method IN ('gps', 'wifi', 'qr_code', 'manual')),
ADD COLUMN verification_confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (verification_confidence BETWEEN 0 AND 1),
ADD COLUMN wfh_approval_id UUID REFERENCES public.wfh_approvals(id),
ADD COLUMN check_in_method_count INTEGER DEFAULT 1,
ADD COLUMN is_verified BOOLEAN DEFAULT true,
ADD COLUMN verification_notes TEXT;

-- Add indexes for new columns
CREATE INDEX idx_attendance_office_location ON public.attendance_records(office_location_id);
CREATE INDEX idx_attendance_verification_method ON public.attendance_records(primary_verification_method);
CREATE INDEX idx_attendance_wfh_approval ON public.attendance_records(wfh_approval_id);
CREATE INDEX idx_attendance_verified ON public.attendance_records(is_verified);
```

### **2. Enhanced Users Table**
**Add manager relationship and WFH preferences:**

```sql
-- Add manager relationship and WFH settings
ALTER TABLE public.users 
ADD COLUMN manager_id UUID REFERENCES public.users(id),
ADD COLUMN can_approve_wfh BOOLEAN DEFAULT false,
ADD COLUMN wfh_policy JSONB DEFAULT '{"max_days_per_month": 10, "requires_advance_notice": true, "advance_notice_hours": 24}';

-- Add index for manager relationships
CREATE INDEX idx_users_manager ON public.users(manager_id);
CREATE INDEX idx_users_can_approve_wfh ON public.users(can_approve_wfh) WHERE can_approve_wfh = true;
```

### **3. Enhanced Employee Details Table**
**Add office assignment and preferences:**

```sql
-- Add office location assignment
ALTER TABLE public.employee_details 
ADD COLUMN primary_office_location_id UUID REFERENCES public.office_locations(id),
ADD COLUMN preferred_check_in_method VARCHAR(20) DEFAULT 'gps' CHECK (preferred_check_in_method IN ('gps', 'wifi', 'qr_code')),
ADD COLUMN wfh_eligibility BOOLEAN DEFAULT true,
ADD COLUMN max_wfh_days_per_month INTEGER DEFAULT 10;

-- Add indexes
CREATE INDEX idx_employee_details_office_location ON public.employee_details(primary_office_location_id);
CREATE INDEX idx_employee_details_wfh_eligible ON public.employee_details(wfh_eligibility);
```

---

## 🔐 **ROW LEVEL SECURITY (RLS) POLICIES**

### **WFH Approvals Policies**

```sql
-- Enable RLS
ALTER TABLE public.wfh_approvals ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "Users can view own WFH requests" ON public.wfh_approvals
  FOR SELECT USING (employee_id = auth.uid());

-- Employees can create their own requests
CREATE POLICY "Users can create own WFH requests" ON public.wfh_approvals
  FOR INSERT WITH CHECK (employee_id = auth.uid());

-- Managers can view requests for their team members
CREATE POLICY "Managers can view team WFH requests" ON public.wfh_approvals
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND can_approve_wfh = true
    )
  );

-- Managers can update requests (approve/deny)
CREATE POLICY "Managers can update WFH requests" ON public.wfh_approvals
  FOR UPDATE USING (
    manager_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND can_approve_wfh = true
    )
  );
```

### **Office Configuration Policies**

```sql
-- Enable RLS on office tables
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_verification_methods ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read office configuration
CREATE POLICY "Authenticated users can read office locations" ON public.office_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read WiFi networks" ON public.office_wifi_networks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read QR codes" ON public.office_qr_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- Only admins can modify office configuration
CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can view their own verification methods
CREATE POLICY "Users can view own verification methods" ON public.attendance_verification_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records 
      WHERE id = attendance_record_id AND user_id = auth.uid()
    )
  );
```

---

## 📊 **DATABASE FUNCTIONS AND TRIGGERS**

### **1. Auto-Update Timestamps**

```sql
-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_wfh_approvals_updated_at 
  BEFORE UPDATE ON public.wfh_approvals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_locations_updated_at 
  BEFORE UPDATE ON public.office_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_wifi_networks_updated_at 
  BEFORE UPDATE ON public.office_wifi_networks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_qr_codes_updated_at 
  BEFORE UPDATE ON public.office_qr_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **2. WFH Approval Expiration Function**

```sql
-- Function to automatically expire old WFH requests
CREATE OR REPLACE FUNCTION expire_old_wfh_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.wfh_approvals 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND requested_for_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run daily (would be set up in application or cron)
```

### **3. QR Code Usage Tracking**

```sql
-- Function to update QR code scan statistics
CREATE OR REPLACE FUNCTION update_qr_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_type = 'qr_code' AND NEW.verification_success = true THEN
    UPDATE public.office_qr_codes 
    SET scan_count = scan_count + 1,
        last_scanned_at = NOW(),
        updated_at = NOW()
    WHERE code_value = (NEW.verification_data->>'qr_code_value');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update QR code usage
CREATE TRIGGER update_qr_usage_trigger
  AFTER INSERT ON public.attendance_verification_methods
  FOR EACH ROW EXECUTE FUNCTION update_qr_code_usage();
```

---

## 🔍 **PERFORMANCE INDEXES**

### **Composite Indexes for Common Queries**

```sql
-- Attendance queries by user and date range
CREATE INDEX idx_attendance_user_date_range 
  ON public.attendance_records(user_id, attendance_date DESC);

-- WFH approval queries by employee and status
CREATE INDEX idx_wfh_employee_status_date 
  ON public.wfh_approvals(employee_id, status, requested_for_date DESC);

-- Manager approval dashboard queries
CREATE INDEX idx_wfh_manager_pending 
  ON public.wfh_approvals(manager_id, status, created_at DESC) 
  WHERE status = 'pending';

-- Verification method analysis
CREATE INDEX idx_verification_type_timestamp 
  ON public.attendance_verification_methods(verification_type, verification_timestamp DESC);

-- Office location proximity queries (for geospatial queries)
CREATE INDEX idx_office_location_coordinates 
  ON public.office_locations USING GIST(point(longitude, latitude));
```

---

## 📋 **MIGRATION SCRIPT OUTLINE**

### **Migration Order:**
1. Create new tables (office_locations, office_wifi_networks, office_qr_codes)
2. Create WFH approvals table
3. Create verification methods table
4. Alter existing tables (add new columns)
5. Create indexes
6. Set up RLS policies
7. Create functions and triggers
8. Insert seed data

### **Rollback Strategy:**
- Each migration step should be reversible
- Backup existing data before schema changes
- Test migrations on staging environment first
- Document rollback procedures for each step

---

## 🌱 **SEED DATA REQUIREMENTS**

### **Office Locations**
```sql
-- Example office location
INSERT INTO public.office_locations (name, address, latitude, longitude, geofence_radius, timezone) VALUES
('Main Office', '123 Business St, City, State 12345', 37.7749, -122.4194, 100, 'America/Los_Angeles');
```

### **WiFi Networks**
```sql
-- Example WiFi networks
INSERT INTO public.office_wifi_networks (office_location_id, ssid, description) VALUES
((SELECT id FROM public.office_locations WHERE name = 'Main Office'), 'OfficeMain-5G', 'Primary office network'),
((SELECT id FROM public.office_locations WHERE name = 'Main Office'), 'OfficeGuest', 'Guest network');
```

### **QR Codes**
```sql
-- Example QR codes
INSERT INTO public.office_qr_codes (office_location_id, code_value, location_description) VALUES
((SELECT id FROM public.office_locations WHERE name = 'Main Office'), 'OFFICE_MAIN_ENTRANCE_2024', 'Main Entrance Lobby'),
((SELECT id FROM public.office_locations WHERE name = 'Main Office'), 'OFFICE_FLOOR3_RECEPTION_2024', 'Floor 3 Reception');
```

---

## 📈 **MONITORING AND ANALYTICS**

### **Key Metrics to Track**
- Check-in success rates by verification method
- WFH approval processing times
- QR code usage patterns
- GPS accuracy and reliability
- WiFi network detection rates

### **Recommended Views**
```sql
-- Daily attendance summary with verification methods
CREATE VIEW daily_attendance_summary AS
SELECT 
  ar.attendance_date,
  ar.status,
  ar.primary_verification_method,
  COUNT(*) as count,
  AVG(ar.verification_confidence) as avg_confidence
FROM public.attendance_records ar
WHERE ar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ar.attendance_date, ar.status, ar.primary_verification_method;

-- WFH approval metrics
CREATE VIEW wfh_approval_metrics AS
SELECT 
  DATE_TRUNC('week', created_at) as week,
  status,
  urgency,
  COUNT(*) as request_count,
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_approval_hours
FROM public.wfh_approvals
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', created_at), status, urgency;
```

---

*This schema supports all user stories and provides a robust foundation for the comprehensive attendance management system.*
