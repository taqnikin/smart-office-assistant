// Create a test user for development
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestUser() {
  console.log('🔧 Creating test user...\n');

  const testUser = {
    email: 'test@smartoffice.dev',
    password: 'test123456',
    role: 'user',
    employeeDetails: {
      full_name: 'Test User',
      employee_id: 'TEST-001',
      date_of_joining: '2025-01-20',
      work_hours: '9:00 AM - 5:00 PM',
      work_mode: 'hybrid',
      department: 'Testing',
      position: 'Test Engineer'
    }
  };

  try {
    // Try to sign up the user
    console.log(`📋 Creating user: ${testUser.email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          role: testUser.role,
          full_name: testUser.employeeDetails.full_name
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   ⚠️  User already exists, trying to sign in...`);
        
        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (signInError) {
          console.error(`   ❌ Sign in failed: ${signInError.message}`);
          
          if (signInError.message.includes('Email not confirmed')) {
            console.log('   💡 Email confirmation required. Please check your email or use Supabase dashboard to confirm.');
            return;
          }
        } else {
          console.log(`   ✅ Signed in successfully! User ID: ${signInData.user.id}`);
          await createUserRecords(signInData.user.id, testUser);
        }
      } else {
        console.error(`   ❌ Auth error: ${authError.message}`);
      }
    } else if (authData.user) {
      console.log(`   ✅ User created! ID: ${authData.user.id}`);
      console.log(`   📧 Email confirmation required: ${!authData.user.email_confirmed_at}`);
      
      if (authData.user.email_confirmed_at) {
        await createUserRecords(authData.user.id, testUser);
      } else {
        console.log('   💡 Please confirm email before proceeding.');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function createUserRecords(userId, userData) {
  try {
    console.log(`   📋 Creating database records for user...`);

    // Create user record
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userData.email,
        role: userData.role,
        is_first_time_user: true
      });

    if (userError) {
      console.error(`   ❌ User table error: ${userError.message}`);
    } else {
      console.log(`   ✅ User record created`);
    }

    // Create employee details
    const { error: empError } = await supabase
      .from('employee_details')
      .upsert({
        user_id: userId,
        ...userData.employeeDetails
      });

    if (empError) {
      console.error(`   ❌ Employee details error: ${empError.message}`);
    } else {
      console.log(`   ✅ Employee details created`);
    }

    // Create user preferences
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        vehicle_type: 'None',
        checkin_reminder: true,
        checkin_reminder_time: 30,
        occupancy_reminder: true,
        occupancy_threshold: 80
      });

    if (prefError) {
      console.error(`   ❌ Preferences error: ${prefError.message}`);
    } else {
      console.log(`   ✅ User preferences created`);
    }

    // Sign out
    await supabase.auth.signOut();
    console.log(`   ✅ All records created successfully!`);

  } catch (error) {
    console.error(`   ❌ Error creating records: ${error.message}`);
  }
}

async function testLogin() {
  console.log('\n🧪 Testing login...\n');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@smartoffice.dev',
      password: 'test123456'
    });

    if (error) {
      console.error(`❌ Login failed: ${error.message}`);
    } else {
      console.log(`✅ Login successful! User ID: ${data.user.id}`);
      console.log(`📧 Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Test fetching user data
      const { data: userRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userRecord) {
        console.log(`✅ User data: ${userRecord.email} (${userRecord.role})`);
      }

      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
}

createTestUser().then(() => testLogin());
