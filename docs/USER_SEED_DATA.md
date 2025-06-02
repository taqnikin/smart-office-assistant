# User Authentication Seed Data Implementation

## Overview

This document describes the implementation of seed data for the user authentication system in the Smart Office Assistant application. The seed data creates 5 users (1 admin + 4 regular users) with proper authentication credentials, employee details, and user preferences.

## 🏗️ Implementation Architecture

### Authentication Flow
- **Supabase Auth**: Primary authentication using Supabase's built-in auth system
- **Custom User Table**: Extended user information stored in application database
- **Admin API**: Uses Supabase Admin API for proper user creation with password hashing
- **Row Level Security**: Enforced through RLS policies for data access control

### Database Schema
```sql
-- Users table (extends Supabase auth.users)
users (
  id UUID PRIMARY KEY,           -- Links to auth.users.id
  email VARCHAR(255) UNIQUE,     -- User email address
  role VARCHAR(20),              -- 'user' | 'admin'
  is_first_time_user BOOLEAN,    -- Onboarding status
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Employee details table
employee_details (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(255),
  employee_id VARCHAR(50) UNIQUE,
  date_of_joining DATE,
  work_hours VARCHAR(50),
  work_mode VARCHAR(20),         -- 'in-office' | 'wfh' | 'hybrid'
  department VARCHAR(100),
  position VARCHAR(100),
  phone_number VARCHAR(20),
  location VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- User preferences table
user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vehicle_type VARCHAR(10),      -- 'Car' | 'Bike' | 'None'
  vehicle_registration VARCHAR(20),
  checkin_reminder BOOLEAN,
  checkin_reminder_time INTEGER,
  occupancy_reminder BOOLEAN,
  occupancy_threshold INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 👥 Seed User Data

### Admin User
- **Email**: admin@smartoffice.com
- **Password**: AdminPass123!
- **Role**: admin
- **Employee ID**: ADMIN001
- **Department**: IT Operations
- **Position**: System Administrator
- **Work Mode**: in-office

### Regular Users

#### 1. Sarah Johnson (HR Manager)
- **Email**: sarah.johnson@smartoffice.com
- **Password**: UserPass123!
- **Role**: user
- **Employee ID**: EMP001
- **Department**: Human Resources
- **Work Mode**: hybrid

#### 2. Michael Chen (Senior Software Engineer)
- **Email**: michael.chen@smartoffice.com
- **Password**: UserPass123!
- **Role**: user
- **Employee ID**: EMP002
- **Department**: Engineering
- **Work Mode**: in-office

#### 3. Emily Davis (Marketing Specialist)
- **Email**: emily.davis@smartoffice.com
- **Password**: UserPass123!
- **Role**: user
- **Employee ID**: EMP003
- **Department**: Marketing
- **Work Mode**: wfh (work from home)

#### 4. David Wilson (Financial Analyst)
- **Email**: david.wilson@smartoffice.com
- **Password**: UserPass123!
- **Role**: user
- **Employee ID**: EMP004
- **Department**: Finance
- **Work Mode**: hybrid

## 🚀 Implementation Methods

### Method 1: Automated Seed Script (Recommended)

The preferred method uses the Node.js seed script that properly creates users through the Supabase Admin API.

#### Prerequisites
1. **Environment Variables**:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Service Role Key**: Obtain from Supabase Dashboard → Settings → API → service_role key

#### Running the Seed Script
```bash
# Install dependencies (if not already installed)
npm install

# Run the seed script
npm run seed:users

