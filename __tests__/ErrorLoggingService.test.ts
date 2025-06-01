// Smart Office Assistant - Error Logging Service Tests
// Tests for the error logging and monitoring functionality

import { errorLogger, ErrorSeverity, ErrorCategory } from '../services/ErrorLoggingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Supabase
const mockSupabaseInsert = jest.fn(() => Promise.resolve({ error: null }));
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: mockSupabaseInsert,
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => ({
      data: null,
      error: null
    }))
  }
}));

describe('ErrorLoggingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (errorLogger as any).isInitialized = false;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await errorLogger.initialize();
      expect(result).toBeUndefined(); // initialize returns void
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock AsyncStorage to throw an error
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      // Should not throw, but handle gracefully
      await expect(errorLogger.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Error Logging', () => {
    beforeEach(async () => {
      await errorLogger.initialize();
    });

    it('should log error with string message', async () => {
      const errorMessage = 'Test error message';
      
      await errorLogger.logError(errorMessage, {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.API
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log error with Error object', async () => {
      const error = new Error('Test error');
      
      await errorLogger.logError(error, {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.DATABASE
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should use default severity and category when not provided', async () => {
      const error = new Error('Test error');
      
      await errorLogger.logError(error);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      // Mock AsyncStorage to throw an error
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const error = new Error('Test error');
      
      // Should not throw, but handle gracefully
      await expect(errorLogger.logError(error)).resolves.toBeUndefined();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(async () => {
      await errorLogger.initialize();
    });

    it('should log authentication error', async () => {
      const error = new Error('Auth failed');
      
      await errorLogger.logAuthError(error, {
        screen: 'SignInScreen',
        action: 'signIn'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log API error', async () => {
      const error = new Error('API request failed');
      
      await errorLogger.logApiError(error, {
        screen: 'BookRoomScreen',
        action: 'fetchRooms'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log database error', async () => {
      const error = new Error('Database connection failed');
      
      await errorLogger.logDatabaseError(error, {
        screen: 'AdminDashboard',
        action: 'fetchStats'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log network error', async () => {
      const error = new Error('Network timeout');
      
      await errorLogger.logNetworkError(error, {
        screen: 'ParkingScreen',
        action: 'loadParkingData'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log UI error', async () => {
      const error = new Error('Component render failed');
      
      await errorLogger.logUIError(error, {
        screen: 'HomeScreen',
        action: 'renderDashboard'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should log validation error', async () => {
      const error = new Error('Invalid input');
      
      await errorLogger.logValidationError(error, {
        screen: 'ProfileScreen',
        action: 'updateProfile'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Local Storage Management', () => {
    beforeEach(async () => {
      await errorLogger.initialize();
    });

    it('should retrieve local logs', async () => {
      const mockLogs = JSON.stringify([
        {
          id: 'test-1',
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.API,
          message: 'Test error',
          resolved: false,
          reportedToRemote: false
        }
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockLogs);

      const logs = await errorLogger.getLocalLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test error');
    });

    it('should handle empty local logs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const logs = await errorLogger.getLocalLogs();
      
      expect(logs).toEqual([]);
    });

    it('should handle corrupted local logs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const logs = await errorLogger.getLocalLogs();
      
      expect(logs).toEqual([]);
    });
  });

  describe('Error Statistics', () => {
    beforeEach(async () => {
      await errorLogger.initialize();
    });

    it('should return error statistics', async () => {
      const mockLogs = JSON.stringify([
        {
          id: 'test-1',
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.API,
          message: 'API error',
          resolved: false,
          reportedToRemote: false
        },
        {
          id: 'test-2',
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.UI,
          message: 'UI error',
          resolved: false,
          reportedToRemote: false
        }
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockLogs);

      const stats = await errorLogger.getErrorStatistics();
      
      expect(stats.total).toBe(2);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.byCategory[ErrorCategory.API]).toBe(1);
      expect(stats.byCategory[ErrorCategory.UI]).toBe(1);
      expect(stats.recent).toHaveLength(2);
    });

    it('should handle statistics errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const stats = await errorLogger.getErrorStatistics();
      
      expect(stats.total).toBe(0);
      expect(stats.bySeverity).toEqual({});
      expect(stats.byCategory).toEqual({});
      expect(stats.recent).toEqual([]);
    });
  });

  describe('Remote Sync', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await errorLogger.initialize();
    });

    it('should sync pending logs', async () => {
      const mockRetryLogs = JSON.stringify([
        {
          id: 'test-1',
          timestamp: new Date().toISOString(),
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.API,
          message: 'Failed API call',
          resolved: false,
          reportedToRemote: false
        }
      ]);

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'retry_logs') {
          return Promise.resolve(mockRetryLogs);
        }
        return Promise.resolve(null);
      });

      // Should not throw an error
      await expect(errorLogger.syncPendingLogs()).resolves.toBeUndefined();

      // Should call getItem to check for retry logs
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('retry_logs');
    });

    it('should handle empty retry logs', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'retry_logs') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });

      await errorLogger.syncPendingLogs();

      // Should not remove retry logs if there are no logs to sync
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(errorLogger.syncPendingLogs()).resolves.toBeUndefined();
    });
  });

  describe('Error Severity and Categories', () => {
    it('should have correct severity levels', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });

    it('should have correct error categories', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
      expect(ErrorCategory.API).toBe('api');
      expect(ErrorCategory.DATABASE).toBe('database');
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.UI).toBe('ui');
      expect(ErrorCategory.NAVIGATION).toBe('navigation');
      expect(ErrorCategory.NOTIFICATION).toBe('notification');
      expect(ErrorCategory.STORAGE).toBe('storage');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });
  });
});
