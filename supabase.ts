import { createClient } from '@supabase/supabase-js';
import { configService } from './services/ConfigService';

// Get Supabase configuration from secure config service
export const SUPABASE_URL = configService.supabaseUrl;
export const SUPABASE_ANON_KEY = configService.supabaseAnonKey;

// Initialize the Supabase client with secure configuration
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Add security configurations
      flowType: 'pkce', // Use PKCE for better security
      storage: undefined, // We'll implement secure storage separately
    },
    global: {
      headers: {
        'X-Client-Info': `${configService.appName}/${configService.appVersion}`,
      },
    },
    // Add timeout configuration
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Rate limiting for realtime events
      },
    },
  }
);