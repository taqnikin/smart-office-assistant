// Smart Office Assistant - Notification Hooks
// Custom hooks for easy notification management

import { useCallback } from 'react';
import { useAppNotifications } from '../contexts/AppNotificationContext';
import { NotificationAction } from '../types/NotificationTypes';

// Main notification hook
export const useNotifications = () => {
  const notifications = useAppNotifications();
  return notifications;
};

// Hook for attendance-related notifications
export const useAttendanceNotifications = () => {
  const { showAttendanceSuccess, showAttendanceError, warning, info } = useAppNotifications();

  const notifyCheckInSuccess = useCallback((method: string, location?: string, time?: string) => {
    const message = `${method}${location ? ` at ${location}` : ''}${time ? ` at ${time}` : ''}`;
    return showAttendanceSuccess(method, location);
  }, [showAttendanceSuccess]);

  const notifyCheckInError = useCallback((error: string, suggestion?: string) => {
    const message = suggestion ? `${error}. ${suggestion}` : error;
    return showAttendanceError(message);
  }, [showAttendanceError]);

  const notifyLocationVerification = useCallback((isVerified: boolean, distance?: number, officeName?: string) => {
    if (isVerified) {
      return info('Location verified', `You are at ${officeName || 'the office'}`);
    } else {
      const message = distance 
        ? `You are ${Math.round(distance)}m from ${officeName || 'the office'}`
        : 'Please move closer to the office to check in';
      return warning('Location verification failed', message);
    }
  }, [info, warning]);

  const notifyWiFiVerification = useCallback((isConnected: boolean, networkName?: string) => {
    if (isConnected) {
      return info('WiFi verified', `Connected to ${networkName || 'office network'}`);
    } else {
      return warning('WiFi verification failed', 'Please connect to the office WiFi network');
    }
  }, [info, warning]);

  return {
    notifyCheckInSuccess,
    notifyCheckInError,
    notifyLocationVerification,
    notifyWiFiVerification,
  };
};

// Hook for booking-related notifications
export const useBookingNotifications = () => {
  const { showBookingConfirmation, success, error, warning, confirmation } = useAppNotifications();

  const notifyBookingSuccess = useCallback((roomName: string, date: string, time: string) => {
    return showBookingConfirmation(roomName, date, time);
  }, [showBookingConfirmation]);

  const notifyBookingError = useCallback((errorMessage: string) => {
    return error('Booking failed', errorMessage);
  }, [error]);

  const notifyBookingConflict = useCallback((roomName: string, conflictTime: string) => {
    return warning('Booking conflict', `${roomName} is already booked at ${conflictTime}`);
  }, [warning]);

  const confirmBookingCancellation = useCallback((roomName: string, date: string, onConfirm: () => void) => {
    const actions: NotificationAction[] = [
      { label: 'Cancel', onPress: () => {}, style: 'cancel' },
      { label: 'Confirm', onPress: onConfirm, style: 'destructive' },
    ];
    
    return confirmation(
      'Cancel booking?',
      `Are you sure you want to cancel your booking for ${roomName} on ${date}?`,
      actions
    );
  }, [confirmation]);

  return {
    notifyBookingSuccess,
    notifyBookingError,
    notifyBookingConflict,
    confirmBookingCancellation,
  };
};

// Hook for authentication-related notifications
export const useAuthNotifications = () => {
  const { showAuthSuccess, showAuthError, warning, info } = useAppNotifications();

  const notifySignInSuccess = useCallback((userName?: string) => {
    const message = userName ? `Welcome back, ${userName}!` : 'You have been signed in successfully';
    return showAuthSuccess(message);
  }, [showAuthSuccess]);

  const notifySignInError = useCallback((error: string) => {
    return showAuthError(error);
  }, [showAuthError]);

  const notifySignOutSuccess = useCallback(() => {
    return info('Signed out', 'You have been signed out successfully');
  }, [info]);

  const notifySessionExpired = useCallback(() => {
    return warning('Session expired', 'Please sign in again to continue');
  }, [warning]);

  const notifyAccountLocked = useCallback((remainingTime: number) => {
    const minutes = Math.ceil(remainingTime / 60000);
    return warning('Account locked', `Too many failed attempts. Try again in ${minutes} minutes.`);
  }, [warning]);

  return {
    notifySignInSuccess,
    notifySignInError,
    notifySignOutSuccess,
    notifySessionExpired,
    notifyAccountLocked,
  };
};

