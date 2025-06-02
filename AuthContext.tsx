import React, { createContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { userAPI } from './lib/supabase-api';
import { errorLogger, ErrorCategory } from './services/ErrorLoggingService';
import { secureStorage } from './services/SecureStorageService';
import { validationService } from './services/ValidationService';
import { configService } from './services/ConfigService';
import { chatbotWebhookService } from './services/ChatbotWebhookService';
import { sessionManagementService } from './services/SessionManagementService';

// Define user employee details interface
export interface EmployeeDetails {
  fullName: string;
  employeeId: string;
  dateOfJoining: string;
  workHours: string;
  workMode: string;
}

// Define user preferences interface
export interface UserPreferences {
  vehicle?: {
    type: 'Car' | 'Bike' | 'Public Transport' | 'Walk' | 'None';
    registrationNumber?: string;
  };
  reminders: {
    checkinReminder: boolean;
    checkinReminderTime: number; // minutes before
    occupancyReminder: boolean;
    occupancyThreshold: number; // percentage
  };
}

interface AuthContextValue {
  user: { 
    id: string; 
    role: string; 
    email: string;
    employeeDetails?: EmployeeDetails;
    preferences?: UserPreferences;
    isFirstTimeUser: boolean;
  } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateEmployeeDetails: (details: EmployeeDetails) => Promise<void>;
  updateUserPreferences: (preferences: UserPreferences) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}



// Create context with default values to prevent "signIn is not a function" errors
const defaultContextValue: AuthContextValue = {
  user: null,
  loading: true,
  signIn: async () => ({ error: new Error('Auth context not initialized') }),
  signOut: async () => { console.warn('Auth context not initialized') },
  updateEmployeeDetails: async () => { console.warn('Auth context not initialized') },
  updateUserPreferences: async () => { console.warn('Auth context not initialized') },
  completeOnboarding: async () => { console.warn('Auth context not initialized') }
};

export const AuthContext = createContext<AuthContextValue>(defaultContextValue);

// Helper for storage - works on both web and native
const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  }
};

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  vehicle: {
    type: 'None',
  },
  reminders: {
    checkinReminder: true,
    checkinReminderTime: 15, // 15 minutes before
    occupancyReminder: false,
    occupancyThreshold: 70, // 70%
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true to check for session

  // Helper function to trigger chatbot webhook notification for first-time users only
  const triggerChatbotWebhookForFirstTimeUser = async (userData: any) => {
    try {
      if (!configService.chatbotEnabled) {
        console.log('🤖 ChatbotWebhook: Disabled in configuration, skipping');
        return;
      }

      // Only trigger webhook for first-time users
      if (!userData.isFirstTimeUser) {
        console.log('🤖 ChatbotWebhook: Not a first-time user, skipping webhook call');
        return;
      }

      console.log('🤖 ChatbotWebhook: Triggering webhook for FIRST-TIME user authentication');

      // Get employee details with WFH eligibility
      let employeeDetailsWithWFH = null;
      if (userData.employeeDetails) {
        try {
          employeeDetailsWithWFH = await userAPI.getEmployeeDetailsWithWFHEligibility(userData.id);
        } catch (error) {
          console.warn('🤖 ChatbotWebhook: Could not fetch WFH eligibility, using basic employee details');
          // Transform AuthContext format to database format
          const authEmployeeDetails = userData.employeeDetails;
          employeeDetailsWithWFH = {
            id: '',
            user_id: userData.id,
            full_name: authEmployeeDetails.fullName || '',
            employee_id: authEmployeeDetails.employeeId || '',
            date_of_joining: authEmployeeDetails.dateOfJoining || '',
            work_hours: authEmployeeDetails.workHours || '9:00 AM - 5:00 PM',
            work_mode: authEmployeeDetails.workMode || 'hybrid',
            department: '',
            position: '',
            phone_number: '',
            location: '',
            created_at: '',
            updated_at: '',
            wfh_eligibility: true // Default to true for fallback
          };
        }
      }

      const result = await chatbotWebhookService.notifyUserAuthentication(
        userData.id,
        userData.isFirstTimeUser,
        employeeDetailsWithWFH
      );

      if (result.success) {
        console.log('✅ ChatbotWebhook: Successfully notified chatbot system for first-time user');
      } else {
        console.warn('⚠️ ChatbotWebhook: Failed to notify chatbot system:', result.error);
      }
    } catch (error) {
      console.error('❌ ChatbotWebhook: Unexpected error:', error);
      // Don't throw - webhook failure shouldn't block authentication
    }
  };

  // Helper function to fetch complete user data from database with timeout and parallel loading
  const fetchUserData = async (userId: string) => {
    try {
      console.log('🔍 fetchUserData: Starting for userId:', userId);

      // Add overall timeout for the entire fetch operation
      const fetchTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('fetchUserData timeout')), 15000); // 15 second timeout
      });

      const fetchOperation = async () => {
        // Get current auth user for email and metadata
        console.log('📡 fetchUserData: Getting auth user...');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          console.error('❌ fetchUserData: No authenticated user found');
          return null;
        }
        console.log('✅ fetchUserData: Auth user found:', authUser.email);

        // Try to get user record, create if doesn't exist
        console.log('🔄 fetchUserData: Getting current user record...');
        const startUserRecord = Date.now();
        let userRecord = await userAPI.getCurrentUser();
        const endUserRecord = Date.now();
        console.log(`⏱️ fetchUserData: getCurrentUser took ${endUserRecord - startUserRecord}ms`);

        if (!userRecord) {
          console.log('⚠️ fetchUserData: User record not found, creating new user record...');

          // Create user record
          const newUserData = {
            id: authUser.id,
            email: authUser.email || '',
            role: (authUser.user_metadata?.role as 'user' | 'admin') || 'user',
            is_first_time_user: true
          };

          try {
            console.log('🔄 fetchUserData: Creating user record...');
            const startUpsert = Date.now();
            userRecord = await userAPI.upsertUser(newUserData);
            const endUpsert = Date.now();
            console.log(`⏱️ fetchUserData: upsertUser took ${endUpsert - startUpsert}ms`);
            console.log('✅ fetchUserData: User record created successfully');
          } catch (createError) {
            console.error('❌ fetchUserData: Failed to create user record:', createError);
            // Create a minimal user object for the session
            userRecord = {
              ...newUserData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted: false
            };
          }
        } else {
          console.log('✅ fetchUserData: User record found:', userRecord.email);
        }

        // Fetch additional data in parallel to improve performance
        console.log('🔄 fetchUserData: Fetching additional data in parallel...');
        const startParallel = Date.now();

        const [employeeDetails, preferences, isOnboarded] = await Promise.allSettled([
          userAPI.getEmployeeDetails(userId),
          userAPI.getUserPreferences(userId),
          storage.getItem(`onboarded-${userId}`)
        ]);

        const endParallel = Date.now();
        console.log(`⏱️ fetchUserData: Parallel fetch took ${endParallel - startParallel}ms`);

        // Process results from parallel fetch
        const employeeDetailsResult = employeeDetails.status === 'fulfilled' ? employeeDetails.value : null;
        const preferencesResult = preferences.status === 'fulfilled' ? preferences.value : null;
        const isOnboardedResult = isOnboarded.status === 'fulfilled' ? isOnboarded.value : null;

        console.log('📋 fetchUserData: Parallel fetch results:', {
          employeeDetails: !!employeeDetailsResult,
          preferences: !!preferencesResult,
          isOnboarded: !!isOnboardedResult
        });

        // Transform employee details to match AuthContext interface
        const transformedEmployeeDetails = employeeDetailsResult ? {
          fullName: employeeDetailsResult.full_name,
          employeeId: employeeDetailsResult.employee_id,
          dateOfJoining: employeeDetailsResult.date_of_joining,
          workHours: employeeDetailsResult.work_hours,
          workMode: employeeDetailsResult.work_mode,
        } : undefined;

        // Transform preferences to match AuthContext interface
        const transformedPreferences = preferencesResult ? {
          vehicle: preferencesResult.vehicle_type ? {
            type: preferencesResult.vehicle_type,
            registrationNumber: preferencesResult.vehicle_registration,
          } : undefined,
          reminders: {
            checkinReminder: preferencesResult.checkin_reminder,
            checkinReminderTime: preferencesResult.checkin_reminder_time,
            occupancyReminder: preferencesResult.occupancy_reminder,
            occupancyThreshold: preferencesResult.occupancy_threshold,
          },
        } : DEFAULT_PREFERENCES;

        // Create final user object
        if (!userRecord) {
          console.error('❌ fetchUserData: No user record available');
          return null;
        }

        const finalUser = {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
          employeeDetails: transformedEmployeeDetails,
          preferences: transformedPreferences,
          isFirstTimeUser: isOnboardedResult ? false : (userRecord.is_first_time_user ?? true),
        };

        console.log('✅ fetchUserData: Final user object created:', {
          id: finalUser.id,
          email: finalUser.email,
          role: finalUser.role,
          hasEmployeeDetails: !!finalUser.employeeDetails,
          isFirstTimeUser: finalUser.isFirstTimeUser
        });

        return finalUser;
      };

      // Race the fetch operation against the timeout
      const result = await Promise.race([fetchOperation(), fetchTimeout]);
      return result;
    } catch (error) {
      console.error('💥 fetchUserData: Error occurred:', error);
      if (error instanceof Error && error.message === 'fetchUserData timeout') {
        console.error('⏰ fetchUserData: Operation timed out after 15 seconds');
      }
      return null;
    }
  };

  // Update employee details
  const updateEmployeeDetails = useCallback(async (details: EmployeeDetails) => {
    if (!user) return;

    try {
      // Transform details to database format
      const dbDetails = {
        user_id: user.id,
        full_name: details.fullName,
        employee_id: details.employeeId,
        date_of_joining: details.dateOfJoining,
        work_hours: details.workHours,
        work_mode: details.workMode as 'in-office' | 'wfh' | 'hybrid',
      };

      // Update in database
      await userAPI.upsertEmployeeDetails(dbDetails);

      // Update local state
      const updatedUser = {
        ...user,
        employeeDetails: details,
      };

      setUser(updatedUser);
    } catch (err) {
      console.error('Error updating employee details:', err);
      throw err;
    }
  }, [user]);

  // Update user preferences
  const updateUserPreferences = useCallback(async (preferences: UserPreferences) => {
    if (!user) return;

    try {
      // Transform preferences to database format
      const dbPreferences = {
        user_id: user.id,
        vehicle_type: preferences.vehicle?.type || 'None',
        vehicle_registration: preferences.vehicle?.registrationNumber || undefined,
        checkin_reminder: preferences.reminders.checkinReminder,
        checkin_reminder_time: preferences.reminders.checkinReminderTime,
        occupancy_reminder: preferences.reminders.occupancyReminder,
        occupancy_threshold: preferences.reminders.occupancyThreshold,
      };

      // Update in database
      await userAPI.upsertUserPreferences(dbPreferences);

      // Update local state
      const updatedUser = {
        ...user,
        preferences: {
          ...user.preferences,
          ...preferences,
        },
      };

      setUser(updatedUser);
    } catch (err) {
      console.error('Error updating user preferences:', err);
      throw err;
    }
  }, [user]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
    if (!user) {
      console.error('Cannot complete onboarding: no user found');
      throw new Error('No user found');
    }

    try {
      console.log('Completing onboarding for user:', user.id);

      // Update local state first to ensure immediate UI update
      const updatedUser = {
        ...user,
        isFirstTimeUser: false,
      };

      setUser(updatedUser);

      // Store onboarding completion in local storage
      await storage.setItem(`onboarded-${user.id}`, 'true');

      // Try to update user record in database (non-blocking)
      try {
        await userAPI.updateUser(user.id, { is_first_time_user: false });
        console.log('Database updated successfully');
      } catch (dbError) {
        console.warn('Failed to update database, but onboarding marked as complete locally:', dbError);
        // Don't throw here as the local state is already updated
      }

      console.log('Onboarding completed successfully');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  }, [user]);

  // signIn uses Supabase authentication and retrieves user data from database
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Starting sign in process...');
      console.log('SignIn: Supabase configuration check:', {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_ANON_KEY,
        supabaseClient: !!supabase
      });

      // Validate Supabase configuration
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('SignIn: Missing Supabase configuration');
        return { error: new Error('Authentication service is not properly configured. Please check your environment variables.') };
      }

      // Validate input
      const emailValidation = validationService.validateEmail(email);
      if (!emailValidation.isValid) {
        return { error: new Error(emailValidation.errors[0]) };
      }

      if (!password) {
        return { error: new Error('Password is required') };
      }

      const sanitizedEmail = emailValidation.sanitizedValue!;

      // Check if account is locked
      const isLocked = await secureStorage.isAccountLocked(sanitizedEmail);
      if (isLocked) {
        const remainingTime = await secureStorage.getRemainingLockoutTime(sanitizedEmail);
        const minutes = Math.ceil(remainingTime / 60000);
        return { error: new Error(`Account is temporarily locked. Try again in ${minutes} minutes.`) };
      }

      if (configService.debugLoggingEnabled) {
        console.log('Attempting to sign in with:', sanitizedEmail);
      }

      // Test Supabase connection first
      try {
        console.log('Testing Supabase connection...');
        const connectionTest = await supabase.auth.getSession();
        console.log('Supabase connection test result:', !!connectionTest);
      } catch (connectionError) {
        console.error('Supabase connection test failed:', connectionError);
        return { error: new Error('Unable to connect to authentication service. Please check your internet connection.') };
      }

      // Authenticate with Supabase
      console.log('Attempting authentication with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password
      });

      if (error) {
        console.error('Sign in error:', error.message);

        // Record failed login attempt
        await secureStorage.recordLoginAttempt(sanitizedEmail, false);

        await errorLogger.logAuthError(error, {
          screen: 'AuthContext',
          action: 'signIn',
          userId: undefined,
          additionalData: { email: sanitizedEmail }
        });
        return { error };
      }

      if (!data.user) {
        await secureStorage.recordLoginAttempt(sanitizedEmail, false);
        return { error: new Error('No user returned from authentication') };
      }

      // Record successful login
      await secureStorage.recordLoginAttempt(sanitizedEmail, true);

      const supaUser = data.user;

      // Fetch user data from database
      const userData = await fetchUserData(supaUser.id);

      if (userData) {
        setUser(userData);
        // Initialize chatbot session for the user
        await sessionManagementService.getOrCreateSession(userData.id);
        // Trigger chatbot webhook only for first-time users
        triggerChatbotWebhookForFirstTimeUser(userData);
      } else {
        console.log('User data not found, creating minimal user object');
        // Create a minimal user object if database fetch fails
        const minimalUser = {
          id: supaUser.id,
          email: supaUser.email || '',
          role: 'user',
          employeeDetails: undefined,
          preferences: DEFAULT_PREFERENCES,
          isFirstTimeUser: true,
        };
        setUser(minimalUser);
        // Initialize chatbot session for minimal user
        await sessionManagementService.getOrCreateSession(minimalUser.id);
        // Trigger chatbot webhook for first-time minimal user
        triggerChatbotWebhookForFirstTimeUser(minimalUser);
      }

      return { error: null };
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      const error = err instanceof Error ? err : new Error('An unexpected error occurred');
      await errorLogger.logAuthError(error, {
        screen: 'AuthContext',
        action: 'signIn',
        userId: undefined,
        additionalData: { email, unexpected: true }
      });
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Signing out user');

      // Clear chatbot sessions
      await sessionManagementService.clearAllSessions();

      // Clear user state
      setUser(null);

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      // Even if there's an error, clear sessions
      await sessionManagementService.clearAllSessions();
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync auth state on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔍 AuthContext: Starting session check...');
        console.log('🌐 AuthContext: Supabase URL:', SUPABASE_URL);
        console.log('⚙️ AuthContext: Environment check:', {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SUPABASE_ANON_KEY,
          urlLength: SUPABASE_URL?.length,
          keyLength: SUPABASE_ANON_KEY?.length
        });
        console.log('⏰ AuthContext: Setting loading to true');

        // Validate Supabase configuration
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.error('AuthContext: Missing Supabase configuration');
          setLoading(false);
          return;
        }

        // Add a timeout to prevent hanging
        console.log('⏱️ AuthContext: Creating 8s timeout for session check');
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 8000);
        });

        console.log('📡 AuthContext: Calling supabase.auth.getSession()...');
        const sessionPromise = supabase.auth.getSession();

        // Race between session check and timeout
        console.log('🏁 AuthContext: Racing session check vs timeout...');
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (error) {
          console.error('❌ Session retrieval error:', error.message);
          setLoading(false);
          return;
        }

        const session = data.session;
        console.log('✅ AuthContext: Session check result:', !!session);
        console.log('📊 AuthContext: Session details:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userId: session?.user?.id
        });

        if (session?.user) {
          console.log('👤 AuthContext: Found existing session for user:', session.user.email);
          console.log('🔄 AuthContext: Starting fetchUserData...');

          const startTime = Date.now();
          const userData = await fetchUserData(session.user.id);
          const endTime = Date.now();

          console.log(`⏱️ AuthContext: fetchUserData took ${endTime - startTime}ms`);

          if (userData) {
            console.log('✅ AuthContext: User data fetched successfully');
            console.log('📋 AuthContext: User data details:', {
              id: userData.id,
              email: userData.email,
              role: userData.role,
              isFirstTimeUser: userData.isFirstTimeUser,
              hasEmployeeDetails: !!userData.employeeDetails
            });
            setUser(userData);
            // Initialize chatbot session for restored user
            await sessionManagementService.getOrCreateSession(userData.id);
            // Trigger chatbot webhook only for first-time users during session restoration
            triggerChatbotWebhookForFirstTimeUser(userData);
          } else {
            console.log('⚠️ Could not fetch user data from database, creating minimal user object');
            // Create a minimal user object if database fetch fails
            const minimalUser = {
              id: session.user.id,
              email: session.user.email || '',
              role: 'user',
              employeeDetails: undefined,
              preferences: DEFAULT_PREFERENCES,
              isFirstTimeUser: true,
            };
            console.log('📋 AuthContext: Created minimal user:', minimalUser);
            setUser(minimalUser);
            // Initialize chatbot session for minimal user
            await sessionManagementService.getOrCreateSession(minimalUser.id);
            // Trigger chatbot webhook for first-time minimal user
            triggerChatbotWebhookForFirstTimeUser(minimalUser);
          }
        } else {
          console.log('🚫 AuthContext: No existing session found');
        }
      } catch (err) {
        console.error('💥 Unexpected error checking session:', err);
        if (err instanceof Error) {
          console.error('📝 Error details:', err.message, err.stack);
        }
      } finally {
        console.log('🏁 AuthContext: Setting loading to false');
        setLoading(false);
      }
    };

    checkSession();

    // Fallback timeout to ensure loading state is resolved
    const fallbackTimeout = setTimeout(() => {
      console.log('⚠️ AuthContext: Fallback timeout - forcing loading to false');
      setLoading(false);
    }, 12000); // 12 second fallback (longer than session check timeout)

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, loggedIn: !!session });

      if (session?.user) {
        // Fetch complete user data from database
        console.log('Fetching user data for:', session.user.email);
        const userData = await fetchUserData(session.user.id);

        if (userData) {
          console.log('User data fetched successfully:', userData.email);
          setUser(userData);
          // Initialize chatbot session for auth state change user
          await sessionManagementService.getOrCreateSession(userData.id);
          // Trigger chatbot webhook only for first-time users during auth state change
          triggerChatbotWebhookForFirstTimeUser(userData);
        } else {
          console.error('Could not fetch user data from database');
          // Don't set user to null, create a minimal user object
          const minimalUser = {
            id: session.user.id,
            email: session.user.email || '',
            role: 'user',
            employeeDetails: undefined,
            preferences: DEFAULT_PREFERENCES,
            isFirstTimeUser: true,
          };
          setUser(minimalUser);
          // Initialize chatbot session for minimal user
          await sessionManagementService.getOrCreateSession(minimalUser.id);
          // Trigger chatbot webhook for first-time minimal user
          triggerChatbotWebhookForFirstTimeUser(minimalUser);
        }
      } else {
        console.log('User signed out');
        // Clear chatbot sessions on logout
        await sessionManagementService.clearAllSessions();
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    updateEmployeeDetails,
    updateUserPreferences,
    completeOnboarding
  }), [user, loading, signIn, signOut, updateEmployeeDetails, updateUserPreferences, completeOnboarding]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};