// Test with existing demo users from the database
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testExistingUsers() {
  console.log('🔍 Testing existing demo users...\n');

  // Test users from the create-demo-users.sql file
  const testCredentials = [
    { email: 'demo@smartoffice.com', password: 'demo123' },
    { email: 'admin@smartoffice.com', password: 'admin123' },
    { email: 'user@smartoffice.com', password: 'user123' },
    { email: 'test@smartoffice.dev', password: 'test123456' }
  ];

  for (const creds of testCredentials) {
    console.log(`📋 Testing: ${creds.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password
      });

      if (error) {
        console.error(`   ❌ Login failed: ${error.message}`);
      } else if (data.user) {
        console.log(`   ✅ Login successful! User ID: ${data.user.id}`);
        console.log(`   📧 Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   🔑 Role: ${data.user.user_metadata?.role || 'Not set'}`);
        
        // Check if user exists in our database
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.log(`   ⚠️  User not in database: ${userError.message}`);
          
          // Try to create user record
          console.log(`   📋 Creating user record...`);
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: data.user.user_metadata?.role || 'user',
              is_first_time_user: true
            });

          if (createError) {
            console.error(`   ❌ Could not create user record: ${createError.message}`);
          } else {
            console.log(`   ✅ User record created`);
          }
        } else {
          console.log(`   ✅ User found in database: ${userRecord.role}`);
        }

        // Sign out
        await supabase.auth.signOut();
        console.log('');
      }
    } catch (error) {
      console.error(`   ❌ Test error: ${error.message}`);
    }
  }
}

// Also try to create a simple user with a basic email
async function createSimpleUser() {
  console.log('\n🔧 Creating simple test user...\n');

  const simpleUser = {
    email: 'dev@test.com',
    password: 'password123'
  };

  try {
    console.log(`📋 Creating user: ${simpleUser.email}`);
    const { data, error } = await supabase.auth.signUp({
      email: simpleUser.email,
      password: simpleUser.password,
      options: {
        data: {
          role: 'user'
        }
      }
    });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ User created: ${data.user?.id}`);
      console.log(`   📧 Email confirmation required: ${!data.user?.email_confirmed_at}`);
    }
  } catch (error) {
    console.error(`   ❌ Unexpected error: ${error.message}`);
  }
}

testExistingUsers().then(() => createSimpleUser());
