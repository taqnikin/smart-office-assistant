// Smart Office Assistant - Notification Test Utilities
// Helper functions for testing and demonstrating notification functionality

import { notificationService, NotificationType, NotificationData } from '../services/NotificationService';

export class NotificationTestUtils {
  
  // Test all notification types
  static async testAllNotificationTypes(): Promise<void> {
    console.log('🔔 Testing all notification types...');
    
    const testNotifications: NotificationData[] = [
      {
        type: NotificationType.ROOM_BOOKING_CONFIRMED,
        title: 'Room Booked Successfully! 🎉',
        body: 'Conference Room A is reserved for today at 2:00 PM',
        data: { roomName: 'Conference Room A', date: 'today', time: '2:00 PM' }
      },
      {
        type: NotificationType.PARKING_RESERVED,
        title: 'Parking Spot Reserved! 🚗',
        body: 'Spot CAR-15 is reserved for today',
        data: { spotNumber: 'CAR-15', date: 'today' }
      },
      {
        type: NotificationType.ATTENDANCE_REMINDER,
        title: 'Don\'t Forget to Check In! ⏰',
        body: 'Remember to mark your attendance for today',
        data: { reminderType: 'daily_checkin' }
      },
      {
        type: NotificationType.ADMIN_ALERT,
        title: 'System Maintenance Notice 🔧',
        body: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM',
        data: { maintenanceWindow: '11 PM - 1 AM' }
      },
      {
        type: NotificationType.GENERAL_INFO,
        title: 'Welcome to Smart Office! 👋',
        body: 'Your notification system is working perfectly',
        data: { testMessage: true }
      }
    ];

    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      console.log(`📱 Sending test notification ${i + 1}/${testNotifications.length}: ${notification.title}`);
      
      try {
        const notificationId = await notificationService.sendLocalNotification(notification);
        if (notificationId) {
          console.log(`✅ Notification sent successfully with ID: ${notificationId}`);
        } else {
          console.log('❌ Failed to send notification');
        }
        
        // Wait 2 seconds between notifications to avoid spam
        if (i < testNotifications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Error sending notification: ${error}`);
      }
    }
    
    console.log('🎯 Notification test completed!');
  }

  // Test scheduled notifications
  static async testScheduledNotifications(): Promise<string[]> {
    console.log('⏰ Testing scheduled notifications...');
    
    const scheduledNotifications: NotificationData[] = [
      {
        type: NotificationType.ROOM_BOOKING_REMINDER,
        title: 'Meeting Starting Soon! 📅',
        body: 'Your meeting in Conference Room A starts in 15 minutes',
        scheduledTime: new Date(Date.now() + 10000), // 10 seconds from now
        data: { roomName: 'Conference Room A', bookingId: 'test-booking-1' }
      },
      {
        type: NotificationType.PARKING_REMINDER,
        title: 'Parking Reminder 🚗',
        body: 'Your parking reservation expires in 30 minutes',
        scheduledTime: new Date(Date.now() + 20000), // 20 seconds from now
        data: { spotNumber: 'CAR-15', expiryTime: '30 minutes' }
      }
    ];

    const notificationIds: string[] = [];

    for (const notification of scheduledNotifications) {
      try {
        const notificationId = await notificationService.scheduleNotification(notification);
        if (notificationId) {
          notificationIds.push(notificationId);
          console.log(`✅ Scheduled notification: ${notification.title} at ${notification.scheduledTime?.toLocaleTimeString()}`);
        } else {
          console.log(`❌ Failed to schedule notification: ${notification.title}`);
        }
      } catch (error) {
        console.error(`❌ Error scheduling notification: ${error}`);
      }
    }

    console.log(`⏰ Scheduled ${notificationIds.length} notifications`);
    return notificationIds;
  }

  // Test notification permissions
  static async testNotificationPermissions(): Promise<boolean> {
    console.log('🔐 Testing notification permissions...');
    
    try {
      const permissionStatus = await notificationService.getPermissionStatus();
      console.log(`📋 Current permission status: ${permissionStatus}`);
      
      if (permissionStatus !== 'granted') {
        console.log('🔓 Requesting notification permissions...');
        const granted = await notificationService.requestPermissions();
        
        if (granted) {
          console.log('✅ Notification permissions granted!');
          return true;
        } else {
          console.log('❌ Notification permissions denied');
          return false;
        }
      } else {
        console.log('✅ Notification permissions already granted');
        return true;
      }
    } catch (error) {
      console.error(`❌ Error checking permissions: ${error}`);
      return false;
    }
  }

  // Test push token generation
  static async testPushTokenGeneration(): Promise<string | null> {
    console.log('🎫 Testing push token generation...');
    
    try {
      const token = await notificationService.getPushToken();
      
      if (token) {
        console.log(`✅ Push token generated: ${token.substring(0, 20)}...`);
        return token;
      } else {
        console.log('❌ Failed to generate push token');
        return null;
      }
    } catch (error) {
      console.error(`❌ Error generating push token: ${error}`);
      return null;
    }
  }

  // Test notification service initialization
  static async testNotificationServiceInitialization(): Promise<boolean> {
    console.log('🚀 Testing notification service initialization...');
    
    try {
      const initialized = await notificationService.initialize();
      
      if (initialized) {
        console.log('✅ Notification service initialized successfully');
        return true;
      } else {
        console.log('❌ Failed to initialize notification service');
        return false;
      }
    } catch (error) {
      console.error(`❌ Error initializing notification service: ${error}`);
      return false;
    }
  }

  // Run comprehensive notification test suite
  static async runComprehensiveTest(): Promise<void> {
    console.log('🧪 Starting comprehensive notification test suite...');
    console.log('================================================');
    
    // Test 1: Service initialization
    const initialized = await this.testNotificationServiceInitialization();
    if (!initialized) {
      console.log('❌ Test suite aborted: Service initialization failed');
      return;
    }
    
    console.log('');
    
    // Test 2: Permissions
    const permissionsGranted = await this.testNotificationPermissions();
    if (!permissionsGranted) {
      console.log('⚠️ Continuing without permissions (notifications may not work)');
    }
    
    console.log('');
    
    // Test 3: Push token
    await this.testPushTokenGeneration();
    
    console.log('');
    
    // Test 4: Immediate notifications
    await this.testAllNotificationTypes();
    
    console.log('');
    
    // Test 5: Scheduled notifications
    const scheduledIds = await this.testScheduledNotifications();
    
    console.log('');
    console.log('================================================');
    console.log('🎉 Comprehensive notification test completed!');
    console.log(`📊 Results: ${scheduledIds.length} scheduled notifications created`);
    console.log('💡 Check your device for notification alerts');
    
    // Optional: Cancel scheduled notifications after 1 minute
    setTimeout(async () => {
      console.log('🧹 Cleaning up scheduled test notifications...');
      for (const id of scheduledIds) {
        await notificationService.cancelNotification(id);
      }
      console.log('✅ Test notifications cleaned up');
    }, 60000);
  }

  // Test notification with custom data
  static async testCustomNotification(
    title: string, 
    body: string, 
    type: NotificationType = NotificationType.GENERAL_INFO,
    customData?: any
  ): Promise<string | null> {
    console.log(`📱 Sending custom notification: ${title}`);
    
    const notification: NotificationData = {
      type,
      title,
      body,
      data: customData
    };
    
    try {
      const notificationId = await notificationService.sendLocalNotification(notification);
      
      if (notificationId) {
        console.log(`✅ Custom notification sent with ID: ${notificationId}`);
        return notificationId;
      } else {
        console.log('❌ Failed to send custom notification');
        return null;
      }
    } catch (error) {
      console.error(`❌ Error sending custom notification: ${error}`);
      return null;
    }
  }

  // Get notification statistics
  static getNotificationStats(): { [key: string]: any } {
    return {
      serviceInitialized: notificationService['isInitialized'] || false,
      pushToken: notificationService['expoPushToken'] ? 'Available' : 'Not available',
      supportedTypes: Object.values(NotificationType),
      testUtilsVersion: '1.0.0'
    };
  }
}

export default NotificationTestUtils;
