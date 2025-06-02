# 🔧 Production Environment Configuration

## 📋 **Environment Variables Template**

Create a `.env.production` file with the following variables:

```bash
# =============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# =============================================================================

# Supabase Configuration (REQUIRED)
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key_here

# Application Configuration
EXPO_PUBLIC_APP_NAME=Smart Office Assistant
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=production

# Security Configuration
EXPO_PUBLIC_SESSION_TIMEOUT=3600000
EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS=5
EXPO_PUBLIC_LOCKOUT_DURATION=900000

# Feature Flags
EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=false
EXPO_PUBLIC_ENABLE_ERROR_REPORTING=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# API Configuration
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_MAX_RETRY_ATTEMPTS=3

# Notification Configuration
EXPO_PUBLIC_NOTIFICATION_ENABLED=true

# Web Security Configuration
EXPO_PUBLIC_CSP_ENABLED=true
```

---

## 🔒 **Security Configuration Changes**

### **1. Remove Hardcoded Credentials from ConfigService.ts**

**Current Issue (Lines 104-105):**
```typescript
url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://udnhkdnbvjzcxooukqrq.supabase.co'),
anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
```

**Production Fix:**
```typescript
url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
```

### **2. Update Fallback Configuration (Lines 144-148)**

**Current Issue:**
```typescript
supabase: {
  url: process.env.NODE_ENV === 'development'
    ? 'https://udnhkdnbvjzcxooukqrq.supabase.co'
    : 'MISSING_SUPABASE_URL_ENV_VAR',
  anonKey: process.env.NODE_ENV === 'development'
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    : 'MISSING_SUPABASE_ANON_KEY_ENV_VAR',
},
```

**Production Fix:**
```typescript
supabase: {
  url: 'MISSING_SUPABASE_URL_ENV_VAR',
  anonKey: 'MISSING_SUPABASE_ANON_KEY_ENV_VAR',
},
```

### **3. Update Validation Logic**

**Add Production Environment Validation:**
```typescript
private validateConfiguration(): void {
  const errors: string[] = [];

  // Validate required Supabase configuration
  if (!this.config.supabase.url || this.config.supabase.url.includes('MISSING')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required and must be set');
  }

  if (!this.config.supabase.anonKey || this.config.supabase.anonKey.includes('MISSING')) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required and must be set');
  }

  // Production-specific validations
  if (this.config.app.environment === 'production') {
    if (this.config.features.debugLogging) {
      errors.push('Debug logging must be disabled in production');
    }
    
    if (this.config.supabase.url.includes('localhost') || this.config.supabase.url.includes('127.0.0.1')) {
      errors.push('Production cannot use localhost URLs');
    }
  }

  // ... rest of validation logic
}
```

---

## 🗄️ **Database Configuration**

### **1. Remove Development RLS Bypass**

**Delete this file completely:**
```bash
rm database/disable-rls-for-development.sql
```

### **2. Verify RLS Policies are Enabled**

**Run this SQL to ensure RLS is enabled:**
```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'employee_details', 'user_preferences', 
  'rooms', 'room_bookings', 'parking_spots', 
  'parking_reservations', 'attendance_records', 
  'chat_messages', 'system_settings'
);

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### **3. Production Seed Data Review**

**Review and update `supabase/migrations/003_seed_data.sql`:**

```sql
-- Keep essential system settings
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

-- Update room data for your actual office
INSERT INTO public.rooms (name, floor, capacity, has_av, has_whiteboard, has_teleconference, description) VALUES
('Conference Room A', '1st', 8, true, true, true, 'Main conference room with full AV setup'),
('Meeting Room B', '1st', 6, true, false, false, 'Small meeting room for team discussions'),
('Boardroom', '2nd', 12, true, true, true, 'Executive boardroom with premium facilities'),
('Huddle Space 1', '2nd', 4, false, true, false, 'Quick collaboration space'),
('Training Room', '3rd', 20, true, true, true, 'Large training and presentation room');

-- Update parking spots for your actual layout
-- Car parking spots (adjust numbers as needed)
INSERT INTO public.parking_spots (spot_number, spot_type, floor, section)
SELECT generate_series(1, 30), 'car', 'Ground', 'A';

-- Bike parking spots (adjust numbers as needed)
INSERT INTO public.parking_spots (spot_number, spot_type, floor, section)
SELECT generate_series(1, 20), 'bike', 'Ground', 'B';

-- DECISION NEEDED: Remove or keep demo users
-- Option 1: Remove demo users completely
-- Option 2: Keep for demonstration purposes
-- Current demo users: admin@smartoffice.com, user@smartoffice.com
```

---

## 📦 **Build Configuration**

### **1. Update app.json for Production**

```json
{
  "expo": {
    "name": "Smart Office Assistant",
    "slug": "smart-office-assistant",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.smartoffice"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.smartoffice"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### **2. Update .gitignore for Production**

```gitignore
# Environment files
.env
.env.local
.env.production
.env.staging

# Production builds
dist/
build/
web-build/

# Development files (exclude from production)
__tests__/
coverage/
*.test.ts
*.test.tsx
test-*.js
debug-*.js
create-*.js
check-*.js
fix-*.js

# Security - Never commit these
*.key
*.pem
*.p12
*.p8
*.mobileprovision
secrets/
config/secrets.json

# Development documentation
test-app-functionality.md
TESTING_SUMMARY.md
debug*.html
test-app.html
```

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment Verification**
- [ ] All environment variables set correctly
- [ ] No hardcoded credentials in code
- [ ] RLS policies enabled and tested
- [ ] Mock data completely removed
- [ ] Test files excluded from build
- [ ] Database schema deployed
- [ ] Production seed data reviewed

### **Security Verification**
- [ ] Debug logging disabled
- [ ] Error reporting enabled
- [ ] Analytics configured (if required)
- [ ] Session timeout configured
- [ ] Rate limiting configured
- [ ] CSP enabled for web

### **Functionality Verification**
- [ ] Authentication works with real users
- [ ] All screens load with database data
- [ ] Real-time features working
- [ ] Admin functionality tested
- [ ] Data export working
- [ ] Error handling tested

### **Performance Verification**
- [ ] App loads quickly
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Real-time updates smooth
- [ ] Offline handling (if applicable)

---

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Environment Variables Not Loading**
   - Verify `.env.production` file exists
   - Check variable names match exactly
   - Restart development server

2. **Database Connection Issues**
   - Verify Supabase URL and key
   - Check network connectivity
   - Verify RLS policies allow access

3. **Authentication Failures**
   - Check user exists in database
   - Verify email confirmation status
   - Check RLS policies for users table

4. **Real-time Features Not Working**
   - Verify Supabase realtime enabled
   - Check subscription setup
   - Verify network connectivity

### **Emergency Rollback**
If issues occur during deployment:
1. Revert to previous working commit
2. Restore previous environment configuration
3. Re-enable development mode temporarily
4. Fix issues incrementally
5. Re-deploy with fixes
