// Test script to debug authentication issues
const { configService } = require('./services/ConfigService');

console.log('=== Authentication Debug Test ===');

// Test environment variables
console.log('Environment Variables:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

// Test config service
try {
  console.log('\nConfig Service:');
  console.log('Supabase URL:', configService.supabaseUrl);
  console.log('Supabase Key:', configService.supabaseAnonKey ? 'SET' : 'NOT SET');
  console.log('Debug Logging:', configService.debugLoggingEnabled);
} catch (error) {
  console.error('Config Service Error:', error.message);
}

console.log('\n=== Test Complete ===');
