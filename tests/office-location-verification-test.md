# Office Location Verification System - Testing Guide

## 📍 **Overview**

This guide provides comprehensive testing procedures for the updated office location verification system that now uses database-driven office locations instead of hardcoded coordinates.

---

## 🔧 **System Changes Summary**

### **Before (Hardcoded)**
- Single office location hardcoded in `AttendanceScreen.tsx`
- Fixed coordinates: `37.7749, -122.4194` (San Francisco)
- Fixed radius: `100 meters`

### **After (Database-Driven)**
- Multiple office locations stored in `office_locations` table
- Dynamic loading from database
- User-specific primary office assignment
- Configurable geofence radius per office

---

## 🗄️ **Database Setup for Testing**

### **Step 1: Verify Current Office Locations**
```sql
-- Check existing office locations
SELECT 
  id, 
  name, 
  address, 
  latitude, 
  longitude, 
  geofence_radius, 
  is_active,
  created_at
FROM public.office_locations 
ORDER BY name;
```

### **Step 2: Add Test Office Locations**
```sql
-- Add New York Office for testing
INSERT INTO public.office_locations (
  id, name, address, latitude, longitude, geofence_radius, timezone, office_hours, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000101',
  'NYC Headquarters',
  '350 5th Avenue, New York, NY 10118',
  40.7484,                      -- Empire State Building coordinates
  -73.9857,
  150,                          -- 150 meter radius
  'America/New_York',
  '{"start": "09:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"]}',
  true
);

-- Add London Office for testing
INSERT INTO public.office_locations (
  id, name, address, latitude, longitude, geofence_radius, timezone, office_hours, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000102',
  'London Branch',
  '1 London Bridge, London SE1 9GF, UK',
  51.5045,                      -- London Bridge coordinates
  -0.0865,
  120,                          -- 120 meter radius
  'Europe/London',
  '{"start": "08:30", "end": "17:30", "days": ["mon","tue","wed","thu","fri"]}',
  true
);

-- Add a test office with small radius for testing
INSERT INTO public.office_locations (
  id, name, address, latitude, longitude, geofence_radius, timezone, office_hours, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000103',
  'Test Office Small Radius',
  '123 Test Street, Test City, TC 12345',
  37.7849,                      -- Slightly different from SF coordinates
  -122.4094,
  50,                           -- Small 50 meter radius for testing
  'America/Los_Angeles',
  '{"start": "08:00", "end": "18:00", "days": ["mon","tue","wed","thu","fri"]}',
  true
);
```

### **Step 3: Assign Users to Different Offices**
```sql
-- Assign admin user to NYC office
UPDATE public.employee_details 
SET primary_office_location_id = '00000000-0000-0000-0000-000000000101'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Assign regular user to London office
UPDATE public.employee_details 
SET primary_office_location_id = '00000000-0000-0000-0000-000000000102'
WHERE user_id = '00000000-0000-0000-0000-000000000002';

-- Assign another user to small radius test office
UPDATE public.employee_details 
SET primary_office_location_id = '00000000-0000-0000-0000-000000000103'
WHERE user_id = '00000000-0000-0000-0000-000000000003';
```

---

## 🧪 **Test Scenarios**

### **Test Case 1: Office Location Loading**

**Objective**: Verify that office locations are loaded from database correctly

**Steps**:
1. Open the attendance screen
2. Check that office locations are loaded (no loading errors in console)
3. Verify that user's primary office is displayed

**Expected Results**:
- Office locations load without errors
- User's assigned office is shown in the UI
- Office name and radius are displayed correctly

**SQL to Verify**:
```sql
-- Check user's assigned office
SELECT 
  u.email,
  ed.primary_office_location_id,
  ol.name as office_name,
  ol.geofence_radius
FROM public.users u
JOIN public.employee_details ed ON u.id = ed.user_id
LEFT JOIN public.office_locations ol ON ed.primary_office_location_id = ol.id
WHERE u.id = '[USER_ID]';
```

### **Test Case 2: GPS Verification with Different Offices**

**Objective**: Test location verification with different office coordinates

**Test Data**:
| Office | Latitude | Longitude | Radius | Test Location | Expected Result |
|--------|----------|-----------|--------|---------------|-----------------|
| NYC HQ | 40.7484 | -73.9857 | 150m | 40.7484, -73.9857 | ✅ Within range |
| NYC HQ | 40.7484 | -73.9857 | 150m | 40.7500, -73.9857 | ❌ Outside range |
| London | 51.5045 | -0.0865 | 120m | 51.5045, -0.0865 | ✅ Within range |
| Test Office | 37.7849 | -122.4094 | 50m | 37.7849, -122.4094 | ✅ Within range |
| Test Office | 37.7849 | -122.4094 | 50m | 37.7860, -122.4094 | ❌ Outside range |

**Steps**:
1. Login as user assigned to specific office
2. Select "In Office" status
3. Mock GPS location to test coordinates
4. Attempt check-in
5. Verify success/failure based on distance

**Mock GPS Testing** (for development):
```javascript
// Add this to AttendanceScreen.tsx for testing
const mockGPSLocation = {
  latitude: 40.7484,  // NYC coordinates
  longitude: -73.9857,
  accuracy: 5
};

// Replace actual GPS call with mock data
// setCurrentLocation(mockGPSLocation);
```

### **Test Case 3: Multiple Office Support**

**Objective**: Verify system works with multiple office locations

**Steps**:
1. Create users assigned to different offices
2. Test check-in for each user at their assigned office
3. Verify each user can only check in at their assigned office
4. Test cross-office check-in attempts (should fail)

