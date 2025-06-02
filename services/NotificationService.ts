// Smart Office Assistant - Push Notification Service
// Handles all push notification functionality using Expo Notifications

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification types for the Smart Office Assistant
export enum NotificationType {
  ROOM_BOOKING_CONFIRMED = 'room_booking_confirmed',
  ROOM_BOOKING_REMINDER = 'room_booking_reminder',
  PARKING_RESERVED = 'parking_reserved',
  PARKING_REMINDER = 'parking_reminder',
  ATTENDANCE_REMINDER = 'attendance_reminder',
  BOOKING_CONFLICT = 'booking_conflict',
  ADMIN_ALERT = 'admin_alert',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  GENERAL_INFO = 'general_info'
}

// Notification data interfaces
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  scheduledTime?: Date;
  userId?: string;
}

export interface UserNotificationPreferences {
  userId: string;
  roomBookingConfirmations: boolean;
  roomBookingReminders: boolean;
  parkingNotifications: boolean;
  attendanceReminders: boolean;
  adminAlerts: boolean;
  systemNotifications: boolean;
  reminderMinutes: number; // Minutes before event to send reminder
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

// Default notification preferences
const DEFAULT_PREFERENCES: Omit<UserNotificationPreferences, 'userId'> = {
  roomBookingConfirmations: true,
  roomBookingReminders: true,
  parkingNotifications: true,
  attendanceReminders: true,
  adminAlerts: true,
  systemNotifications: true,
  reminderMinutes: 15,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
};

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized = false;

  constructor() {
    this.setupNotificationHandler();
  }

  // Configure how notifications are handled when app is in foreground
  private setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // Initialize notification service
  async initialize(): Promise<boolean> {
    try {
      // On web platform, notifications are not supported
      if (Platform.OS === 'web') {
        console.warn('Push notifications are not supported on web platform');
        this.isInitialized = true; // Mark as initialized to prevent errors
        return true; // Return true to allow app to continue
      }

      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return false;
      }

      // Get push token
      this.expoPushToken = await this.getExpoPushToken();

      if (this.expoPushToken) {
        console.log('Push token obtained:', this.expoPushToken);
        await this.storePushToken(this.expoPushToken);
        this.isInitialized = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Get Expo push token
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.warn('Project ID not found for push notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Store push token locally and send to backend
  private async storePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('expoPushToken', token);

      // Send token to backend for user association
      try {
        const userId = await AsyncStorage.getItem('currentUserId');
        if (userId) {
          // Note: This would require implementing updatePushToken in userAPI
          console.log('Push token stored locally. Backend sync would happen here.');
          // await userAPI.updatePushToken(userId, token);
        }
      } catch (backendError) {
        console.warn('Failed to sync push token with backend:', backendError);
        // Continue execution - local storage is sufficient for now
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  // Get stored push token
  async getPushToken(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    try {
      const storedToken = await AsyncStorage.getItem('expoPushToken');
      if (storedToken) {
        this.expoPushToken = storedToken;
        return storedToken;
      }
    } catch (error) {
      console.error('Error retrieving push token:', error);
    }

    return null;
  }

  // Send immediate notification
  async sendLocalNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        console.warn('Notification service not initialized');
        return null;
      }

      // On web platform, just log the notification
      if (Platform.OS === 'web') {
        console.log('Web notification (simulated):', notificationData.title, notificationData.body);
        return `web_notification_${Date.now()}`;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: {
            type: notificationData.type,
            ...notificationData.data
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return null;
    }
  }

  // Schedule notification for later
  async scheduleNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      if (!this.isInitialized || !notificationData.scheduledTime) {
        console.warn('Notification service not initialized or no scheduled time provided');
        return null;
      }

      // On web platform, just log the scheduled notification
      if (Platform.OS === 'web') {
        console.log('Web scheduled notification (simulated):', notificationData.title, 'at', notificationData.scheduledTime);
        return `web_scheduled_${Date.now()}`;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: {
            type: notificationData.type,
            ...notificationData.data
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: notificationData.scheduledTime,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(`notificationPrefs_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting notification preferences:', error);
    }

    // Return default preferences
    return {
      userId,
      ...DEFAULT_PREFERENCES
    };
  }

  // Update user notification preferences
  async updateUserPreferences(preferences: UserNotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `notificationPrefs_${preferences.userId}`,
        JSON.stringify(preferences)
      );

      // Sync with backend
      try {
        // Note: This would require implementing updateNotificationPreferences in userAPI
        console.log('Notification preferences stored locally. Backend sync would happen here.');
        // await userAPI.updateNotificationPreferences(preferences);
      } catch (backendError) {
        console.warn('Failed to sync notification preferences with backend:', backendError);
        // Continue execution - local storage is sufficient for now
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  // Check if notifications should be sent (respect quiet hours)
  private shouldSendNotification(preferences: UserNotificationPreferences): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const quietStart = preferences.quietHoursStart;
    const quietEnd = preferences.quietHoursEnd;
    
    // Simple quiet hours check (doesn't handle overnight periods)
    if (quietStart < quietEnd) {
      return currentTime < quietStart || currentTime > quietEnd;
    } else {
      // Overnight quiet hours
      return currentTime > quietEnd && currentTime < quietStart;
    }
  }

  // Get notification permission status
  async getPermissionStatus(): Promise<string> {
    if (Platform.OS === 'web') {
      return 'granted'; // Simulate granted status on web
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return true; // Simulate granted permissions on web
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default NotificationService;
