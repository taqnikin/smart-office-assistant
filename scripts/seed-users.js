#!/usr/bin/env node

/**
 * Smart Office Assistant - User Seed Data Script
 * 
 * This script creates seed users with proper authentication using Supabase Admin API.
 * It creates users in both Supabase Auth and the application database with all required relationships.
 * 
 * Usage:
 *   node scripts/seed-users.js
 * 
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (Admin API access)
 * 
 * Production Notes:
 *   - This script should only be run once during initial deployment
 *   - Remove or update user data as needed for your organization
 *   - Ensure all sensitive information is properly configured
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from multiple sources
require('dotenv').config(); // Load .env
if (fs.existsSync('.env.seed')) {
  require('dotenv').config({ path: '.env.seed' }); // Load .env.seed if it exists
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Seed user data
const SEED_USERS = [
  {
    email: 'admin@smartoffice.com',
    password: 'AdminPass123!',
    role: 'admin',
    employeeDetails: {
      full_name: 'System Administrator',
      employee_id: 'ADMIN001',
      date_of_joining: '2024-01-01',
      work_hours: '8:00 AM - 5:00 PM',
      work_mode: 'in-office',
      department: 'IT Operations',
      position: 'System Administrator',
      phone_number: '+1 (555) 000-0001',
      location: 'Main Office'
    },
    preferences: {
      vehicle_type: 'Car',
      vehicle_registration: 'ADMIN001',
      checkin_reminder: true,
      checkin_reminder_time: 30,
      occupancy_reminder: true,
      occupancy_threshold: 80
    }
  },
  {
    email: 'sarah.johnson@smartoffice.com',
    password: 'UserPass123!',
    role: 'user',
    employeeDetails: {
      full_name: 'Sarah Johnson',
      employee_id: 'EMP001',
      date_of_joining: '2023-03-15',
      work_hours: '9:00 AM - 5:00 PM',
      work_mode: 'hybrid',
      department: 'Human Resources',
      position: 'HR Manager',
      phone_number: '+1 (555) 000-0002',
      location: 'Main Office'
    },
    preferences: {
      vehicle_type: 'Car',
      vehicle_registration: 'HR001',
      checkin_reminder: true,
      checkin_reminder_time: 15,
      occupancy_reminder: true,
      occupancy_threshold: 75
    }
  },
  {
    email: 'michael.chen@smartoffice.com',
    password: 'UserPass123!',
    role: 'user',
    employeeDetails: {
      full_name: 'Michael Chen',
      employee_id: 'EMP002',
      date_of_joining: '2023-06-01',
      work_hours: '8:30 AM - 4:30 PM',
      work_mode: 'in-office',
      department: 'Engineering',
      position: 'Senior Software Engineer',
      phone_number: '+1 (555) 000-0003',
      location: 'Main Office'
    },
    preferences: {
      vehicle_type: 'Bike',
      vehicle_registration: 'ENG001',
      checkin_reminder: true,
      checkin_reminder_time: 30,
      occupancy_reminder: false,
      occupancy_threshold: 85
    }
  },
  {
    email: 'emily.davis@smartoffice.com',
    password: 'UserPass123!',
    role: 'user',
    employeeDetails: {
      full_name: 'Emily Davis',
      employee_id: 'EMP003',
      date_of_joining: '2023-09-10',
      work_hours: '9:00 AM - 5:00 PM',
      work_mode: 'wfh',
      department: 'Marketing',
      position: 'Marketing Specialist',
      phone_number: '+1 (555) 000-0004',
      location: 'Remote'
    },
    preferences: {
      vehicle_type: 'None',
      vehicle_registration: null,
      checkin_reminder: false,
      checkin_reminder_time: 60,
      occupancy_reminder: true,
      occupancy_threshold: 70
    }
  },
  {
    email: 'david.wilson@smartoffice.com',
    password: 'UserPass123!',
    role: 'user',
    employeeDetails: {
      full_name: 'David Wilson',
      employee_id: 'EMP004',
      date_of_joining: '2023-11-20',
      work_hours: '8:00 AM - 4:00 PM',
      work_mode: 'hybrid',
      department: 'Finance',
      position: 'Financial Analyst',
      phone_number: '+1 (555) 000-0005',
      location: 'Main Office'
    },
    preferences: {
      vehicle_type: 'Car',
      vehicle_registration: 'FIN001',
      checkin_reminder: true,
      checkin_reminder_time: 45,
      occupancy_reminder: true,
      occupancy_threshold: 80
    }
  }
];

/**
 * Create a single user with all related data
 */
async function createUser(userData) {
  const { email, password, role, employeeDetails, preferences } = userData;
  
  console.log(`📝 Creating user: ${email} (${role})`);
  
  try {
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for seed users
      user_metadata: {
        role: role,
        full_name: employeeDetails.full_name
      }
    });

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth creation');
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created with ID: ${userId}`);

    // Step 2: Create user record in database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        role: role,
        is_first_time_user: false // Seed users are pre-configured
      })
      .select()
      .single();

    if (userError) {
      // Cleanup auth user if database insert fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`User record creation failed: ${userError.message}`);
    }

    console.log(`   ✅ User record created in database`);

    // Step 3: Create employee details
    const { data: employeeRecord, error: employeeError } = await supabase
      .from('employee_details')
      .insert({
        user_id: userId,
        ...employeeDetails
      })
      .select()
      .single();

    if (employeeError) {
      // Cleanup auth user if employee details creation fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Employee details creation failed: ${employeeError.message}`);
    }

    console.log(`   ✅ Employee details created`);

    // Step 4: Create user preferences
    const { data: preferencesRecord, error: preferencesError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        ...preferences
      })
      .select()
      .single();

    if (preferencesError) {
      // Cleanup auth user if preferences creation fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`User preferences creation failed: ${preferencesError.message}`);
    }

    console.log(`   ✅ User preferences created`);
    console.log(`   🎉 User ${email} created successfully!\n`);

    return {
      user: userRecord,
      employeeDetails: employeeRecord,
      preferences: preferencesRecord
    };

  } catch (error) {
    console.error(`   ❌ Failed to create user ${email}: ${error.message}\n`);
    throw error;
  }
}

/**
 * Check if a user already exists
 */
async function userExists(email) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single();
  
  return !error && data;
}

/**
 * Main function to seed all users
 */
async function seedUsers() {
  console.log('🚀 Starting user seed process...\n');
  console.log(`📊 Total users to create: ${SEED_USERS.length}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const userData of SEED_USERS) {
    try {
      // Check if user already exists
      const exists = await userExists(userData.email);
      if (exists) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...\n`);
        skipCount++;
        continue;
      }

      await createUser(userData);
      successCount++;
    } catch (error) {
      errorCount++;
      // Continue with next user even if one fails
    }
  }

  console.log('📈 Seed process completed!');
  console.log(`   ✅ Successfully created: ${successCount} users`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount} users`);
  console.log(`   ❌ Failed: ${errorCount} users`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some users failed to create. Check the error messages above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All users created successfully!');
    console.log('\n📋 Login credentials for testing:');
    SEED_USERS.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
  }
}

// Run the seed script
if (require.main === module) {
  seedUsers().catch(error => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
}

module.exports = { seedUsers, createUser, SEED_USERS };
