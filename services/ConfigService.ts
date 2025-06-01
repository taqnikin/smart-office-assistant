// Smart Office Assistant - Secure Configuration Service
// Manages environment variables and secure configuration

import Constants from 'expo-constants';

interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  features: {
    debugLogging: boolean;
    errorReporting: boolean;
    analytics: boolean;
  };
  api: {
    timeout: number;
    maxRetryAttempts: number;
  };
  notifications: {
    enabled: boolean;
  };
  web: {
    cspEnabled: boolean;
  };
}

class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    try {
      console.log('ConfigService: Initializing configuration...');
      this.config = this.loadConfiguration();
      this.validateConfiguration();
      console.log('ConfigService: Configuration loaded successfully');

      // Debug configuration in development
      if (__DEV__) {
        this.debugConfiguration();
      }
    } catch (error) {
      console.error('ConfigService: Failed to initialize configuration:', error);
      // Provide fallback configuration to prevent app crash
      this.config = this.getFallbackConfiguration();
      console.warn('ConfigService: Using fallback configuration');
    }
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfiguration(): AppConfig {
    // Get environment variables from Expo Constants
    const expoConfig = Constants.expoConfig;
    const extra = expoConfig?.extra || {};

    // Enhanced fallback for web/development environment
    const getEnvVar = (key: string, defaultValue?: string): string => {
      // Try multiple sources for environment variables
      let value = extra[key] || process.env[key];

      // For web environment, also check window object if available
      if (!value && typeof window !== 'undefined' && (window as any).ENV) {
        value = (window as any).ENV[key];
      }

      // Log environment variable access for debugging
      if (__DEV__) {
        console.log(`ConfigService: ${key} = ${value ? '[SET]' : '[NOT_SET]'} (default: ${defaultValue})`);
      }

      return value || defaultValue || '';
    };

    const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
      const value = getEnvVar(key);
      return value === 'true' || value === '1' || (value === '' && defaultValue);
    };

    const getNumberEnvVar = (key: string, defaultValue: number): number => {
      const value = getEnvVar(key);
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      supabase: {
        url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://udnhkdnbvjzcxooukqrq.supabase.co'),
        anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs'),
      },
      app: {
        name: getEnvVar('EXPO_PUBLIC_APP_NAME', 'Smart Office Assistant'),
        version: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
        environment: (getEnvVar('EXPO_PUBLIC_ENVIRONMENT', 'development') as 'development' | 'staging' | 'production'),
      },
      security: {
        sessionTimeout: getNumberEnvVar('EXPO_PUBLIC_SESSION_TIMEOUT', 3600000), // 1 hour
        maxLoginAttempts: getNumberEnvVar('EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS', 5),
        lockoutDuration: getNumberEnvVar('EXPO_PUBLIC_LOCKOUT_DURATION', 900000), // 15 minutes
      },
      features: {
        debugLogging: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_DEBUG_LOGGING', __DEV__),
        errorReporting: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_ERROR_REPORTING', true),
        analytics: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_ANALYTICS', false),
      },
      api: {
        timeout: getNumberEnvVar('EXPO_PUBLIC_API_TIMEOUT', 30000), // 30 seconds
        maxRetryAttempts: getNumberEnvVar('EXPO_PUBLIC_MAX_RETRY_ATTEMPTS', 3),
      },
      notifications: {
        enabled: getBooleanEnvVar('EXPO_PUBLIC_NOTIFICATION_ENABLED', true),
      },
      web: {
        cspEnabled: getBooleanEnvVar('EXPO_PUBLIC_CSP_ENABLED', true),
      },
    };
  }

  private getFallbackConfiguration(): AppConfig {
    console.log('ConfigService: Creating fallback configuration...');
    return {
      supabase: {
        url: 'https://udnhkdnbvjzcxooukqrq.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs',
      },
      app: {
        name: 'Smart Office Assistant',
        version: '1.0.0',
        environment: 'development' as const,
      },
      security: {
        sessionTimeout: 3600000, // 1 hour
        maxLoginAttempts: 5,
        lockoutDuration: 900000, // 15 minutes
      },
      features: {
        debugLogging: true,
        errorReporting: true,
        analytics: false,
      },
      api: {
        timeout: 30000, // 30 seconds
        maxRetryAttempts: 3,
      },
      notifications: {
        enabled: true,
      },
      web: {
        cspEnabled: false,
      },
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate required Supabase configuration
    if (!this.config.supabase.url) {
      errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
    }

    if (!this.config.supabase.anonKey) {
      errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
    }

    // Validate URL format
    try {
      new URL(this.config.supabase.url);
    } catch {
      errors.push('EXPO_PUBLIC_SUPABASE_URL must be a valid URL');
    }

    // Validate security settings
    if (this.config.security.sessionTimeout < 300000) { // 5 minutes minimum
      errors.push('Session timeout must be at least 5 minutes');
    }

    if (this.config.security.maxLoginAttempts < 3) {
      errors.push('Max login attempts must be at least 3');
    }

    if (this.config.security.lockoutDuration < 60000) { // 1 minute minimum
      errors.push('Lockout duration must be at least 1 minute');
    }

    // Validate environment
    if (!['development', 'staging', 'production'].includes(this.config.app.environment)) {
      errors.push('Environment must be development, staging, or production');
    }

    if (errors.length > 0) {
      console.error('Configuration validation errors:', errors);
      // In development, log warnings instead of throwing to prevent app crash
      if (__DEV__) {
        console.warn('ConfigService: Validation failed but continuing in development mode');
      } else {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }
    }
  }

  // Public getters for configuration values
  get supabaseUrl(): string {
    return this.config.supabase.url;
  }

  get supabaseAnonKey(): string {
    return this.config.supabase.anonKey;
  }

  get appName(): string {
    return this.config.app.name;
  }

  get appVersion(): string {
    return this.config.app.version;
  }

  get environment(): string {
    return this.config.app.environment;
  }

  get isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  get sessionTimeout(): number {
    return this.config.security.sessionTimeout;
  }

  get maxLoginAttempts(): number {
    return this.config.security.maxLoginAttempts;
  }

  get lockoutDuration(): number {
    return this.config.security.lockoutDuration;
  }

  get debugLoggingEnabled(): boolean {
    return this.config.features.debugLogging;
  }

  get errorReportingEnabled(): boolean {
    return this.config.features.errorReporting;
  }

  get analyticsEnabled(): boolean {
    return this.config.features.analytics;
  }

  get apiTimeout(): number {
    return this.config.api.timeout;
  }

  get maxRetryAttempts(): number {
    return this.config.api.maxRetryAttempts;
  }

  get notificationsEnabled(): boolean {
    return this.config.notifications.enabled;
  }

  get cspEnabled(): boolean {
    return this.config.web.cspEnabled;
  }

  // Security helper methods
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getSecuritySetting(setting: keyof AppConfig['security']): number {
    return this.config.security[setting];
  }

  // Configuration debugging (only in development)
  debugConfiguration(): void {
    if (this.isDevelopment) {
      console.log('🔧 App Configuration:', {
        app: this.config.app,
        security: this.config.security,
        features: this.config.features,
        api: this.config.api,
        notifications: this.config.notifications,
        web: this.config.web,
        // Don't log sensitive data
        supabase: {
          url: this.config.supabase.url,
          anonKey: this.config.supabase.anonKey ? '[REDACTED]' : 'NOT_SET',
        },
      });
    }
  }

  // Validate runtime security requirements
  validateSecurityRequirements(): boolean {
    const issues: string[] = [];

    // Check for production security requirements
    if (this.isProduction) {
      if (this.debugLoggingEnabled) {
        issues.push('Debug logging should be disabled in production');
      }

      if (this.config.supabase.anonKey.includes('demo') || this.config.supabase.anonKey.includes('test')) {
        issues.push('Production should not use demo/test API keys');
      }
    }

    if (issues.length > 0) {
      console.warn('⚠️ Security validation warnings:', issues);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
export default configService;
