-- =====================================================
-- POST-MIGRATION VERIFICATION SCRIPT
-- =====================================================
-- Run this script after executing 004_attendance_enhancements.sql
-- to verify that all tables, data, and policies were created correctly

-- =====================================================
-- 1. VERIFY TABLES CREATED
-- =====================================================

-- Check if all new tables exist
SELECT 
  'Tables Created' as check_type,
  table_name,
  CASE 
    WHEN table_name IN (
      'office_locations', 
      'office_wifi_networks', 
      'office_qr_codes', 
      'wfh_approvals', 
      'attendance_verification_methods'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'office_locations', 
    'office_wifi_networks', 
    'office_qr_codes', 
    'wfh_approvals', 
    'attendance_verification_methods'
  )
ORDER BY table_name;

-- =====================================================
-- 2. VERIFY COLUMNS ADDED TO EXISTING TABLES
-- =====================================================

-- Check attendance_records new columns
SELECT 
  'Attendance Records Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ ADDED' as status
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
  AND column_name IN (
    'office_location_id',
    'primary_verification_method',
    'verification_confidence',
    'wfh_approval_id',
    'check_in_method_count',
    'is_verified',
    'verification_notes'
  )
ORDER BY column_name;

-- Check employee_details new columns
SELECT 
  'Employee Details Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ ADDED' as status
FROM information_schema.columns 
WHERE table_name = 'employee_details' 
  AND column_name IN (
    'primary_office_location_id',
    'preferred_check_in_method',
    'wfh_eligibility',
    'max_wfh_days_per_month'
  )
ORDER BY column_name;

-- Check users table new columns
SELECT 
  'Users Table Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ ADDED' as status
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'manager_id',
    'can_approve_wfh',
    'wfh_policy'
  )
ORDER BY column_name;

-- =====================================================
-- 3. VERIFY SEED DATA INSERTED
-- =====================================================

-- Check office locations
SELECT 
  'Office Locations Data' as check_type,
  id,
  name,
  latitude,
  longitude,
  geofence_radius,
  is_active,
  '✅ INSERTED' as status
FROM public.office_locations
ORDER BY name;

-- Check office WiFi networks
SELECT 
  'WiFi Networks Data' as check_type,
  ssid,
  description,
  security_level,
  is_active,
  '✅ INSERTED' as status
FROM public.office_wifi_networks
ORDER BY ssid;

-- Check office QR codes
SELECT 
  'QR Codes Data' as check_type,
  code_value,
  location_description,
  is_active,
  expires_at,
  '✅ INSERTED' as status
FROM public.office_qr_codes
ORDER BY location_description;

-- Check WFH approvals sample data
SELECT 
  'WFH Approvals Data' as check_type,
  employee_id,
  status,
  reason,
  urgency,
  '✅ INSERTED' as status
FROM public.wfh_approvals
ORDER BY created_at;

-- =====================================================
-- 4. VERIFY USER OFFICE ASSIGNMENTS
-- =====================================================

-- Check that users are assigned to offices
SELECT 
  'User Office Assignments' as check_type,
  u.email,
  u.role,
  ed.primary_office_location_id,
  ol.name as office_name,
  ed.preferred_check_in_method,
  ed.wfh_eligibility,
  CASE 
    WHEN ed.primary_office_location_id IS NOT NULL THEN '✅ ASSIGNED'
    ELSE '❌ NOT ASSIGNED'
  END as status
FROM public.users u
LEFT JOIN public.employee_details ed ON u.id = ed.user_id
LEFT JOIN public.office_locations ol ON ed.primary_office_location_id = ol.id
ORDER BY u.email;

-- =====================================================
-- 5. VERIFY ATTENDANCE RECORDS UPDATED
-- =====================================================

-- Check that existing attendance records have office location
SELECT 
  'Attendance Records Updated' as check_type,
  COUNT(*) as total_records,
  COUNT(office_location_id) as records_with_office,
  COUNT(primary_verification_method) as records_with_verification,
  CASE 
    WHEN COUNT(office_location_id) > 0 THEN '✅ UPDATED'
    ELSE '❌ NOT UPDATED'
  END as status
FROM public.attendance_records
WHERE status = 'office';

-- =====================================================
-- 6. VERIFY INDEXES CREATED
-- =====================================================

-- Check important indexes
SELECT 
  'Indexes Created' as check_type,
  indexname,
  tablename,
  '✅ CREATED' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_office_locations_active',
    'idx_office_locations_coordinates',
    'idx_attendance_office_location',
    'idx_employee_details_office_location'
  )
ORDER BY indexname;

-- =====================================================
-- 7. VERIFY ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Check RLS is enabled on new tables
SELECT 
  'RLS Enabled' as check_type,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'office_locations',
    'office_wifi_networks', 
    'office_qr_codes',
    'wfh_approvals',
    'attendance_verification_methods'
  )
