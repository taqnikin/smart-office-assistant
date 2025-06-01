// Smart Office Assistant - Notification Context
// React context for managing notifications throughout the app

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { 
  notificationService, 
  NotificationType, 
  NotificationData, 
  UserNotificationPreferences 
} from '../services/NotificationService';
import { AuthContext } from '../AuthContext';

// Notification context interface
interface NotificationContextValue {
  isInitialized: boolean;
  permissionStatus: string;
  pushToken: string | null;
  preferences: UserNotificationPreferences | null;
  
  // Methods
  initializeNotifications: () => Promise<boolean>;
  sendNotification: (data: NotificationData) => Promise<string | null>;
  scheduleNotification: (data: NotificationData) => Promise<string | null>;
  cancelNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: UserNotificationPreferences) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  
  // Convenience methods for common notifications
  sendRoomBookingConfirmation: (roomName: string, date: string, time: string) => Promise<void>;
  sendParkingConfirmation: (spotNumber: string, date: string) => Promise<void>;
  sendAttendanceReminder: () => Promise<void>;
  scheduleRoomReminder: (roomName: string, date: Date, bookingId: string) => Promise<string | null>;
}

// Default context value
const defaultContextValue: NotificationContextValue = {
  isInitialized: false,
  permissionStatus: 'undetermined',
  pushToken: null,
  preferences: null,
  initializeNotifications: async () => false,
  sendNotification: async () => null,
  scheduleNotification: async () => null,
  cancelNotification: async () => {},
  updatePreferences: async () => {},
  requestPermissions: async () => false,
  sendRoomBookingConfirmation: async () => {},
  sendParkingConfirmation: async () => {},
  sendAttendanceReminder: async () => {},
  scheduleRoomReminder: async () => null,
};

// Create context
const NotificationContext = createContext<NotificationContextValue>(defaultContextValue);

// Notification provider props
interface NotificationProviderProps {
  children: ReactNode;
}

