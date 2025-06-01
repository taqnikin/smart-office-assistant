// Smart Office Assistant - Error Logging and Monitoring Service
// Centralized error logging, monitoring, and crash reporting

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  API = 'api',
  DATABASE = 'database',
  NETWORK = 'network',
  UI = 'ui',
  NAVIGATION = 'navigation',
  NOTIFICATION = 'notification',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// Error log entry interface
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  userId?: string;
  userAgent?: string;
  appVersion?: string;
  context?: Record<string, any>;
  resolved?: boolean;
  reportedToRemote?: boolean;
}

// Error context for additional debugging information
export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private isInitialized = false;
  private maxLocalLogs = 1000; // Maximum number of logs to store locally
  private batchSize = 50; // Number of logs to send in each batch
  private retryAttempts = 3;

  private constructor() {}

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  // Initialize the error logging service
  async initialize(): Promise<void> {
    try {
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // Clean up old logs
      await this.cleanupOldLogs();
      
      // Attempt to sync pending logs
      await this.syncPendingLogs();
      
      this.isInitialized = true;
      console.log('✅ Error Logging Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Error Logging Service:', error);
    }
  }

  // Set up global error handlers for unhandled errors
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
      const originalHandler = global.ErrorUtils?.getGlobalHandler();
      
      global.ErrorUtils?.setGlobalHandler((error: Error, isFatal: boolean) => {
        this.logError(error, {
          severity: isFatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
          category: ErrorCategory.UNKNOWN,
          context: { isFatal, source: 'globalHandler' }
        });
        
        // Call original handler if it exists
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  // Main method to log errors
  async logError(
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: ErrorContext;
      reportToRemote?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const {
        severity = ErrorSeverity.MEDIUM,
        category = ErrorCategory.UNKNOWN,
        context = {},
        reportToRemote = true
      } = options;

      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      const logEntry: ErrorLogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        severity,
        category,
        message: errorMessage,
        stack: errorStack,
        userId: context.userId,
        userAgent: this.getUserAgent(),
        appVersion: this.getAppVersion(),
        context: {
          screen: context.screen,
          action: context.action,
          ...context.additionalData
        },
        resolved: false,
        reportedToRemote: false
      };

      // Store locally first
      await this.storeLogLocally(logEntry);

      // Report to remote service if enabled and severity is high enough
      if (reportToRemote && (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL)) {
        await this.reportToRemoteService(logEntry);
      }

      // Log to console based on severity
      this.logToConsole(logEntry);

    } catch (loggingError) {
      // Fallback to console if logging service fails
      console.error('Error Logging Service failed:', loggingError);
      console.error('Original error:', error);
    }
  }

  // Store error log locally using AsyncStorage
  private async storeLogLocally(logEntry: ErrorLogEntry): Promise<void> {
    try {
      const existingLogs = await this.getLocalLogs();
      const updatedLogs = [logEntry, ...existingLogs].slice(0, this.maxLocalLogs);
      
      await AsyncStorage.setItem('error_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to store error log locally:', error);
    }
  }

  // Get locally stored error logs
  async getLocalLogs(): Promise<ErrorLogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem('error_logs');
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error('Failed to retrieve local error logs:', error);
      return [];
    }
  }

  // Report error to remote monitoring service (Supabase)
  private async reportToRemoteService(logEntry: ErrorLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          id: logEntry.id,
          timestamp: logEntry.timestamp,
          severity: logEntry.severity,
          category: logEntry.category,
          message: logEntry.message,
          stack: logEntry.stack,
          user_id: logEntry.userId,
          user_agent: logEntry.userAgent,
          app_version: logEntry.appVersion,
          context: logEntry.context,
          resolved: false
        });

      if (error) {
        throw error;
      }

      // Mark as reported
      logEntry.reportedToRemote = true;
      await this.updateLocalLog(logEntry);

    } catch (error) {
      console.error('Failed to report error to remote service:', error);
      // Store for later retry
      await this.markForRetry(logEntry);
    }
  }

  // Update local log entry
  private async updateLocalLog(updatedEntry: ErrorLogEntry): Promise<void> {
    try {
      const logs = await this.getLocalLogs();
      const updatedLogs = logs.map(log => 
        log.id === updatedEntry.id ? updatedEntry : log
      );
      await AsyncStorage.setItem('error_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to update local log:', error);
    }
  }

  // Mark log for retry
  private async markForRetry(logEntry: ErrorLogEntry): Promise<void> {
    try {
      const retryLogs = await this.getRetryLogs();
      retryLogs.push(logEntry);
      await AsyncStorage.setItem('retry_logs', JSON.stringify(retryLogs));
    } catch (error) {
      console.error('Failed to mark log for retry:', error);
    }
  }

  // Get logs marked for retry
  private async getRetryLogs(): Promise<ErrorLogEntry[]> {
    try {
      const retryLogsJson = await AsyncStorage.getItem('retry_logs');
      return retryLogsJson ? JSON.parse(retryLogsJson) : [];
    } catch (error) {
      console.error('Failed to get retry logs:', error);
      return [];
    }
  }

  // Sync pending logs to remote service
  async syncPendingLogs(): Promise<void> {
    try {
      const retryLogs = await this.getRetryLogs();
      
      if (retryLogs.length === 0) return;

      const batches = this.chunkArray(retryLogs, this.batchSize);
      
      for (const batch of batches) {
        await this.syncBatch(batch);
      }

      // Clear retry logs after successful sync
      await AsyncStorage.removeItem('retry_logs');
      
    } catch (error) {
      console.error('Failed to sync pending logs:', error);
    }
  }

  // Sync a batch of logs
  private async syncBatch(logs: ErrorLogEntry[]): Promise<void> {
    try {
      const logData = logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        severity: log.severity,
        category: log.category,
        message: log.message,
        stack: log.stack,
        user_id: log.userId,
        user_agent: log.userAgent,
        app_version: log.appVersion,
        context: log.context,
        resolved: false
      }));

      const { error } = await supabase
        .from('error_logs')
        .insert(logData);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Failed to sync batch:', error);
      throw error;
    }
  }

  // Clean up old local logs
  private async cleanupOldLogs(): Promise<void> {
    try {
      const logs = await this.getLocalLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep logs for 30 days

      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );

      await AsyncStorage.setItem('error_logs', JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Log to console based on severity
  private logToConsole(logEntry: ErrorLogEntry): void {
    const logMessage = `[${logEntry.severity.toUpperCase()}] ${logEntry.category}: ${logEntry.message}`;
    
    switch (logEntry.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨', logMessage, logEntry.context);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌', logMessage, logEntry.context);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️', logMessage, logEntry.context);
        break;
      case ErrorSeverity.LOW:
        console.log('ℹ️', logMessage, logEntry.context);
        break;
    }
  }

  // Utility methods
  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserAgent(): string {
    // In React Native, we can construct a user agent string
    return `SmartOfficeAssistant/1.0.0 (React Native)`;
  }

  private getAppVersion(): string {
    return '1.0.0'; // This should come from app.json or package.json
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Public convenience methods for different error types
  async logAuthError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      context
    });
  }

  async logApiError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.API,
      context
    });
  }

  async logDatabaseError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.DATABASE,
      context
    });
  }

  async logNetworkError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      context
    });
  }

  async logUIError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.UI,
      context
    });
  }

  async logValidationError(error: Error | string, context?: ErrorContext): Promise<void> {
    await this.logError(error, {
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      context
    });
  }

  // Get error statistics
  async getErrorStatistics(): Promise<{
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recent: ErrorLogEntry[];
  }> {
    try {
      const logs = await this.getLocalLogs();
      
      const bySeverity = logs.reduce((acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {} as Record<ErrorSeverity, number>);

      const byCategory = logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<ErrorCategory, number>);

      const recent = logs.slice(0, 10); // Last 10 errors

      return {
        total: logs.length,
        bySeverity,
        byCategory,
        recent
      };
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return {
        total: 0,
        bySeverity: {} as Record<ErrorSeverity, number>,
        byCategory: {} as Record<ErrorCategory, number>,
        recent: []
      };
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLoggingService.getInstance();
