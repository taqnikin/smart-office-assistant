// Test configuration loading
console.log('=== Configuration Test ===');

// Test environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Test if we can import the config service
try {
  // For Node.js testing, we need to mock some React Native dependencies
  global.__DEV__ = true;
  
  // Mock expo-constants
  const mockConstants = {
    expoConfig: {
      extra: {
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        EXPO_PUBLIC_ENABLE_DEBUG_LOGGING: 'true'
      }
    }
  };
  
  console.log('Mock Constants:', mockConstants);
  console.log('=== Test Complete ===');
} catch (error) {
  console.error('Test failed:', error.message);
}
