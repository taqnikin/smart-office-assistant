// Script to check existing users and their status
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsers() {
  console.log('🔍 Checking existing users...\n');

  // Check users in the database
  try {
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*');

    if (dbError) {
      console.error('❌ Error fetching database users:', dbError.message);
    } else {
      console.log(`📋 Found ${dbUsers.length} users in database:`);
      dbUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - First time: ${user.is_first_time_user}`);
      });
    }
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }

  console.log('\n🧪 Testing authentication with known emails...\n');

  const testEmails = [
    { email: 'alex.johnson@smartoffice.com', password: 'user123' },
    { email: 'morgan.taylor@smartoffice.com', password: 'admin123' },
    { email: 'demo@smartoffice.com', password: 'demo123' }
  ];

  for (const creds of testEmails) {
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
        
        // Check if user exists in our database
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.log(`   ⚠️  User not in database: ${userError.message}`);
        } else {
          console.log(`   ✅ User found in database: ${userRecord.role}`);
        }

        // Sign out
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(`   ❌ Test error: ${error.message}`);
    }
  }
}

checkUsers();