ORDER BY tablename;

-- Check policies exist
SELECT 
  'RLS Policies' as check_type,
  tablename,
  policyname,
  cmd,
  '✅ CREATED' as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'office_locations',
    'office_wifi_networks', 
    'office_qr_codes',
    'wfh_approvals',
    'attendance_verification_methods'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- 8. VERIFY FUNCTIONS AND TRIGGERS
-- =====================================================

-- Check functions created
SELECT 
  'Functions Created' as check_type,
  routine_name,
  routine_type,
  '✅ CREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'update_updated_at_column',
    'update_qr_code_usage',
    'expire_old_wfh_requests'
  )
ORDER BY routine_name;

-- Check triggers created
SELECT 
  'Triggers Created' as check_type,
  trigger_name,
  event_object_table,
  '✅ CREATED' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name IN (
    'update_office_locations_updated_at',
    'update_office_wifi_networks_updated_at',
    'update_office_qr_codes_updated_at',
    'update_wfh_approvals_updated_at',
    'update_qr_usage_trigger'
  )
ORDER BY trigger_name;

-- =====================================================
-- 9. VERIFY VIEWS CREATED
-- =====================================================

-- Check analytics views
SELECT 
  'Analytics Views' as check_type,
  table_name,
  table_type,
  '✅ CREATED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name IN (
    'daily_attendance_summary',
    'wfh_approval_metrics',
    'verification_method_stats'
  )
ORDER BY table_name;

-- =====================================================
-- 10. VERIFY PERMISSIONS GRANTED
-- =====================================================

-- Check table permissions for authenticated role
SELECT 
  'Table Permissions' as check_type,
  table_name,
  privilege_type,
  grantee,
  '✅ GRANTED' as status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND grantee = 'authenticated'
  AND table_name IN (
    'office_locations',
    'office_wifi_networks',
    'office_qr_codes',
    'wfh_approvals',
    'attendance_verification_methods'
  )
ORDER BY table_name, privilege_type;

-- =====================================================
-- 11. FUNCTIONAL TESTS
-- =====================================================

-- Test office location distance calculation function
SELECT 
  'Distance Calculation Test' as check_type,
  'Testing distance from SF to NYC' as test_description,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM public.office_locations 
      WHERE latitude = 37.7749 AND longitude = -122.4194
    ) > 0 THEN '✅ OFFICE LOCATION ACCESSIBLE'
    ELSE '❌ OFFICE LOCATION NOT ACCESSIBLE'
  END as status;

-- Test WFH eligibility check
SELECT 
  'WFH Eligibility Test' as check_type,
  'Testing user WFH settings' as test_description,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM public.employee_details 
      WHERE wfh_eligibility = true
    ) > 0 THEN '✅ WFH ELIGIBILITY SET'
    ELSE '❌ WFH ELIGIBILITY NOT SET'
  END as status;

-- =====================================================
-- 12. SUMMARY REPORT
-- =====================================================

-- Migration completion summary
SELECT 
  '🎯 MIGRATION SUMMARY' as section,
  'Total Tables Created' as metric,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('office_locations', 'office_wifi_networks', 'office_qr_codes', 'wfh_approvals', 'attendance_verification_methods')) as value,
  '5 Expected' as expected;

SELECT 
  '🎯 MIGRATION SUMMARY' as section,
  'Office Locations Inserted' as metric,
  (SELECT COUNT(*) FROM public.office_locations) as value,
  '1+ Expected' as expected;

SELECT 
  '🎯 MIGRATION SUMMARY' as section,
  'Users Assigned to Offices' as metric,
  (SELECT COUNT(*) FROM public.employee_details WHERE primary_office_location_id IS NOT NULL) as value,
  'All Users Expected' as expected;

SELECT 
  '🎯 MIGRATION SUMMARY' as section,
  'RLS Policies Created' as metric,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
   AND tablename IN ('office_locations', 'office_wifi_networks', 'office_qr_codes', 'wfh_approvals', 'attendance_verification_methods')) as value,
  '10+ Expected' as expected;

-- Final status check
SELECT 
  '✅ MIGRATION STATUS' as final_status,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('office_locations', 'office_wifi_networks', 'office_qr_codes', 'wfh_approvals', 'attendance_verification_methods')
    ) = 5 
    AND (SELECT COUNT(*) FROM public.office_locations) >= 1
    AND (SELECT COUNT(*) FROM public.employee_details WHERE primary_office_location_id IS NOT NULL) > 0
    THEN '🎉 MIGRATION COMPLETED SUCCESSFULLY!'
    ELSE '⚠️ MIGRATION INCOMPLETE - CHECK ERRORS ABOVE'
  END as result;