// Notification provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initializeNotifications();
    }
  }, [user?.id, isInitialized, initializeNotifications]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle notification received while app is open
    });

    // Listen for notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Handle notification tap responses
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { notification } = response;
    const data = notification.request.content.data;
    
    if (data?.type) {
      switch (data.type) {
        case NotificationType.ROOM_BOOKING_REMINDER:
          // Navigate to room booking or calendar
          console.log('Navigate to room booking:', data.bookingId);
          break;
        case NotificationType.PARKING_REMINDER:
          // Navigate to parking screen
          console.log('Navigate to parking screen');
          break;
        case NotificationType.ATTENDANCE_REMINDER:
          // Navigate to attendance screen
          console.log('Navigate to attendance screen');
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    }
  };

  // Initialize notification service
  const initializeNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const success = await notificationService.initialize();
      setIsInitialized(success);

      if (success) {
        const token = await notificationService.getPushToken();
        setPushToken(token);

        const status = await notificationService.getPermissionStatus();
        setPermissionStatus(status);

        if (user?.id) {
          const userPrefs = await notificationService.getUserPreferences(user.id);
          setPreferences(userPrefs);
        }
      }

      return success;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }, [user?.id]);

  // Send immediate notification
  const sendNotification = useCallback(async (data: NotificationData): Promise<string | null> => {
    if (!isInitialized || !preferences) {
      console.warn('Notifications not initialized or preferences not loaded');
      return null;
    }

    // Check if this type of notification is enabled
    const isEnabled = checkNotificationEnabled(data.type, preferences);
    if (!isEnabled) {
      console.log('Notification type disabled:', data.type);
      return null;
    }

    return await notificationService.sendLocalNotification(data);
  }, [isInitialized, preferences]);

  // Schedule notification
  const scheduleNotification = useCallback(async (data: NotificationData): Promise<string | null> => {
    if (!isInitialized || !preferences) {
      console.warn('Notifications not initialized or preferences not loaded');
      return null;
    }

    const isEnabled = checkNotificationEnabled(data.type, preferences);
    if (!isEnabled) {
      console.log('Notification type disabled:', data.type);
      return null;
    }

    return await notificationService.scheduleNotification(data);
  }, [isInitialized, preferences]);

  // Cancel notification
  const cancelNotification = useCallback(async (id: string): Promise<void> => {
    await notificationService.cancelNotification(id);
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (prefs: UserNotificationPreferences): Promise<void> => {
    await notificationService.updateUserPreferences(prefs);
    setPreferences(prefs);
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions();
    if (granted) {
      const status = await notificationService.getPermissionStatus();
      setPermissionStatus(status);
    }
    return granted;
  }, []);

  // Check if notification type is enabled
  const checkNotificationEnabled = (type: NotificationType, prefs: UserNotificationPreferences): boolean => {
    switch (type) {
      case NotificationType.ROOM_BOOKING_CONFIRMED:
        return prefs.roomBookingConfirmations;
      case NotificationType.ROOM_BOOKING_REMINDER:
        return prefs.roomBookingReminders;
      case NotificationType.PARKING_RESERVED:
      case NotificationType.PARKING_REMINDER:
        return prefs.parkingNotifications;
      case NotificationType.ATTENDANCE_REMINDER:
        return prefs.attendanceReminders;
      case NotificationType.ADMIN_ALERT:
        return prefs.adminAlerts;
      case NotificationType.SYSTEM_MAINTENANCE:
        return prefs.systemNotifications;
      default:
        return true;
    }
  };

  // Convenience method: Room booking confirmation
  const sendRoomBookingConfirmation = useCallback(async (roomName: string, date: string, time: string): Promise<void> => {
    await sendNotification({
      type: NotificationType.ROOM_BOOKING_CONFIRMED,
      title: 'Room Booked Successfully! 🎉',
      body: `${roomName} is reserved for ${date} at ${time}`,
      data: { roomName, date, time }
    });
  }, [sendNotification]);

  // Convenience method: Parking confirmation
  const sendParkingConfirmation = useCallback(async (spotNumber: string, date: string): Promise<void> => {
    await sendNotification({
      type: NotificationType.PARKING_RESERVED,
      title: 'Parking Spot Reserved! 🚗',
      body: `Spot ${spotNumber} is reserved for ${date}`,
      data: { spotNumber, date }
    });
  }, [sendNotification]);

  // Convenience method: Attendance reminder
  const sendAttendanceReminder = useCallback(async (): Promise<void> => {
    await sendNotification({
      type: NotificationType.ATTENDANCE_REMINDER,
      title: 'Don\'t Forget to Check In! ⏰',
      body: 'Remember to mark your attendance for today',
      data: { reminderType: 'daily_checkin' }
    });
  }, [sendNotification]);

  // Convenience method: Schedule room reminder
  const scheduleRoomReminder = useCallback(async (roomName: string, date: Date, bookingId: string): Promise<string | null> => {
    if (!preferences) return null;

    const reminderTime = new Date(date.getTime() - (preferences.reminderMinutes * 60 * 1000));

    return await scheduleNotification({
      type: NotificationType.ROOM_BOOKING_REMINDER,
      title: 'Meeting Starting Soon! 📅',
      body: `Your meeting in ${roomName} starts in ${preferences.reminderMinutes} minutes`,
      scheduledTime: reminderTime,
      data: { roomName, bookingId, originalTime: date.toISOString() }
    });
  }, [preferences, scheduleNotification]);

  // Context value
  const contextValue: NotificationContextValue = useMemo(() => ({
    isInitialized,
    permissionStatus,
    pushToken,
    preferences,
    initializeNotifications,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    updatePreferences,
    requestPermissions,
    sendRoomBookingConfirmation,
    sendParkingConfirmation,
    sendAttendanceReminder,
    scheduleRoomReminder,
  }), [
    isInitialized,
    permissionStatus,
    pushToken,
    preferences,
    initializeNotifications,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    updatePreferences,
    requestPermissions,
    sendRoomBookingConfirmation,
    sendParkingConfirmation,
    sendAttendanceReminder,
    scheduleRoomReminder,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export { NotificationContext };
