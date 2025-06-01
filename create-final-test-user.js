// Create a test user with a realistic email for final testing
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createFinalTestUser() {
  console.log('🔧 Creating final test user...\n');

  // Use a realistic email format
  const testUser = {
    email: 'alex.johnson@company.com',
    password: 'password123',
    role: 'user',
    employeeDetails: {
      full_name: 'Alex Johnson',
      employee_id: 'EMP-2025-001',
      date_of_joining: '2025-01-15',
      work_hours: '9:00 AM - 5:00 PM',
      work_mode: 'hybrid',
      department: 'Engineering',
      position: 'Software Developer'
    }
  };

  try {
    console.log(`📋 Creating user: ${testUser.email}`);
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          role: testUser.role,
          full_name: testUser.employeeDetails.full_name
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`   ⚠️  User already exists`);
      } else {
        console.error(`   ❌ Error: ${error.message}`);
      }
    } else {
      console.log(`   ✅ User created: ${data.user?.id}`);
      console.log(`   📧 Email confirmation required: ${!data.user?.email_confirmed_at}`);
      console.log(`   💡 Please confirm email in Supabase dashboard or disable email confirmation`);
    }
  } catch (error) {
    console.error(`   ❌ Unexpected error: ${error.message}`);
  }
}

async function testCurrentSetup() {
  console.log('\n🧪 Testing current authentication setup...\n');
  
  // Test the authentication flow with a non-existent user to see the error
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    });

    if (error) {
      console.log(`✅ Authentication properly rejects invalid credentials: ${error.message}`);
    }
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
  }

  // Test database connection
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*');

    if (roomsError) {
      console.error(`❌ Database connection error: ${roomsError.message}`);
    } else {
      console.log(`✅ Database connection working - ${rooms.length} rooms available`);
    }
  } catch (error) {
    console.error(`❌ Database test error: ${error.message}`);
  }
}

console.log('🎉 Migration to Real Supabase Authentication Complete!\n');
console.log('📋 Summary of changes:');
console.log('   ✅ Removed all mock user logic from AuthContext');
console.log('   ✅ Updated all API functions to use only Supabase database');
console.log('   ✅ Implemented proper user data fetching from database');
console.log('   ✅ Updated employee details and preferences management');
console.log('   ✅ Removed AsyncStorage dependencies for user data');
console.log('   ✅ All room booking functions now use real authentication\n');

console.log('🔧 To complete the setup:');
console.log('   1. Go to Supabase Dashboard > Authentication > Settings');
console.log('   2. Disable "Enable email confirmations" for development');
console.log('   3. Or manually confirm user emails in the Users tab');
console.log('   4. Create test users and test the complete flow\n');

createFinalTestUser().then(() => testCurrentSetup());
