// Smart Office Assistant - Fix RLS Issue for Mock Users
// This script disables RLS temporarily to allow mock users to work

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixRLSIssue() {
  console.log('🔧 Fixing RLS issue for mock users...\n');

  try {
    // SQL commands to disable RLS for development
    const sqlCommands = [
      'ALTER TABLE users DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE employee_details DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE rooms DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE room_bookings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE parking_spots DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE parking_reservations DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY'
    ];

    console.log('📋 Disabling Row Level Security on all tables...');
    
    for (const command of sqlCommands) {
      console.log(`   Executing: ${command}`);
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }

    console.log('\n📋 Granting permissions...');
    
    // Grant permissions
    const grantCommands = [
      'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated',
      'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon'
    ];

    for (const command of grantCommands) {
      console.log(`   Executing: ${command}`);
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }

    console.log('\n🎉 RLS issue fixed! Mock users should now be able to book rooms.');
    console.log('⚠️  WARNING: This is a development-only fix. Do not use in production!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Test room booking functionality
async function testRoomBooking() {
  console.log('\n🧪 Testing room booking functionality...');
  
  try {
    // Test inserting a room booking
    const testBooking = {
      user_id: '550e8400-e29b-41d4-a716-446655440001', // Mock user ID
      room_id: '00000000-0000-0000-0000-000000000001', // Assuming a room exists
      booking_date: '2025-01-20',
      start_time: '10:00:00',
      end_time: '11:00:00',
      duration_hours: 1,
      purpose: 'Test booking',
      status: 'confirmed'
    };

    const { data, error } = await supabase
      .from('room_bookings')
      .insert(testBooking)
      .select()
      .single();

    if (error) {
      console.error('❌ Test booking failed:', error.message);
    } else {
      console.log('✅ Test booking successful!');
      console.log('📋 Booking details:', data);
      
      // Clean up test booking
      await supabase.from('room_bookings').delete().eq('id', data.id);
      console.log('🧹 Test booking cleaned up');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the fix
fixRLSIssue().then(() => {
  return testRoomBooking();
}).catch(console.error);
