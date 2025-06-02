// Smart Office Assistant - Notification Manager Component
// Manages and renders all modal notifications

import React from 'react';
import { View } from 'react-native';
import { useAppNotifications } from '../contexts/AppNotificationContext';
import { NotificationModal } from './NotificationModal';

export const NotificationManager: React.FC = () => {
  const { notifications, dismiss } = useAppNotifications();

  // Filter for modal notifications only (toast notifications are handled by sonner-native)
  const modalNotifications = notifications.filter(
    notification => notification.config.variant === 'modal' && notification.isVisible
  );

  if (modalNotifications.length === 0) {
    return null;
  }

  return (
    <View>
      {modalNotifications.map(notification => (
        <NotificationModal
          key={notification.id}
          notification={notification}
          onDismiss={dismiss}
        />
      ))}
    </View>
  );
};
