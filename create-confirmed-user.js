// Script to create a confirmed user for testing
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  console.log('🔧 Creating confirmed test user...');
  
  try {
    // Create a new user with a different email
    const testEmail = `testuser${Date.now()}@smartoffice.dev`;
    const testPassword = 'test123456';
    
    console.log(`📧 Creating user: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          role: 'user'
        }
      }
    });
    
    if (error) {
      console.log('❌ Error creating user:', error.message);
      return;
    }
    
    console.log('✅ User created successfully!');
    console.log('📋 Test Credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${data.user?.id}`);
    
    if (data.user && !data.user.email_confirmed_at) {
      console.log('\n⚠️ Email confirmation required!');
      console.log('📝 To fix this:');
      console.log('1. Go to Supabase Dashboard > Authentication > Settings');
      console.log('2. Disable "Enable email confirmations"');
      console.log('3. OR go to Authentication > Users and manually confirm the email');
    }
    
    // Try to create user record in database
    if (data.user) {
      console.log('\n🗄️ Creating user record in database...');
      
      const { data: userRecord, error: dbError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          role: 'user',
          is_first_time_user: true
        })
        .select()
        .single();
      
      if (dbError) {
        console.log('❌ Error creating user record:', dbError.message);
      } else {
        console.log('✅ User record created in database');
      }
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the script
createTestUser();
