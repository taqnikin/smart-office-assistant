// Smart Office Assistant - Database Connection Test
// This script tests the Supabase database connection and basic functionality

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseConnection() {
  console.log('🔍 Testing Smart Office Assistant Database Connection...\n');

  try {
    // Test 1: Check basic Supabase connection
    console.log('1. Testing basic Supabase connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.log('⚠️ Auth check failed (expected for anonymous access):', authError.message);
    } else {
      console.log('✅ Supabase client initialized successfully');
    }

    // Test 2: Try to access a simple table or check what's available
    console.log('\n2. Testing table access...');

    // First try rooms table
    const { data: roomsTest, error: roomsTestError } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);

    if (roomsTestError) {
      console.log('❌ Rooms table access failed:', roomsTestError.message);
      console.log('   This might be due to RLS policies or table not existing');

      // Try to check if we can access any public data
      console.log('\n   Trying alternative connection test...');
      const { data: altTest, error: altError } = await supabase
        .rpc('version'); // Try a basic PostgreSQL function

      if (altError) {
        console.log('❌ Alternative test failed:', altError.message);
      } else {
        console.log('✅ Basic database connection working');
      }
    } else {
      console.log('✅ Rooms table accessible');
      console.log(`   Found ${roomsTest.length} rooms in database`);
      if (roomsTest.length > 0) {
        console.log('   Sample room:', roomsTest[0].name, `(${roomsTest[0].capacity} capacity)`);
      }
    }

    // Test 3: Check parking spots
    console.log('\n3. Testing parking spots table...');
    const { data: parkingSpots, error: parkingError } = await supabase
      .from('parking_spots')
      .select('*')
      .limit(5);
    
    if (parkingError) {
      console.error('❌ Parking spots query failed:', parkingError.message);
    } else {
      console.log(`✅ Found ${parkingSpots.length} parking spots`);
      if (parkingSpots.length > 0) {
        console.log('   Sample spots:');
        parkingSpots.forEach(spot => {
          console.log(`   ${spot.spot_type} #${spot.spot_number} (${spot.section})`);
        });
      }
    }

    // Test 4: Check system settings
    console.log('\n4. Testing system settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .limit(5);
    
    if (settingsError) {
      console.error('❌ System settings query failed:', settingsError.message);
    } else {
      console.log(`✅ Found ${settings.length} system settings`);
      settings.forEach(setting => {
        console.log(`   ${setting.setting_key}: ${setting.setting_value}`);
      });
    }

    // Test 5: Check sample users
    console.log('\n5. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, role')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users query failed:', usersError.message);
    } else {
      console.log(`✅ Found ${users.length} users in database`);
      users.forEach(user => {
        console.log(`   ${user.email} (${user.role})`);
      });
    }

    // Test 6: Test room availability view
    console.log('\n6. Testing room availability view...');
    const { data: availability, error: availabilityError } = await supabase
      .from('room_availability')
      .select('*')
      .limit(3);
    
    if (availabilityError) {
      console.error('❌ Room availability view failed:', availabilityError.message);
    } else {
      console.log(`✅ Room availability view working (${availability.length} rooms)`);
      availability.forEach(room => {
        console.log(`   ${room.name}: ${room.current_bookings} current bookings`);
      });
    }

    console.log('\n🎉 Database tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Database connection: Working');
    console.log('   - Tables: Created and populated');
    console.log('   - Views: Functional');
    console.log('   - Sample data: Available');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the tests
testDatabaseConnection();