# Alternative command
npm run db:seed
```

#### Script Features
- ✅ **Proper Authentication**: Uses Supabase Admin API for secure user creation
- ✅ **Password Hashing**: Automatic password hashing by Supabase
- ✅ **Atomic Operations**: Rollback on failure to maintain data consistency
- ✅ **Duplicate Prevention**: Checks for existing users before creation
- ✅ **Comprehensive Logging**: Detailed progress and error reporting
- ✅ **Production Ready**: Includes error handling and cleanup

### Method 2: Manual Database Migration (Alternative)

If you prefer to use SQL migrations, the seed data is also available in the migration file:

```bash
# Apply the production seed data migration
supabase db reset --linked
```

**Note**: This method only creates database records without proper Supabase Auth entries. Users created this way cannot authenticate until passwords are set through the Supabase Dashboard.

## 🔐 Security Considerations

### Password Security
- **Strong Passwords**: All seed users have strong passwords (12+ characters, mixed case, numbers, symbols)
- **Supabase Hashing**: Passwords are automatically hashed using Supabase's secure hashing algorithm
- **No Plaintext Storage**: Passwords are never stored in plaintext in the database

### Access Control
- **Row Level Security**: Enforced on all user-related tables
- **Role-Based Access**: Admin users have elevated permissions
- **Data Isolation**: Users can only access their own data (except admins)

### Production Deployment
- **Change Default Passwords**: Update all default passwords before production deployment
- **Remove Test Users**: Remove or replace seed users with actual employee accounts
- **Environment Security**: Ensure service role keys are properly secured
- **Regular Audits**: Periodically review user accounts and permissions

## 🧪 Testing and Verification

### Login Testing
After running the seed script, you can test authentication with any of the created users:

```javascript
// Example login test
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@smartoffice.com',
  password: 'AdminPass123!'
});
```

### Database Verification
Verify that all related data was created correctly:

```sql
-- Check user creation
SELECT u.email, u.role, ed.full_name, ed.employee_id 
FROM users u 
JOIN employee_details ed ON u.id = ed.user_id;

-- Check user preferences
SELECT u.email, up.vehicle_type, up.checkin_reminder 
FROM users u 
JOIN user_preferences up ON u.id = up.user_id;
```

### Admin Panel Testing
1. Login with admin credentials
2. Navigate to User Management section
3. Verify all users are visible and editable
4. Test user creation, editing, and role management

## 📋 Troubleshooting

### Common Issues

#### 1. Missing Service Role Key
```
❌ Missing required environment variables:
   - SUPABASE_SERVICE_ROLE_KEY
```
**Solution**: Add the service role key to your environment variables.

#### 2. User Already Exists
```
⏭️ User admin@smartoffice.com already exists, skipping...
```
**Solution**: This is normal behavior. The script skips existing users.

#### 3. Authentication Errors
```
❌ Auth creation failed: Invalid API key
```
**Solution**: Verify your Supabase URL and service role key are correct.

#### 4. Database Connection Issues
```
❌ Failed to create user: Connection timeout
```
**Solution**: Check your internet connection and Supabase project status.

### Manual Cleanup
If you need to remove seed users:

```sql
-- Delete user data (this will cascade to related tables)
DELETE FROM users WHERE email IN (
  'admin@smartoffice.com',
  'sarah.johnson@smartoffice.com',
  'michael.chen@smartoffice.com',
  'emily.davis@smartoffice.com',
  'david.wilson@smartoffice.com'
);
```

**Note**: You'll also need to delete the corresponding auth users from the Supabase Dashboard.

## 🔄 Maintenance

### Regular Tasks
1. **Password Updates**: Regularly update default passwords
2. **User Audits**: Review active users and their permissions
3. **Data Cleanup**: Remove inactive or test accounts
4. **Security Reviews**: Audit access patterns and permissions

### Production Deployment Checklist
- [ ] Update all default passwords
- [ ] Replace seed users with actual employees
- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow end-to-end
- [ ] Confirm RLS policies are working
- [ ] Document actual admin credentials securely
- [ ] Set up user management procedures

## 📚 Related Documentation
- [Database Schema](../DATABASE_SCHEMA.md)
- [Authentication Flow](../docs/AUTHENTICATION.md)
- [Production Deployment](../PRODUCTION_IMPLEMENTATION_TRACKER.md)
- [Security Guidelines](../docs/SECURITY.md)
