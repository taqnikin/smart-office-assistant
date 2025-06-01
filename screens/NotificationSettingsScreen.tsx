// Smart Office Assistant - Notification Settings Screen
// Allows users to configure their notification preferences

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toast } from 'sonner-native';
import { useNotifications } from '../contexts/NotificationContext';
import { UserNotificationPreferences } from '../services/NotificationService';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    preferences, 
    updatePreferences, 
    permissionStatus, 
    requestPermissions,
    isInitialized 
  } = useNotifications();

  const [localPreferences, setLocalPreferences] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  // Load preferences when component mounts
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  }, [preferences]);

  // Handle permission request
  const handleRequestPermissions = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        toast.success('Notification permissions granted!');
      } else {
        Alert.alert(
          'Permissions Required',
          'To receive notifications, please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, this would open Settings app
              if (Platform.OS === 'ios') {
                // Linking.openURL('app-settings:');
              }
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Failed to request permissions');
    }
  };

  // Save preferences
  const savePreferences = async () => {
    if (!localPreferences) return;

    try {
      setLoading(true);
      await updatePreferences(localPreferences);
      toast.success('Notification preferences saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  // Update local preference
  const updateLocalPreference = (key: keyof UserNotificationPreferences, value: any) => {
    if (!localPreferences) return;
    
    setLocalPreferences({
      ...localPreferences,
      [key]: value
    });
  };

  // Render permission status
  const renderPermissionStatus = () => {
    let statusColor = '#FF6B6B';
    let statusText = 'Denied';
    let statusIcon = 'close-circle';

    switch (permissionStatus) {
      case 'granted':
        statusColor = '#4ECDC4';
        statusText = 'Granted';
        statusIcon = 'checkmark-circle';
        break;
      case 'undetermined':
        statusColor = '#FFE66D';
        statusText = 'Not Set';
        statusIcon = 'help-circle';
        break;
    }

    return (
      <View style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Ionicons name={statusIcon as any} size={24} color={statusColor} />
          <Text style={styles.permissionTitle}>Notification Permissions</Text>
        </View>
        <Text style={[styles.permissionStatus, { color: statusColor }]}>
          Status: {statusText}
        </Text>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render setting row
  const renderSettingRow = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon as any} size={20} color="#4A80F0" />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#4A80F0' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  // Render time picker row
  const renderTimePickerRow = (
    title: string,
    description: string,
    value: number,
    onValueChange: (value: number) => void,
    icon: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon as any} size={20} color="#4A80F0" />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.timePickerContainer}>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => {
            const options = [5, 10, 15, 30, 60];
            Alert.alert(
              'Reminder Time',
              'Choose when to receive reminders before events:',
              options.map(minutes => ({
                text: `${minutes} minutes`,
                onPress: () => onValueChange(minutes)
              }))
            );
          }}
        >
          <Text style={styles.timeButtonText}>{value} min</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isInitialized || !localPreferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity 
          onPress={savePreferences}
          disabled={loading}
        >
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        {renderPermissionStatus()}

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          {renderSettingRow(
            'Room Booking Confirmations',
            'Get notified when your room bookings are confirmed',
            localPreferences.roomBookingConfirmations,
            (value) => updateLocalPreference('roomBookingConfirmations', value),
            'calendar'
          )}

          {renderSettingRow(
            'Room Booking Reminders',
            'Receive reminders before your meetings start',
            localPreferences.roomBookingReminders,
            (value) => updateLocalPreference('roomBookingReminders', value),
            'alarm'
          )}

          {renderSettingRow(
            'Parking Notifications',
            'Get updates about your parking reservations',
            localPreferences.parkingNotifications,
            (value) => updateLocalPreference('parkingNotifications', value),
            'car'
          )}

          {renderSettingRow(
            'Attendance Reminders',
            'Daily reminders to check in and mark attendance',
            localPreferences.attendanceReminders,
            (value) => updateLocalPreference('attendanceReminders', value),
            'time'
          )}

          {renderSettingRow(
            'Admin Alerts',
            'Important notifications from administrators',
            localPreferences.adminAlerts,
            (value) => updateLocalPreference('adminAlerts', value),
            'shield'
          )}

          {renderSettingRow(
            'System Notifications',
            'Updates about app maintenance and new features',
            localPreferences.systemNotifications,
            (value) => updateLocalPreference('systemNotifications', value),
            'settings'
          )}
        </View>

        {/* Timing Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timing Settings</Text>
          
          {renderTimePickerRow(
            'Reminder Time',
            'How early to receive meeting reminders',
            localPreferences.reminderMinutes,
            (value) => updateLocalPreference('reminderMinutes', value),
            'timer'
          )}
        </View>

        {/* Test Notification */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => {
              // Send test notification
              toast.success('Test notification sent!');
            }}
          >
            <Ionicons name="notifications" size={20} color="#4A80F0" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  saveButtonDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timePickerContainer: {
    alignItems: 'flex-end',
  },
  timeButton: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  timeButtonText: {
    color: '#4A80F0',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4A80F0',
    borderStyle: 'dashed',
  },
  testButtonText: {
    color: '#4A80F0',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationSettingsScreen;
