// Smart Office Assistant - App Notification Context
// Centralized notification management for toast and modal notifications

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner-native';
import { triggerHapticFeedback } from '../utils/PlatformUtils';
import {
  NotificationConfig,
  NotificationState,
  NotificationContextValue,
  NotificationType,
  NotificationAction,
  DurationMap,
  NotificationPresets,
} from '../types/NotificationTypes';

// Create the context
const AppNotificationContext = createContext<NotificationContextValue | null>(null);

// Hook to use the notification context
export const useAppNotifications = (): NotificationContextValue => {
  const context = useContext(AppNotificationContext);
  if (!context) {
    throw new Error('useAppNotifications must be used within an AppNotificationProvider');
  }
  return context;
};

interface AppNotificationProviderProps {
  children: ReactNode;
}

export const AppNotificationProvider: React.FC<AppNotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [isInitialized] = useState(true);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID for notifications
  const generateId = useCallback((): string => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Trigger haptic feedback if enabled
  const triggerHaptic = useCallback(async (type: NotificationType) => {
    switch (type) {
      case 'success':
        await triggerHapticFeedback('success');
        break;
      case 'error':
        await triggerHapticFeedback('error');
        break;
      case 'warning':
        await triggerHapticFeedback('warning');
        break;
      default:
        await triggerHapticFeedback('light');
        break;
    }
  }, []);

  // Auto-dismiss notification after duration
  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    if (duration <= 0) return; // Persistent notification
    
    const timeout = setTimeout(() => {
      dismiss(id);
    }, duration);
    
    timeoutRefs.current.set(id, timeout);
  }, []);

  // Clear auto-dismiss timeout
  const clearAutoDismiss = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // Show notification
  const show = useCallback((config: NotificationConfig): string => {
    const id = config.id || generateId();
    const duration = typeof config.duration === 'number' 
      ? config.duration 
      : DurationMap[config.duration || 'medium'];

    // Create notification state
    const notificationState: NotificationState = {
      id,
      config: { ...config, id },
      isVisible: true,
      createdAt: Date.now(),
    };

    // For toast notifications, use sonner-native
    if (config.variant === 'toast') {
      const toastConfig = {
        duration: duration > 0 ? duration : undefined,
        dismissible: config.dismissible !== false,
        action: config.actions?.[0] ? {
          label: config.actions[0].label,
          onClick: config.actions[0].onPress,
        } : undefined,
      };

      switch (config.type) {
        case 'success':
          toast.success(config.title, toastConfig);
          break;
        case 'error':
          toast.error(config.title, toastConfig);
          break;
        case 'warning':
          toast.warning(config.title, toastConfig);
          break;
        case 'info':
          toast.info(config.title, toastConfig);
          break;
        default:
          toast(config.title, toastConfig);
          break;
      }
    } else {
      // For modal notifications, add to state for custom modal component
      setNotifications(prev => [...prev, notificationState]);
      
      // Schedule auto-dismiss for modal notifications
      if (duration > 0) {
        scheduleAutoDismiss(id, duration);
      }
    }

    // Trigger haptic feedback
    if (config.haptic !== false) {
      triggerHaptic(config.type);
    }

    // Call onShow callback
    config.onShow?.();

    return id;
  }, [generateId, scheduleAutoDismiss, triggerHaptic]);

  // Dismiss notification
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification) {
        // Call onDismiss callback
        notification.config.onDismiss?.();
        
        // Clear auto-dismiss timeout
        clearAutoDismiss(id);
        
        // Remove from state
        return prev.filter(n => n.id !== id);
      }
      return prev;
    });
  }, [clearAutoDismiss]);

  // Dismiss all notifications
  const dismissAll = useCallback(() => {
    notifications.forEach(notification => {
      notification.config.onDismiss?.();
      clearAutoDismiss(notification.id);
    });
    setNotifications([]);
  }, [notifications, clearAutoDismiss]);

  // Update notification
  const update = useCallback((id: string, configUpdate: Partial<NotificationConfig>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, config: { ...notification.config, ...configUpdate } }
          : notification
      )
    );
  }, []);

  // Convenience methods for different types
  const success = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>): string => {
    return show({
      ...NotificationPresets.AUTH_SUCCESS,
      variant: 'toast',
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [show]);

  const errorNotification = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>): string => {
    return show({
      ...NotificationPresets.AUTH_ERROR,
      variant: 'toast',
      type: 'error',
      title,
      message,
      ...options,
    });
  }, [show]);

  const warning = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>): string => {
    return show({
      variant: 'toast',
      type: 'warning',
      title,
      message,
      duration: 'medium',
      icon: 'warning',
      ...options,
    });
  }, [show]);

  const info = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>): string => {
    return show({
      variant: 'toast',
      type: 'info',
      title,
      message,
      duration: 'medium',
      icon: 'information-circle',
      ...options,
    });
  }, [show]);

  const confirmation = useCallback((
    title: string, 
    message?: string, 
    actions?: NotificationAction[], 
    options?: Partial<NotificationConfig>
  ): string => {
    return show({
      variant: 'modal',
      type: 'confirmation',
      title,
      message,
      actions,
      duration: 'persistent',
      backdrop: true,
      backdropDismiss: false,
      ...options,
    });
  }, [show]);

  // Context value
  const contextValue: NotificationContextValue = {
    notifications,
    isInitialized,
    show,
    dismiss,
    dismissAll,
    update,
    success,
    error: errorNotification,
    warning,
    info,
    confirmation,
    
    // Specialized methods will be added in the next part
    showAttendanceSuccess: (method: string, location?: string) => success('Checked in successfully', `${method}${location ? ` at ${location}` : ''}`),
    showAttendanceError: (errorMsg: string) => errorNotification('Check-in failed', errorMsg),
    showBookingConfirmation: (roomName: string, date: string, time: string) => success('Room booked', `${roomName} on ${date} at ${time}`),
    showParkingConfirmation: (spotId: string, duration?: string) => success('Parking reserved', `Spot ${spotId}${duration ? ` for ${duration}` : ''}`),
    showAuthError: (errorMsg: string) => errorNotification('Authentication failed', errorMsg),
    showAuthSuccess: (message: string) => success('Welcome back!', message),
    showQRScanResult: (isSuccess: boolean, data?: any) => isSuccess ? success('QR Code verified', data?.location_description) : errorNotification('Invalid QR Code', 'Please try scanning again'),
    showLeaveRequestStatus: (status: 'submitted' | 'approved' | 'rejected', details?: string) => {
      switch (status) {
        case 'submitted':
          return success('Leave request submitted', details);
        case 'approved':
          return success('Leave request approved', details);
        case 'rejected':
          return warning('Leave request rejected', details);
        default:
          return info('Leave request updated', details);
      }
    },
  };

  return (
    <AppNotificationContext.Provider value={contextValue}>
      {children}
    </AppNotificationContext.Provider>
  );
};
