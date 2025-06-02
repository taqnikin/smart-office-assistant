// Smart Office Assistant - Notification System Types
// TypeScript types and interfaces for the comprehensive notification system

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

export type NotificationPosition = 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left' | 'center';

export type NotificationDuration = 'short' | 'medium' | 'long' | 'persistent' | number;

export interface NotificationAction {
  label: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
}

export interface BaseNotificationConfig {
  id?: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: NotificationDuration;
  position?: NotificationPosition;
  dismissible?: boolean;
  actions?: NotificationAction[];
  onDismiss?: () => void;
  onShow?: () => void;
  icon?: string;
  customIcon?: React.ReactNode;
  haptic?: boolean;
  sound?: boolean;
}

export interface ToastNotificationConfig extends BaseNotificationConfig {
  variant: 'toast';
  swipeToDismiss?: boolean;
  pauseOnHover?: boolean;
}

export interface ModalNotificationConfig extends BaseNotificationConfig {
  variant: 'modal';
  backdrop?: boolean;
  backdropDismiss?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export type NotificationConfig = ToastNotificationConfig | ModalNotificationConfig;

export interface NotificationState {
  id: string;
  config: NotificationConfig;
  isVisible: boolean;
  createdAt: number;
  dismissedAt?: number;
}

export interface NotificationContextValue {
  // State
  notifications: NotificationState[];
  isInitialized: boolean;
  
  // Core methods
  show: (config: NotificationConfig) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, config: Partial<NotificationConfig>) => void;
  
  // Convenience methods for different types
  success: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  error: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  warning: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  info: (title: string, message?: string, options?: Partial<NotificationConfig>) => string;
  confirmation: (title: string, message?: string, actions?: NotificationAction[], options?: Partial<NotificationConfig>) => string;
  
  // Specialized methods for app features
  showAttendanceSuccess: (method: string, location?: string) => string;
  showAttendanceError: (error: string) => string;
  showBookingConfirmation: (roomName: string, date: string, time: string) => string;
  showParkingConfirmation: (spotId: string, duration?: string) => string;
  showAuthError: (error: string) => string;
  showAuthSuccess: (message: string) => string;
  showQRScanResult: (success: boolean, data?: any) => string;
  showLeaveRequestStatus: (status: 'submitted' | 'approved' | 'rejected', details?: string) => string;
}

// Predefined notification configurations for common scenarios
export const NotificationPresets = {
  // Authentication
  AUTH_SUCCESS: {
    type: 'success' as const,
    title: 'Welcome back!',
    message: 'You have been signed in successfully',
    duration: 'medium' as const,
    icon: 'checkmark-circle',
    haptic: true,
  },
  
  AUTH_ERROR: {
    type: 'error' as const,
    title: 'Sign in failed',
    duration: 'long' as const,
    icon: 'alert-circle',
    haptic: true,
  },
  
  // Attendance
  ATTENDANCE_SUCCESS: {
    type: 'success' as const,
    title: 'Checked in successfully',
    duration: 'medium' as const,
    icon: 'checkmark-circle',
    haptic: true,
  },
  
  ATTENDANCE_ERROR: {
    type: 'error' as const,
    title: 'Check-in failed',
    duration: 'long' as const,
    icon: 'alert-circle',
    haptic: true,
  },
  
  // Booking
  BOOKING_SUCCESS: {
    type: 'success' as const,
    title: 'Room booked successfully',
    duration: 'medium' as const,
    icon: 'calendar',
    haptic: true,
  },
  
  // QR Code
  QR_SCAN_SUCCESS: {
    type: 'success' as const,
    title: 'QR Code verified',
    duration: 'short' as const,
    icon: 'qr-code',
    haptic: true,
  },
  
  QR_SCAN_ERROR: {
    type: 'error' as const,
    title: 'Invalid QR Code',
    duration: 'medium' as const,
    icon: 'close-circle',
    haptic: true,
  },
  
  // Network
  NETWORK_ERROR: {
    type: 'error' as const,
    title: 'Connection error',
    message: 'Please check your internet connection and try again',
    duration: 'long' as const,
    icon: 'wifi-off',
    haptic: true,
  },
  
  // Generic
  LOADING_ERROR: {
    type: 'error' as const,
    title: 'Loading failed',
    message: 'Unable to load data. Please try again.',
    duration: 'medium' as const,
    icon: 'refresh',
    haptic: true,
  },
} as const;

// Duration mappings
export const DurationMap: Record<Exclude<NotificationDuration, number>, number> = {
  short: 2000,
  medium: 4000,
  long: 6000,
  persistent: 0, // 0 means no auto-dismiss
};

// Icon mappings for notification types
export const TypeIconMap: Record<NotificationType, string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
  confirmation: 'help-circle',
};