**Expected Results**:
- User A (NYC office) can check in at NYC coordinates
- User B (London office) can check in at London coordinates
- User A cannot check in at London coordinates
- User B cannot check in at NYC coordinates

### **Test Case 4: Geofence Radius Testing**

**Objective**: Test different geofence radius values

**Test Coordinates** (distances from NYC HQ: 40.7484, -73.9857):
```
Distance Calculator: https://www.movable-type.co.uk/scripts/latlong.html

Test Points:
- 0m: 40.7484, -73.9857 (exact location)
- ~50m: 40.7488, -73.9857 (50m north)
- ~100m: 40.7493, -73.9857 (100m north)
- ~150m: 40.7498, -73.9857 (150m north)
- ~200m: 40.7502, -73.9857 (200m north)
```

**Steps**:
1. Set office radius to 150m
2. Test check-in from each distance point
3. Verify success/failure matches expected radius

**Expected Results**:
- 0m, 50m, 100m, 150m: ✅ Success
- 200m: ❌ Failure

### **Test Case 5: Database Configuration Changes**

**Objective**: Test real-time updates to office configuration

**Steps**:
1. Update office coordinates in database
2. Restart app or refresh attendance screen
3. Test location verification with new coordinates
4. Update geofence radius
5. Test with new radius

**SQL Commands**:
```sql
-- Update office coordinates
UPDATE public.office_locations 
SET 
  latitude = 40.7589,    -- Times Square coordinates
  longitude = -73.9851,
  geofence_radius = 200,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000101';

-- Verify update
SELECT name, latitude, longitude, geofence_radius, updated_at 
FROM public.office_locations 
WHERE id = '00000000-0000-0000-0000-000000000101';
```

### **Test Case 6: Error Handling**

**Objective**: Test error scenarios and edge cases

**Scenarios**:
1. **No Office Assigned**: User with no `primary_office_location_id`
2. **Inactive Office**: User assigned to office with `is_active = false`
3. **Deleted Office**: User assigned to non-existent office
4. **GPS Permission Denied**: Location permission not granted
5. **GPS Unavailable**: Device GPS is disabled

**Expected Results**:
- Clear error messages for each scenario
- Graceful fallback behavior
- No app crashes

---

## 🔍 **Validation Checklist**

### **Frontend Validation**
- [ ] Office locations load from database
- [ ] User's primary office is displayed correctly
- [ ] Office name and radius shown in UI
- [ ] Loading states work properly
- [ ] Error messages are clear and helpful

### **Backend Validation**
- [ ] Office location API returns correct data
- [ ] Distance calculation is accurate
- [ ] Geofence validation works correctly
- [ ] Office location ID is saved in attendance records

### **Database Validation**
- [ ] Office locations table has correct data
- [ ] User assignments are properly linked
- [ ] Attendance records include office_location_id
- [ ] Indexes are working for performance

### **Security Validation**
- [ ] Users can only see active office locations
- [ ] RLS policies prevent unauthorized access
- [ ] Location data is properly validated

---

## 📊 **Performance Testing**

### **Load Testing**
```sql
-- Test query performance with multiple offices
EXPLAIN ANALYZE 
SELECT * FROM public.office_locations 
WHERE is_active = true 
ORDER BY name;

-- Test user office assignment query
EXPLAIN ANALYZE 
SELECT ol.* 
FROM public.office_locations ol
JOIN public.employee_details ed ON ol.id = ed.primary_office_location_id
WHERE ed.user_id = '[USER_ID]' AND ol.is_active = true;
```

### **Expected Performance**
- Office location loading: < 100ms
- Distance calculation: < 10ms
- Check-in with location verification: < 500ms

---

## 🐛 **Common Issues and Solutions**

### **Issue 1: "No office location configured"**
**Cause**: User has no `primary_office_location_id` assigned
**Solution**: 
```sql
UPDATE public.employee_details 
SET primary_office_location_id = '[OFFICE_ID]'
WHERE user_id = '[USER_ID]';
```

### **Issue 2: Location verification always fails**
**Cause**: Incorrect coordinates or radius too small
**Solution**: 
- Verify office coordinates are correct
- Check geofence radius is reasonable (50-200m)
- Test with known good coordinates

### **Issue 3: Office locations not loading**
**Cause**: Database connection or RLS policy issues
**Solution**: 
- Check database connection
- Verify RLS policies allow read access
- Check user authentication

---

## 📱 **Mobile Testing Coordinates**

### **Real-World Test Locations**
```
San Francisco (Original):
- Latitude: 37.7749
- Longitude: -122.4194

New York (Empire State Building):
- Latitude: 40.7484
- Longitude: -73.9857

London (London Bridge):
- Latitude: 51.5045
- Longitude: -0.0865

Test with GPS Spoofing Apps:
- iOS: Location Simulator (Xcode)
- Android: Fake GPS Location apps
```

### **Distance Verification Tool**
Use online tools to verify distances:
- https://www.movable-type.co.uk/scripts/latlong.html
- https://www.distancefromto.net/

---

## ✅ **Success Criteria**

1. **Functionality**: All office location features work as expected
2. **Performance**: Location verification completes within 500ms
3. **Accuracy**: Distance calculations are within 5m accuracy
4. **Usability**: Clear feedback for users about location status
5. **Reliability**: System handles edge cases gracefully
6. **Security**: Only authorized users can access office data

---

**Testing Status**: ⏳ **Ready for Testing**
**Last Updated**: [Date]
**Tested By**: [Tester Name]
