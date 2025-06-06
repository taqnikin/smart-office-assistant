import React, { createContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { userAPI } from './lib/supabase-api';
import { errorLogger, ErrorCategory } from './services/ErrorLoggingService';
import { secureStorage } from './services/SecureStorageService';
import { validationService } from './services/ValidationService';
import { configService } from './services/ConfigService';

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
    type: 'Car' | 'Bike' | 'None';
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

  // Helper function to fetch complete user data from database
  const fetchUserData = async (userId: string) => {
    try {
      // Get current auth user for email and metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No authenticated user found');
        return null;
      }

      // Try to get user record, create if doesn't exist
      let userRecord = await userAPI.getCurrentUser();
      if (!userRecord) {
        console.log('User record not found, creating new user record...');

        // Create user record
        const newUserData = {
          id: authUser.id,
          email: authUser.email || '',
          role: (authUser.user_metadata?.role as 'user' | 'admin') || 'user',
          is_first_time_user: true
        };

        try {
          userRecord = await userAPI.upsertUser(newUserData);
          console.log('User record created successfully');
        } catch (createError) {
          console.error('Failed to create user record:', createError);
          // Create a minimal user object for the session
          userRecord = newUserData;
        }
      }

      // Get employee details (optional)
      const employeeDetails = await userAPI.getEmployeeDetails(userId);

      // Get user preferences (optional)
      const preferences = await userAPI.getUserPreferences(userId);

      // Check onboarding status
      const isOnboarded = await storage.getItem(`onboarded-${userId}`);

      // Transform employee details to match AuthContext interface
      const transformedEmployeeDetails = employeeDetails ? {
        fullName: employeeDetails.full_name,
        employeeId: employeeDetails.employee_id,
        dateOfJoining: employeeDetails.date_of_joining,
        workHours: employeeDetails.work_hours,
        workMode: employeeDetails.work_mode,
      } : undefined;

      // Transform preferences to match AuthContext interface
      const transformedPreferences = preferences ? {
        vehicle: {
          type: preferences.vehicle_type || 'None',
          registrationNumber: preferences.vehicle_registration || undefined,
        },
        reminders: {
          checkinReminder: preferences.checkin_reminder || true,
          checkinReminderTime: preferences.checkin_reminder_time || 30,
          occupancyReminder: preferences.occupancy_reminder || true,
          occupancyThreshold: preferences.occupancy_threshold || 80,
        },
      } : DEFAULT_PREFERENCES;

      return {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        employeeDetails: transformedEmployeeDetails,
        preferences: transformedPreferences,
        isFirstTimeUser: isOnboarded !== 'true',
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Update employee details
  const updateEmployeeDetails = async (details: EmployeeDetails) => {
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
  };

  // Update user preferences
  const updateUserPreferences = async (preferences: UserPreferences) => {
    if (!user) return;

    try {
      // Transform preferences to database format
      const dbPreferences = {
        user_id: user.id,
        vehicle_type: preferences.vehicle?.type || 'None',
        vehicle_registration: preferences.vehicle?.registrationNumber || null,
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
  };

  // Mark onboarding as complete
  const completeOnboarding = async () => {
    if (!user) return;

    try {
      console.log('Completing onboarding for user:', user.id);

      // Update user record in database
      await userAPI.updateUser(user.id, { is_first_time_user: false });

      // Update local state
      const updatedUser = {
        ...user,
        isFirstTimeUser: false,
      };

      setUser(updatedUser);

      // Store onboarding completion in local storage
      await storage.setItem(`onboarded-${user.id}`, 'true');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  };

  // signIn uses Supabase authentication and retrieves user data from database
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

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

      // Authenticate with Supabase
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
      } else {
        console.log('User data not found, creating minimal user object');
        // Create a minimal user object if database fetch fails
        setUser({
          id: supaUser.id,
          email: supaUser.email || '',
          role: 'user',
          employeeDetails: undefined,
          preferences: DEFAULT_PREFERENCES,
          isFirstTimeUser: true,
        });
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
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Signing out user');

      // Clear user state
      setUser(null);

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync auth state on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check Supabase session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session retrieval error:', error.message);
          setLoading(false);
          return;
        }

        const session = data.session;
        if (session?.user) {
          // Fetch complete user data from database
          const userData = await fetchUserData(session.user.id);

          if (userData) {
            setUser(userData);
          } else {
            console.log('Could not fetch user data from database, creating minimal user object');
            // Create a minimal user object if database fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: 'user',
              employeeDetails: undefined,
              preferences: DEFAULT_PREFERENCES,
              isFirstTimeUser: true,
            });
          }
        }
      } catch (err) {
        console.error('Unexpected error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, loggedIn: !!session });

      if (session?.user) {
        // Fetch complete user data from database
        console.log('Fetching user data for:', session.user.email);
        const userData = await fetchUserData(session.user.id);

        if (userData) {
          console.log('User data fetched successfully:', userData.email);
          setUser(userData);
        } else {
          console.error('Could not fetch user data from database');
          // Don't set user to null, create a minimal user object
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'user',
            employeeDetails: undefined,
            preferences: DEFAULT_PREFERENCES,
            isFirstTimeUser: true,
          });
        }
      } else {
        console.log('User signed out');
        setUser(null);
      }
      setLoading(false);
    });
    
    return () => {
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