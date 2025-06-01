// Script to create real users in Supabase Auth and database
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Users to create (matching the previous mock users)
const usersToCreate = [
  {
    email: 'alex.johnson@smartoffice.com',
    password: 'user123',
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
  },
  {
    email: 'morgan.taylor@smartoffice.com',
    password: 'admin123',
    role: 'admin',
    employeeDetails: {
      full_name: 'Morgan Taylor',
      employee_id: 'EMP-2023-042',
      date_of_joining: '2023-06-10',
      work_hours: '8:30 AM - 4:30 PM',
      work_mode: 'in-office',
      department: 'Administration',
      position: 'Office Manager'
    }
  }
];

async function createRealUsers() {
  console.log('🔧 Creating real users in Supabase...\n');

  for (const userData of usersToCreate) {
    console.log(`📋 Creating user: ${userData.email}`);
    
    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for development
          data: {
            role: userData.role,
            full_name: userData.employeeDetails.full_name
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User ${userData.email} already exists, skipping auth creation`);
          
          // Try to sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password
          });
          
          if (signInError) {
            console.error(`   ❌ Could not sign in existing user: ${signInError.message}`);
            continue;
          }
          
          if (signInData.user) {
            console.log(`   ✅ Found existing user with ID: ${signInData.user.id}`);
            await createUserRecords(signInData.user.id, userData);
          }
        } else {
          console.error(`   ❌ Auth error: ${authError.message}`);
          continue;
        }
      } else if (authData.user) {
        console.log(`   ✅ Auth user created with ID: ${authData.user.id}`);
        await createUserRecords(authData.user.id, userData);
      }

    } catch (error) {
      console.error(`   ❌ Unexpected error creating ${userData.email}:`, error.message);
    }
  }

  console.log('\n🎉 User creation process completed!');
}

async function createUserRecords(userId, userData) {
  try {
    // First, sign in as the user to establish auth context for RLS
    console.log(`   📋 Signing in as user to establish auth context...`);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password
    });

    if (signInError) {
      console.error(`   ❌ Could not sign in: ${signInError.message}`);
      return;
    }

    // Step 2: Create user record in users table
    console.log(`   📋 Creating user record in database...`);
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

    // Step 3: Create employee details record
    console.log(`   📋 Creating employee details...`);
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

    // Step 4: Create default user preferences
    console.log(`   📋 Creating user preferences...`);
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

    // Sign out after creating records
    await supabase.auth.signOut();

  } catch (error) {
    console.error(`   ❌ Error creating user records: ${error.message}`);
    // Make sure to sign out even if there's an error
    await supabase.auth.signOut();
  }
}

// Test authentication with created users
async function testAuthentication() {
  console.log('\n🧪 Testing authentication with created users...\n');

  for (const userData of usersToCreate) {
    console.log(`📋 Testing login for: ${userData.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (error) {
        console.error(`   ❌ Login failed: ${error.message}`);
      } else if (data.user) {
        console.log(`   ✅ Login successful! User ID: ${data.user.id}`);
        
        // Test fetching user data
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.error(`   ❌ User data fetch failed: ${userError.message}`);
        } else {
          console.log(`   ✅ User data fetched: ${userRecord.email} (${userRecord.role})`);
        }

        // Sign out
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(`   ❌ Test error: ${error.message}`);
    }
  }
}

// Run the script
createRealUsers()
  .then(() => testAuthentication())
  .catch(console.error);
