// Smart Office Assistant - Secure Storage Service
// Provides encrypted storage for sensitive data like sessions and tokens

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { configService } from './ConfigService';

interface StorageOptions {
  requireAuthentication?: boolean;
  accessGroup?: string;
  keychainService?: string;
}

interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  userRole: string;
  lastActivity: number;
}

class SecureStorageService {
  private static instance: SecureStorageService;
  private readonly SESSION_KEY = 'user_session';
  private readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private readonly LOCKOUT_KEY = 'account_lockout';

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  // Secure storage for sensitive data (uses Keychain/Keystore on native, encrypted storage on web)
  async setSecureItem(key: string, value: string, options?: StorageOptions): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // For web, use encrypted localStorage with a simple encryption
        const encrypted = this.simpleEncrypt(value);
        localStorage.setItem(`secure_${key}`, encrypted);
      } else {
        // For native platforms, use Expo SecureStore
        await SecureStore.setItemAsync(key, value, {
          requireAuthentication: options?.requireAuthentication || false,
          accessGroup: options?.accessGroup,
          keychainService: options?.keychainService || 'smart-office-assistant',
        });
      }
    } catch (error) {
      console.error('Failed to store secure item:', error);
      throw new Error('Failed to store sensitive data securely');
    }
  }

  async getSecureItem(key: string, options?: StorageOptions): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // For web, decrypt from localStorage
        const encrypted = localStorage.getItem(`secure_${key}`);
        if (!encrypted) return null;
        return this.simpleDecrypt(encrypted);
      } else {
        // For native platforms, use Expo SecureStore
        return await SecureStore.getItemAsync(key, {
          requireAuthentication: options?.requireAuthentication || false,
          accessGroup: options?.accessGroup,
          keychainService: options?.keychainService || 'smart-office-assistant',
        });
      }
    } catch (error) {
      console.error('Failed to retrieve secure item:', error);
      return null;
    }
  }

  async deleteSecureItem(key: string, options?: StorageOptions): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`secure_${key}`);
      } else {
        await SecureStore.deleteItemAsync(key, {
          accessGroup: options?.accessGroup,
          keychainService: options?.keychainService || 'smart-office-assistant',
        });
      }
    } catch (error) {
      console.error('Failed to delete secure item:', error);
    }
  }

  // Session management with security features
  async storeSession(sessionData: SessionData): Promise<void> {
    try {
      // Add session timeout
      const sessionWithTimeout = {
        ...sessionData,
        expiresAt: Date.now() + configService.sessionTimeout,
        lastActivity: Date.now(),
      };

      const sessionJson = JSON.stringify(sessionWithTimeout);
      await this.setSecureItem(this.SESSION_KEY, sessionJson, {
        requireAuthentication: false, // Don't require biometric for session access
      });
    } catch (error) {
      console.error('Failed to store session:', error);
      throw new Error('Failed to store session securely');
    }
  }

  async getSession(): Promise<SessionData | null> {
    try {
      const sessionJson = await this.getSecureItem(this.SESSION_KEY);
      if (!sessionJson) return null;

      const sessionData: SessionData = JSON.parse(sessionJson);

      // Check if session has expired
      if (Date.now() > sessionData.expiresAt) {
        await this.clearSession();
        return null;
      }

      // Check for session timeout due to inactivity
      const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
      if (Date.now() - sessionData.lastActivity > inactivityTimeout) {
        await this.clearSession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = Date.now();
      await this.storeSession(sessionData);

      return sessionData;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await this.deleteSecureItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  // Login attempt tracking for security
  async recordLoginAttempt(email: string, success: boolean): Promise<void> {
    try {
      const attemptsData = await this.getLoginAttempts(email);
      const now = Date.now();

      if (success) {
        // Clear attempts on successful login
        await AsyncStorage.removeItem(`${this.LOGIN_ATTEMPTS_KEY}_${email}`);
        await AsyncStorage.removeItem(`${this.LOCKOUT_KEY}_${email}`);
      } else {
        // Record failed attempt
        attemptsData.attempts += 1;
        attemptsData.lastAttempt = now;

        // Check if account should be locked
        if (attemptsData.attempts >= configService.maxLoginAttempts) {
          await this.lockAccount(email);
        }

        await AsyncStorage.setItem(
          `${this.LOGIN_ATTEMPTS_KEY}_${email}`,
          JSON.stringify(attemptsData)
        );
      }
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }

  async getLoginAttempts(email: string): Promise<{ attempts: number; lastAttempt: number }> {
    try {
      const data = await AsyncStorage.getItem(`${this.LOGIN_ATTEMPTS_KEY}_${email}`);
      if (!data) {
        return { attempts: 0, lastAttempt: 0 };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get login attempts:', error);
      return { attempts: 0, lastAttempt: 0 };
    }
  }

  async lockAccount(email: string): Promise<void> {
    try {
      const lockData = {
        lockedAt: Date.now(),
        unlockAt: Date.now() + configService.lockoutDuration,
      };
      await AsyncStorage.setItem(`${this.LOCKOUT_KEY}_${email}`, JSON.stringify(lockData));
    } catch (error) {
      console.error('Failed to lock account:', error);
    }
  }

  async isAccountLocked(email: string): Promise<boolean> {
    try {
      const lockData = await AsyncStorage.getItem(`${this.LOCKOUT_KEY}_${email}`);
      if (!lockData) return false;

      const { unlockAt } = JSON.parse(lockData);
      const isLocked = Date.now() < unlockAt;

      // Auto-unlock if time has passed
      if (!isLocked) {
        await AsyncStorage.removeItem(`${this.LOCKOUT_KEY}_${email}`);
        await AsyncStorage.removeItem(`${this.LOGIN_ATTEMPTS_KEY}_${email}`);
      }

      return isLocked;
    } catch (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
  }

  async getRemainingLockoutTime(email: string): Promise<number> {
    try {
      const lockData = await AsyncStorage.getItem(`${this.LOCKOUT_KEY}_${email}`);
      if (!lockData) return 0;

      const { unlockAt } = JSON.parse(lockData);
      const remaining = unlockAt - Date.now();
      return Math.max(0, remaining);
    } catch (error) {
      console.error('Failed to get remaining lockout time:', error);
      return 0;
    }
  }

  // Simple encryption for web platform (not cryptographically secure, but better than plain text)
  private simpleEncrypt(text: string): string {
    // This is a simple XOR cipher - in production, use a proper encryption library
    const key = 'smart-office-key-2024'; // In production, this should be generated/stored securely
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted); // Base64 encode
  }

  private simpleDecrypt(encryptedText: string): string {
    try {
      const encrypted = atob(encryptedText); // Base64 decode
      const key = 'smart-office-key-2024';
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return '';
    }
  }

  // Security utilities
  async clearAllSecureData(): Promise<void> {
    try {
      await this.clearSession();
      
      // Clear all login attempts and lockouts
      const keys = await AsyncStorage.getAllKeys();
      const securityKeys = keys.filter(key => 
        key.startsWith(this.LOGIN_ATTEMPTS_KEY) || 
        key.startsWith(this.LOCKOUT_KEY)
      );
      
      if (securityKeys.length > 0) {
        await AsyncStorage.multiRemove(securityKeys);
      }

      // Clear web secure storage
      if (Platform.OS === 'web') {
        const localStorageKeys = Object.keys(localStorage);
        localStorageKeys.forEach(key => {
          if (key.startsWith('secure_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Failed to clear all secure data:', error);
    }
  }

  // Check if secure storage is available
  async isSecureStorageAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return typeof Storage !== 'undefined';
      } else {
        return await SecureStore.isAvailableAsync();
      }
    } catch (error) {
      console.error('Failed to check secure storage availability:', error);
      return false;
    }
  }
}

// Export singleton instance
export const secureStorage = SecureStorageService.getInstance();
export default secureStorage;
