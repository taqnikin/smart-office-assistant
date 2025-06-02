#!/usr/bin/env node

/**
 * Smart Office Assistant - User Verification Script
 * 
 * This script verifies that seed users were created correctly and can authenticate.
 * It tests both authentication and database record integrity.
 * 
 * Usage:
 *   node scripts/verify-users.js
 * 
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_ANON_KEY environment variable
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();
if (fs.existsSync('.env.seed')) {
  require('dotenv').config({ path: '.env.seed' });
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
  console.error('   - SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Initialize Supabase client for authentication testing
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test users from seed data
const TEST_USERS = [
  {
    email: 'admin@smartoffice.com',
    password: 'AdminPass123!',
    expectedRole: 'admin',
    expectedName: 'System Administrator'
  },
  {
    email: 'sarah.johnson@smartoffice.com',
    password: 'UserPass123!',
    expectedRole: 'user',
    expectedName: 'Sarah Johnson'
  },
  {
    email: 'michael.chen@smartoffice.com',
    password: 'UserPass123!',
    expectedRole: 'user',
    expectedName: 'Michael Chen'
  },
  {
    email: 'emily.davis@smartoffice.com',
    password: 'UserPass123!',
    expectedRole: 'user',
    expectedName: 'Emily Davis'
  },
  {
    email: 'david.wilson@smartoffice.com',
    password: 'UserPass123!',
    expectedRole: 'user',
    expectedName: 'David Wilson'
  }
];

/**
 * Test user authentication
 */
async function testUserAuth(userCredentials) {
  const { email, password, expectedRole, expectedName } = userCredentials;
  
  console.log(`🔐 Testing authentication for: ${email}`);
  
  try {
    // Test sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user data returned from authentication');
    }

    console.log(`   ✅ Authentication successful`);

    // Fetch user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    // Verify role
    if (userData.role !== expectedRole) {
      throw new Error(`Role mismatch: expected ${expectedRole}, got ${userData.role}`);
    }

    console.log(`   ✅ Role verified: ${userData.role}`);

    // Fetch employee details
    const { data: employeeData, error: employeeError } = await supabase
      .from('employee_details')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (employeeError) {
      throw new Error(`Failed to fetch employee details: ${employeeError.message}`);
    }

    // Verify name
    if (employeeData.full_name !== expectedName) {
      throw new Error(`Name mismatch: expected ${expectedName}, got ${employeeData.full_name}`);
    }

    console.log(`   ✅ Employee details verified: ${employeeData.full_name}`);

    // Fetch user preferences
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (preferencesError) {
      throw new Error(`Failed to fetch user preferences: ${preferencesError.message}`);
    }

    console.log(`   ✅ User preferences verified`);

    // Sign out to clean up
    await supabase.auth.signOut();

    console.log(`   🎉 User ${email} verification complete!\n`);

    return {
      success: true,
      user: userData,
      employee: employeeData,
      preferences: preferencesData
    };

  } catch (error) {
    console.error(`   ❌ Verification failed for ${email}: ${error.message}\n`);
    
    // Attempt to sign out in case of partial success
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      // Ignore sign out errors
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test database connectivity and basic queries
 */
async function testDatabaseConnectivity() {
  console.log('🔗 Testing database connectivity...');
  
  try {
    // Test basic query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log('   ✅ Database connectivity verified\n');
    return true;
  } catch (error) {
    console.error(`   ❌ Database connectivity failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  console.log('📊 Gathering user statistics...');
  
  try {
    // Count total users
    const { data: allUsers, error: userError } = await supabase
      .from('users')
      .select('role');

    if (userError) throw userError;

    const totalUsers = allUsers?.length || 0;
    const adminUsers = allUsers?.filter(u => u.role === 'admin').length || 0;
    const regularUsers = allUsers?.filter(u => u.role === 'user').length || 0;

    console.log(`   📈 Total users: ${totalUsers}`);
    console.log(`   👑 Admin users: ${adminUsers}`);
    console.log(`   👤 Regular users: ${regularUsers}\n`);

    return {
      total: totalUsers,
      admins: adminUsers,
      users: regularUsers
    };
  } catch (error) {
    console.error(`   ❌ Failed to get user statistics: ${error.message}\n`);
    return null;
  }
}

/**
 * Main verification function
 */
async function verifyUsers() {
  console.log('🚀 Starting user verification process...\n');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

  // Test database connectivity first
  const dbConnected = await testDatabaseConnectivity();
  if (!dbConnected) {
    console.error('💥 Database connectivity failed. Cannot proceed with verification.');
    process.exit(1);
  }

  // Get user statistics
  await getUserStats();

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  // Test each user
  for (const userCredentials of TEST_USERS) {
    const result = await testUserAuth(userCredentials);
    results.push(result);
    
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // Summary
  console.log('📈 Verification Summary:');
  console.log(`   ✅ Successful verifications: ${successCount}`);
  console.log(`   ❌ Failed verifications: ${failureCount}`);
  console.log(`   📊 Total tested: ${TEST_USERS.length}`);

  if (failureCount > 0) {
    console.log('\n⚠️  Some users failed verification. Check the error messages above.');
    console.log('💡 Common issues:');
    console.log('   - Users not created yet (run: npm run seed:users)');
    console.log('   - Incorrect passwords');
    console.log('   - Database connectivity issues');
    console.log('   - Missing environment variables');
    process.exit(1);
  } else {
    console.log('\n🎉 All users verified successfully!');
    console.log('\n📋 Verified login credentials:');
    TEST_USERS.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.expectedRole})`);
    });
    console.log('\n✨ Your authentication system is working correctly!');
  }
}

// Run the verification script
if (require.main === module) {
  verifyUsers().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyUsers, testUserAuth, TEST_USERS };
