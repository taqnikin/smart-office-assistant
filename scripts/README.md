# Scripts Directory

This directory contains utility scripts for the Smart Office Assistant application.

## 📁 Available Scripts

### 🔐 User Management Scripts

#### `seed-users.js`
Creates seed users with proper authentication using Supabase Admin API.

**Usage:**
```bash
npm run seed:users
# or
node scripts/seed-users.js
```

**Requirements:**
- `SUPABASE_URL` environment variable
- `SUPABASE_SERVICE_ROLE_KEY` environment variable

**Features:**
- Creates 1 admin user and 4 regular users
- Proper password hashing through Supabase Auth
- Atomic operations with rollback on failure
- Duplicate prevention
- Comprehensive error handling

#### `verify-users.js`
Verifies that seed users were created correctly and can authenticate.

**Usage:**
```bash
npm run verify:users
# or
node scripts/verify-users.js
```

**Requirements:**
- `SUPABASE_URL` environment variable
- `SUPABASE_ANON_KEY` environment variable

**Features:**
- Tests authentication for all seed users
- Verifies database record integrity
- Checks user roles and permissions
- Validates employee details and preferences

### 📊 Comprehensive Data Scripts

#### `generate-comprehensive-seed-data.js`
Generates realistic seed data for all remaining database tables.

**Usage:**
```bash
npm run seed:data
# or
node scripts/generate-comprehensive-seed-data.js
```

**Requirements:**
- `SUPABASE_URL` environment variable
- `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Users must be created first (run `npm run seed:users`)

**Features:**
- Creates 28 room bookings (next 2 weeks)
- Creates 12 parking reservations (next week)
- Creates 109 attendance records (past 30 days)
- Creates 78 chat messages (past 14 days)
- Smart conflict resolution for bookings
- Realistic data patterns based on user work modes

#### `verify-seed-data.js`
Verifies that all seed data was created correctly across all tables.

**Usage:**
```bash
npm run verify:data
# or
node scripts/verify-seed-data.js
```

**Requirements:**
- `SUPABASE_URL` environment variable
- `SUPABASE_SERVICE_ROLE_KEY` environment variable

**Features:**
- Counts records in all tables
- Verifies data relationships and integrity
- Checks status distributions
- Validates foreign key references
- Provides comprehensive summary report

#### `check-setup.js`
Validates environment configuration before running seed scripts.

**Usage:**
```bash
npm run check:setup
# or
node scripts/check-setup.js
```

**Features:**
- Validates all required environment variables
- Checks for required files
- Provides setup instructions
- Confirms readiness for seed operations

## 🔧 Environment Setup

### Option 1: Use .env.seed file
1. Copy `.env.seed.template` to `.env.seed`
2. Fill in your Supabase credentials
3. Run the scripts

### Option 2: Use existing .env file
The scripts will automatically use existing environment variables if available.

### Required Environment Variables

```bash
# For seed-users.js
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For verify-users.js
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.seed.template .env.seed
   # Edit .env.seed with your Supabase credentials
   ```

2. **Create seed users:**
   ```bash
   npm run seed:users
   ```

3. **Generate comprehensive seed data:**
   ```bash
   npm run seed:data
   ```

4. **Verify everything was created:**
   ```bash
   npm run verify:data
   ```

### 🚀 Complete Workflow
```bash
# Complete setup in one go
npm run db:seed:all && npm run db:verify:all

# Or step by step
npm run check:setup      # Validate environment
npm run seed:users       # Create users
npm run seed:data        # Generate all data
npm run verify:data      # Verify everything
```

## 📋 Seed User Credentials

After running the seed script, you can test with these credentials:

- **Admin:** admin@smartoffice.com / AdminPass123!
- **HR Manager:** sarah.johnson@smartoffice.com / UserPass123!
- **Engineer:** michael.chen@smartoffice.com / UserPass123!
- **Marketing:** emily.davis@smartoffice.com / UserPass123!
- **Finance:** david.wilson@smartoffice.com / UserPass123!

## 🔒 Security Notes

- Service role keys have admin privileges - keep them secure
- Never commit `.env.seed` to version control
- Use different keys for development and production
- Change default passwords before production deployment

## 📚 Documentation

For detailed information, see:
- [User Seed Data Documentation](../docs/USER_SEED_DATA.md)
- [Comprehensive Seed Data Documentation](../docs/COMPREHENSIVE_SEED_DATA.md)
- [Production Implementation Tracker](../PRODUCTION_IMPLEMENTATION_TRACKER.md)

## 📊 Data Summary

After running all seed scripts, your database will contain:
- **5 Users**: 1 admin + 4 regular users with full authentication
- **28 Room Bookings**: Next 2 weeks of realistic meeting schedules
- **12 Parking Reservations**: Next week of vehicle reservations
- **109 Attendance Records**: Past 30 days of attendance history
- **78 Chat Messages**: Past 14 days of AI assistant interactions
- **12 System Settings**: Production-ready configuration

**Total: 244 records** providing a complete, realistic dataset for testing and demonstration.
