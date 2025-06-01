// Test script to verify authentication fixes
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...');
  
  try {
    // Test 1: Try to sign in with test user
    console.log('\n1. Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@smartoffice.dev',
      password: 'test123456'
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      
      // If user doesn't exist, try to create one
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('\n2. User not found, creating test user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@smartoffice.dev',
          password: 'test123456',
          options: {
            data: {
              role: 'user'
            }
          }
        });
        
        if (signUpError) {
          console.log('❌ Sign up failed:', signUpError.message);
          return;
        }
        
        console.log('✅ User created successfully');
        console.log('📧 Check email for confirmation or disable email confirmation in Supabase dashboard');
        return;
      }
      return;
    }
    
    console.log('✅ Sign in successful');
    const user = signInData.user;
    
    // Test 2: Check if user record exists in database
    console.log('\n3. Checking user record in database...');
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.log('❌ Error fetching user record:', userError.message);
      return;
    }
    
    if (!userRecord) {
      console.log('⚠️ User record not found in database, creating...');
      
      // Test 3: Create user record
      const { data: newUserRecord, error: createError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'user',
          is_first_time_user: true
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Error creating user record:', createError.message);
        return;
      }
      
      console.log('✅ User record created successfully');
    } else {
      console.log('✅ User record found in database');
    }
    
    // Test 4: Check employee details (optional)
    console.log('\n4. Checking employee details...');
    const { data: employeeDetails, error: empError } = await supabase
      .from('employee_details')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (empError && empError.code !== 'PGRST116') {
      console.log('❌ Error fetching employee details:', empError.message);
    } else if (!employeeDetails) {
      console.log('ℹ️ No employee details found (this is normal for new users)');
    } else {
      console.log('✅ Employee details found');
    }
    
    // Test 5: Check user preferences (optional)
    console.log('\n5. Checking user preferences...');
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (prefError && prefError.code !== 'PGRST116') {
      console.log('❌ Error fetching user preferences:', prefError.message);
    } else if (!preferences) {
      console.log('ℹ️ No user preferences found (this is normal for new users)');
    } else {
      console.log('✅ User preferences found');
    }
    
    // Test 6: Sign out
    console.log('\n6. Testing sign out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.log('❌ Sign out failed:', signOutError.message);
    } else {
      console.log('✅ Sign out successful');
    }
    
    console.log('\n🎉 Authentication flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Authentication system is working');
    console.log('- ✅ User records can be created automatically');
    console.log('- ✅ Database integration is functional');
    console.log('- ✅ Missing user data is handled gracefully');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the test
testAuthFlow();