// Hook for QR code-related notifications
export const useQRNotifications = () => {
  const { showQRScanResult, success, error, info } = useAppNotifications();

  const notifyQRScanSuccess = useCallback((data: any) => {
    return showQRScanResult(true, data);
  }, [showQRScanResult]);

  const notifyQRScanError = useCallback((errorMessage?: string) => {
    return showQRScanResult(false, { error: errorMessage });
  }, [showQRScanResult]);

  const notifyQRCodeGenerated = useCallback((purpose: string) => {
    return success('QR Code generated', `QR code for ${purpose} is ready`);
  }, [success]);

  const notifyQRCodeExpired = useCallback(() => {
    return info('QR Code expired', 'Please generate a new QR code');
  }, [info]);

  return {
    notifyQRScanSuccess,
    notifyQRScanError,
    notifyQRCodeGenerated,
    notifyQRCodeExpired,
  };
};

// Hook for parking-related notifications
export const useParkingNotifications = () => {
  const { showParkingConfirmation, success, error, warning, confirmation } = useAppNotifications();

  const notifyParkingReserved = useCallback((spotId: string, duration?: string) => {
    return showParkingConfirmation(spotId, duration);
  }, [showParkingConfirmation]);

  const notifyParkingError = useCallback((errorMessage: string) => {
    return error('Parking reservation failed', errorMessage);
  }, [error]);

  const notifyParkingExpiring = useCallback((spotId: string, minutesLeft: number) => {
    return warning('Parking expiring', `Your reservation for spot ${spotId} expires in ${minutesLeft} minutes`);
  }, [warning]);

  const confirmParkingCancellation = useCallback((spotId: string, onConfirm: () => void) => {
    const actions: NotificationAction[] = [
      { label: 'Keep', onPress: () => {}, style: 'cancel' },
      { label: 'Cancel', onPress: onConfirm, style: 'destructive' },
    ];
    
    return confirmation(
      'Cancel parking reservation?',
      `Are you sure you want to cancel your reservation for spot ${spotId}?`,
      actions
    );
  }, [confirmation]);

  return {
    notifyParkingReserved,
    notifyParkingError,
    notifyParkingExpiring,
    confirmParkingCancellation,
  };
};

// Hook for leave management notifications
export const useLeaveNotifications = () => {
  const { showLeaveRequestStatus, success, error, info, confirmation } = useAppNotifications();

  const notifyLeaveSubmitted = useCallback((leaveType: string, dates: string) => {
    return showLeaveRequestStatus('submitted', `${leaveType} for ${dates}`);
  }, [showLeaveRequestStatus]);

  const notifyLeaveApproved = useCallback((leaveType: string, dates: string) => {
    return showLeaveRequestStatus('approved', `${leaveType} for ${dates}`);
  }, [showLeaveRequestStatus]);

  const notifyLeaveRejected = useCallback((leaveType: string, reason?: string) => {
    const details = reason ? `Reason: ${reason}` : undefined;
    return showLeaveRequestStatus('rejected', details);
  }, [showLeaveRequestStatus]);

  const confirmLeaveWithdrawal = useCallback((leaveType: string, dates: string, onConfirm: () => void) => {
    const actions: NotificationAction[] = [
      { label: 'Keep', onPress: () => {}, style: 'cancel' },
      { label: 'Withdraw', onPress: onConfirm, style: 'destructive' },
    ];
    
    return confirmation(
      'Withdraw leave request?',
      `Are you sure you want to withdraw your ${leaveType} request for ${dates}?`,
      actions
    );
  }, [confirmation]);

  return {
    notifyLeaveSubmitted,
    notifyLeaveApproved,
    notifyLeaveRejected,
    confirmLeaveWithdrawal,
  };
};

// Hook for network and API error notifications
export const useErrorNotifications = () => {
  const { error, warning, info } = useAppNotifications();

  const notifyNetworkError = useCallback((action?: string) => {
    const message = action 
      ? `Unable to ${action}. Please check your connection and try again.`
      : 'Please check your internet connection and try again.';
    return error('Connection error', message);
  }, [error]);

  const notifyAPIError = useCallback((action: string, statusCode?: number) => {
    const message = statusCode 
      ? `Server error (${statusCode}). Please try again later.`
      : 'Server error. Please try again later.';
    return error(`Failed to ${action}`, message);
  }, [error]);

  const notifyValidationError = useCallback((field: string, message: string) => {
    return warning('Validation error', `${field}: ${message}`);
  }, [warning]);

  const notifyMaintenanceMode = useCallback(() => {
    return info('Maintenance mode', 'The system is currently under maintenance. Please try again later.');
  }, [info]);

  return {
    notifyNetworkError,
    notifyAPIError,
    notifyValidationError,
    notifyMaintenanceMode,
  };
};
