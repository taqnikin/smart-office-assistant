import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNotifications } from '../contexts/NotificationContext';
import { useAttendanceNotifications, useErrorNotifications } from '../hooks/useNotifications';
import { AuthContext } from '../AuthContext';
import { attendanceAPI, wfhAPI, officeAPI, type AttendanceRecord, type OfficeLocation } from '../lib/supabase-api';
import { attendanceVerificationService, type VerificationResult } from '../services/AttendanceVerificationService';
import { supabase } from '../supabase';
import EnhancedCheckInMethodSelector from '../components/EnhancedCheckInMethodSelector';
import AttendanceVerificationDemo from '../components/AttendanceVerificationDemo';

// Types for attendance data
interface AttendanceHistoryItem extends AttendanceRecord {
  checkInTime?: string;
  checkOutTime?: string;
  transportMode?: string;
  leaveReason?: string;
}

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const { sendAttendanceReminder } = useNotifications();
  const { user } = useContext(AuthContext);
  const {
    notifyCheckInSuccess,
    notifyCheckInError,
    notifyLocationVerification,
    notifyWiFiVerification
  } = useAttendanceNotifications();
  const { notifyNetworkError, notifyAPIError } = useErrorNotifications();

  // State
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [todayStatus, setTodayStatus] = useState<'office' | 'wfh' | 'leave'>('office');
  const [transportMode, setTransportMode] = useState<'car' | 'public' | 'bike' | 'walk'>('car');
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wfhEligibility, setWfhEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    maxDaysPerMonth?: number;
    usedDaysThisMonth?: number;
    workMode?: string;
  } | null>(null);
  const [checkingWfhEligibility, setCheckingWfhEligibility] = useState(false);
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([]);
  const [userPrimaryOffice, setUserPrimaryOffice] = useState<OfficeLocation | null>(null);
  const [loadingOfficeLocations, setLoadingOfficeLocations] = useState(false);
  const [showVerificationSelector, setShowVerificationSelector] = useState(false);
  const [selectedVerificationMethod, setSelectedVerificationMethod] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Load office locations from database
  const loadOfficeLocations = async () => {
    if (!user) return;

    try {
      setLoadingOfficeLocations(true);

      // Fetch all active office locations
      const locations = await officeAPI.getOfficeLocations();
      setOfficeLocations(locations);

      // Get user's primary office location from employee details
      if (user.employeeDetails?.primary_office_location_id) {
        const primaryOffice = locations.find(
          loc => loc.id === user.employeeDetails.primary_office_location_id
        );
        setUserPrimaryOffice(primaryOffice || locations[0] || null);
      } else {
        // Default to first office if no primary office assigned
        setUserPrimaryOffice(locations[0] || null);
      }

    } catch (error) {
      notifyAPIError('load office locations');
    } finally {
      setLoadingOfficeLocations(false);
    }
  };

  // Check WFH eligibility for current user
  const checkWFHEligibility = async () => {
    if (!user) return;

    try {
      setCheckingWfhEligibility(true);
      const today = new Date().toISOString().split('T')[0];
      const eligibility = await wfhAPI.checkWFHEligibility(user.id, today);
      setWfhEligibility(eligibility);
    } catch (error) {
      setWfhEligibility({
        eligible: false,
        reason: 'Unable to verify WFH eligibility. Please contact HR.'
      });
    } finally {
      setCheckingWfhEligibility(false);
    }
  };

  // Fetch attendance data from database
  const fetchAttendanceData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's attendance history
      const history = await attendanceAPI.getUserAttendanceHistory(user.id);

      // Transform data for UI
      const transformedHistory = history.map(record => ({
        ...record,
        checkInTime: record.check_in_time ? formatTime(record.check_in_time) : null,
        checkOutTime: record.check_out_time ? formatTime(record.check_out_time) : null,
        transportMode: record.transport_mode,
        leaveReason: record.leave_reason,
        date: record.attendance_date
      }));

      setAttendanceHistory(transformedHistory);

      // Fetch today's attendance record
      const today = await attendanceAPI.getTodayAttendance(user.id);
      setTodayRecord(today);

      // Update component state based on today's record
      if (today) {
        setTodayStatus(today.status);
        setIsCheckedIn(!!today.check_in_time && !today.check_out_time);
        setCheckInTime(today.check_in_time ? formatTime(today.check_in_time) : null);
        setCheckOutTime(today.check_out_time ? formatTime(today.check_out_time) : null);
        setTransportMode((today.transport_mode as any) || 'car');
        setLeaveReason(today.leave_reason || '');
      }

      // Load office locations and check WFH eligibility
      await Promise.all([
        loadOfficeLocations(),
        checkWFHEligibility()
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Format time from HH:MM:SS to HH:MM AM/PM
  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Refresh attendance data
  const refreshAttendanceData = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  // Initial data fetch and real-time subscription
  useEffect(() => {
    if (user) {
      fetchAttendanceData();

      // Set up real-time subscription for attendance updates
      const subscription = supabase
        .channel('attendance_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_records' },
          (payload) => {
            // Only refresh if it's the current user's record
            if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
              fetchAttendanceData();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);
  
  // Request location permission and verify office location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location.coords);

        // Use database-driven office location verification
        if (!userPrimaryOffice) {
          notifyCheckInError('No office location configured. Please contact admin.');
          return false;
        }

        // Calculate distance to user's primary office
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          userPrimaryOffice.latitude,
          userPrimaryOffice.longitude
        );

        const isAtOffice = distance <= userPrimaryOffice.geofence_radius;
        setIsLocationVerified(isAtOffice);

        // Use the new notification method
        notifyLocationVerification(isAtOffice, distance, userPrimaryOffice.name);

        return isAtOffice;
      } else {
        notifyCheckInError('Location permission is required for office check-in');
        return false;
      }
    } catch (error) {
      notifyCheckInError('Failed to get location permission');
      return false;
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle status selection
  const handleStatusSelection = (status: 'office' | 'wfh' | 'leave') => {
    // Prevent changing status if already checked in
    if (isCheckedIn) {
      notifyCheckInError('You are already checked in. Please check out first.');
      return;
    }

    // Check WFH eligibility before allowing selection
    if (status === 'wfh') {
      if (!wfhEligibility) {
        notifyCheckInError('Checking WFH eligibility...');
        return;
      }

      if (!wfhEligibility.eligible) {
        notifyCheckInError(wfhEligibility.reason || 'WFH is not available for your account');
        return;
      }
    }

    setTodayStatus(status);

    if (status === 'office') {
      setShowTransportModal(true);
    } else if (status === 'leave') {
      setShowLeaveModal(true);
    }
  };
  
  // Handle check in
  const handleCheckIn = async () => {
    if (!user) {
      notifyCheckInError('Please log in to check in');
      return;
    }

    // Handle leave check-in
    if (todayStatus === 'leave') {
      if (!leaveReason.trim()) {
        notifyCheckInError('Please provide a reason for leave');
        return;
      }

      try {
        const now = new Date();
        // Record leave in database
        await attendanceAPI.checkIn({
          user_id: user.id,
          attendance_date: now.toISOString().split('T')[0],
          status: 'leave',
          check_in_time: '', // Leave doesn't have check-in time
          leave_reason: leaveReason
        });

        notifyCheckInSuccess('Leave recorded', undefined, now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        await fetchAttendanceData(); // Refresh data
        return;
      } catch (error) {
        notifyCheckInError('Failed to record leave. Please try again.');
        return;
      }
    }

    // Handle WFH check-in
    if (todayStatus === 'wfh') {
      if (!wfhEligibility || !wfhEligibility.eligible) {
        notifyCheckInError('WFH check-in is not allowed. Please check your eligibility status.');
        return;
      }

      // Direct WFH check-in (no verification needed)
      await performCheckIn('wfh', null);
      return;
    }

    // Handle office check-in - show verification method selector
    if (todayStatus === 'office') {
      if (!transportMode) {
        notifyCheckInError('Please select a mode of transport');
        return;
      }

      // Show the enhanced verification method selector
      setShowVerificationSelector(true);
      return;
    }
  };

  // Perform the actual check-in after verification
  const performCheckIn = async (status: string, verification: VerificationResult | null) => {
    if (!user) {
      notifyCheckInError('Please log in to check in');
      return;
    }

    // Prevent multiple simultaneous check-ins
    if (isProcessingCheckIn) {
      notifyCheckInError('Check-in is already in progress...');
      return;
    }

    setIsProcessingCheckIn(true);

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    try {
      // Check if user already has an attendance record for today
      const existingRecord = await attendanceAPI.getTodayAttendance(user.id);

      if (existingRecord) {
        // Update existing record instead of creating new one
        const updateData: Partial<AttendanceRecord> = {
          status: status as 'office' | 'wfh' | 'leave',
          check_in_time: now.toTimeString().split(' ')[0],
          transport_mode: status === 'office' ? transportMode : undefined,
          location_lat: currentLocation?.latitude,
          location_lng: currentLocation?.longitude,
          office_location_id: status === 'office' ? userPrimaryOffice?.id : undefined,
        };

        if (verification) {
          updateData.primary_verification_method = verification.method as 'gps' | 'wifi' | 'qr_code' | 'manual';
          updateData.verification_confidence = verification.confidence;
          updateData.verification_notes = verification.error || undefined;
        }

        await attendanceAPI.updateAttendanceRecord(existingRecord.id, updateData);
      } else {
        // Create new attendance record
        if (verification) {
          // Use enhanced check-in with verification
          const attendanceData = {
            user_id: user.id,
            attendance_date: now.toISOString().split('T')[0],
            status: status as 'office' | 'wfh' | 'leave',
            check_in_time: now.toTimeString().split(' ')[0],
            transport_mode: status === 'office' ? transportMode : undefined,
            location_lat: currentLocation?.latitude,
            location_lng: currentLocation?.longitude,
            office_location_id: status === 'office' ? userPrimaryOffice?.id : undefined,
            primary_verification_method: verification.method as 'gps' | 'wifi' | 'qr_code' | 'manual',
            verification_confidence: verification.confidence,
            verification_notes: verification.error || undefined,
          };

          const verificationMethods = [{
            verification_type: verification.method as 'gps' | 'wifi' | 'qr_code' | 'manual',
            verification_data: verification.data || {},
            verification_success: verification.success,
          }];

          await attendanceAPI.checkInWithVerification(attendanceData, verificationMethods);
        } else {
          // Simple check-in without verification (for WFH and leave)
          const attendanceData = {
            user_id: user.id,
            attendance_date: now.toISOString().split('T')[0],
            status: status as 'office' | 'wfh' | 'leave',
            check_in_time: now.toTimeString().split(' ')[0],
            transport_mode: status === 'office' ? transportMode : undefined,
            location_lat: currentLocation?.latitude,
            location_lng: currentLocation?.longitude,
            office_location_id: status === 'office' ? userPrimaryOffice?.id : undefined,
          };

          await attendanceAPI.checkIn(attendanceData);
        }
      }

      setCheckInTime(formattedTime);
      setIsCheckedIn(true);

      // Show success message with verification method
      let method = 'Check-in';
      let location = undefined;

      if (verification) {
        switch (verification.method) {
          case 'qr_code':
            method = 'QR Code verified';
            location = verification.data?.location_description || 'office';
            break;
          case 'gps_location':
            method = 'Location verified';
            break;
          case 'wifi_network':
            method = 'WiFi verified';
            break;
          case 'manual_approval':
            method = 'Pending admin approval';
            break;
        }
      }

      notifyCheckInSuccess(method, location, formattedTime);
      await fetchAttendanceData(); // Refresh data

    } catch (error) {
      notifyCheckInError('Failed to check in. Please try again.');
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  // Handle verification method selection
  const handleVerificationMethodSelected = async (method: string, result: VerificationResult) => {
    try {
      setSelectedVerificationMethod(method);
      setVerificationResult(result);
      setShowVerificationSelector(false);

      if (result.success) {
        // Show loading state while processing check-in
        toast.loading('Processing check-in...', { id: 'checkin-processing' });

        // Proceed with check-in using the verified method
        await performCheckIn('office', result);

        // Dismiss loading toast
        toast.dismiss('checkin-processing');
      } else {
        // Show error and allow user to try again
        toast.error(result.error || 'Verification failed. Please try another method.');

        // Reset verification selector to allow retry
        setTimeout(() => {
          setShowVerificationSelector(true);
        }, 2000);
      }
    } catch (error) {
      toast.dismiss('checkin-processing');
      toast.error('An unexpected error occurred. Please try again.');

      // Reset state to allow retry
      setSelectedVerificationMethod(null);
      setVerificationResult(null);
    }
  };

  // Handle verification selector close
  const handleVerificationSelectorClose = () => {
    setShowVerificationSelector(false);
    setSelectedVerificationMethod(null);
    setVerificationResult(null);
  };

  // Handle check out
  const handleCheckOut = async () => {
    if (!todayRecord) {
      toast.error('No check-in record found for today');
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    try {
      // Update attendance record in database
      await attendanceAPI.checkOut(todayRecord.id);

      setCheckOutTime(formattedTime);
      setIsCheckedIn(false);

      toast.success(`Checked out at ${formattedTime}`);
      await fetchAttendanceData(); // Refresh data

      // Reset for next day
      setCheckInTime(null);
      setCheckOutTime(null);

    } catch (error) {
      toast.error('Failed to check out. Please try again.');
    }
  };
  
  // Get attendance status icon
  const getAttendanceStatusIcon = (status: string) => {
    switch(status) {
      case 'office':
        return <Ionicons name="business" size={20} color="#4A80F0" />;
      case 'wfh':
        return <Ionicons name="home" size={20} color="#34C759" />;
      case 'leave':
        return <Ionicons name="calendar" size={20} color="#FF9500" />;
      default:
        return null;
    }
  };

  // Get transport mode icon
  const getTransportModeIcon = (mode: string) => {
    switch(mode) {
      case 'car':
        return <Ionicons name="car" size={20} color="#8F9BB3" />;
      case 'public':
        return <Ionicons name="bus" size={20} color="#8F9BB3" />;
      case 'bike':
        return <Ionicons name="bicycle" size={20} color="#8F9BB3" />;
      case 'walk':
        return <Ionicons name="walk" size={20} color="#8F9BB3" />;
      default:
        return null;
    }
  };
  
  // Render attendance history item
  const renderAttendanceItem = ({ item }: { item: AttendanceHistoryItem }) => (
    <View style={styles.attendanceItem}>
      <View style={styles.attendanceDate}>
        <Text style={styles.dateText}>{formatDate(item.date || item.attendance_date)}</Text>
      </View>
      <View style={styles.attendanceDetails}>
        <View style={styles.statusContainer}>
          {getAttendanceStatusIcon(item.status)}
          <Text style={styles.statusText}>
            {item.status === 'office'
              ? 'In Office'
              : item.status === 'wfh'
                ? 'Work from Home'
                : 'On Leave'}
          </Text>
        </View>

        {item.status !== 'leave' ? (
          <>
            <View style={styles.timeContainer}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Check In</Text>
                <Text style={styles.timeValue}>{item.checkInTime || '-'}</Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Check Out</Text>
                <Text style={styles.timeValue}>{item.checkOutTime || '-'}</Text>
              </View>
            </View>

            {item.status === 'office' && item.transportMode && (
              <View style={styles.transportContainer}>
                {getTransportModeIcon(item.transportMode)}
                <Text style={styles.transportText}>
                  {item.transportMode === 'car'
                    ? 'Car'
                    : item.transportMode === 'public'
                      ? 'Public Transport'
                      : item.transportMode === 'bike'
                        ? 'Bicycle'
                        : 'Walking'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.leaveReason}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAttendanceData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222B45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => setShowDemoModal(true)}
        >
          <Ionicons name="flask" size={20} color="#4A80F0" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAttendanceData}
            colors={['#4A80F0']}
            tintColor="#4A80F0"
          />
        }
      >
        {/* Today's Attendance Section */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Status</Text>
          
          <View style={styles.statusSelection}>
            <TouchableOpacity 
              style={[
                styles.statusOption, 
                todayStatus === 'office' && styles.selectedStatusOption
              ]}
              onPress={() => handleStatusSelection('office')}
              disabled={isCheckedIn}
            >
              <Ionicons 
                name="business" 
                size={28} 
                color={todayStatus === 'office' ? "white" : "#4A80F0"} 
              />
              <Text style={[
                styles.statusText,
                todayStatus === 'office' && styles.selectedStatusText
              ]}>
                In Office
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusOption,
                todayStatus === 'wfh' && styles.selectedStatusOption,
                (wfhEligibility && !wfhEligibility.eligible) && styles.disabledStatusOption
              ]}
              onPress={() => handleStatusSelection('wfh')}
              disabled={isCheckedIn || (wfhEligibility && !wfhEligibility.eligible)}
            >
              <Ionicons
                name="home"
                size={28}
                color={
                  todayStatus === 'wfh'
                    ? "white"
                    : (wfhEligibility && !wfhEligibility.eligible)
                      ? "#C5CEE0"
                      : "#34C759"
                }
              />
              <Text style={[
                styles.statusText,
                todayStatus === 'wfh' && styles.selectedStatusText,
                (wfhEligibility && !wfhEligibility.eligible) && styles.disabledStatusText
              ]}>
                Work from Home
              </Text>
              {checkingWfhEligibility && (
                <ActivityIndicator size="small" color="#8F9BB3" style={{ marginTop: 4 }} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statusOption, 
                todayStatus === 'leave' && styles.selectedStatusOption
              ]}
              onPress={() => handleStatusSelection('leave')}
              disabled={isCheckedIn}
            >
              <Ionicons 
                name="calendar" 
                size={28} 
                color={todayStatus === 'leave' ? "white" : "#FF9500"} 
              />
              <Text style={[
                styles.statusText,
                todayStatus === 'leave' && styles.selectedStatusText
              ]}>
                On Leave
              </Text>
            </TouchableOpacity>
          </View>

          {/* Office Location Status */}
          {userPrimaryOffice && todayStatus === 'office' && (
            <View style={styles.officeLocationStatus}>
              <Ionicons name="location" size={18} color="#4A80F0" />
              <Text style={styles.officeLocationText}>
                Office: {userPrimaryOffice.name} ({userPrimaryOffice.geofence_radius}m radius)
              </Text>
            </View>
          )}

          {/* QR Code Check-in Recommendation */}
          {todayStatus === 'office' && !isCheckedIn && (
            <View style={styles.qrRecommendationCard}>
              <View style={styles.qrRecommendationHeader}>
                <Ionicons name="qr-code" size={24} color="#4A80F0" />
                <Text style={styles.qrRecommendationTitle}>Recommended: QR Code Check-in</Text>
              </View>
              <Text style={styles.qrRecommendationText}>
                Scan the office QR code for instant verification. Fastest and most reliable method.
              </Text>
              <View style={styles.qrRecommendationFeatures}>
                <View style={styles.qrFeature}>
                  <Ionicons name="flash" size={16} color="#34C759" />
                  <Text style={styles.qrFeatureText}>Instant verification</Text>
                </View>
                <View style={styles.qrFeature}>
                  <Ionicons name="shield-checkmark" size={16} color="#34C759" />
                  <Text style={styles.qrFeatureText}>Secure & accurate</Text>
                </View>
                <View style={styles.qrFeature}>
                  <Ionicons name="location" size={16} color="#34C759" />
                  <Text style={styles.qrFeatureText}>Location verified</Text>
                </View>
              </View>
            </View>
          )}

          {loadingOfficeLocations && (
            <View style={styles.officeLocationStatus}>
              <ActivityIndicator size="small" color="#4A80F0" />
              <Text style={styles.officeLocationText}>Loading office locations...</Text>
            </View>
          )}

          {/* WFH Eligibility Status */}
          {wfhEligibility && !wfhEligibility.eligible && (
            <View style={styles.wfhEligibilityStatus}>
              <Ionicons name="alert-circle" size={18} color="#FF3B30" />
              <Text style={styles.wfhEligibilityText}>
                WFH Unavailable: {wfhEligibility.reason}
              </Text>
            </View>
          )}

          {wfhEligibility && wfhEligibility.eligible && (
            <View style={styles.wfhEligibilityStatus}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={[styles.wfhEligibilityText, { color: '#34C759' }]}>
                WFH Available ({wfhEligibility.usedDaysThisMonth || 0}/{wfhEligibility.maxDaysPerMonth || 0} days used this month)
              </Text>
            </View>
          )}

          {todayStatus === 'office' && transportMode && (
            <TouchableOpacity 
              style={styles.transportModeButton}
              onPress={() => !isCheckedIn && setShowTransportModal(true)}
              disabled={isCheckedIn}
            >
              <View style={styles.transportModeContent}>
                <Ionicons 
                  name={
                    transportMode === 'car' 
                      ? 'car' 
                      : transportMode === 'public' 
                        ? 'bus' 
                        : transportMode === 'bike' 
                          ? 'bicycle' 
                          : 'walk'
                  } 
                  size={20} 
                  color="#4A80F0" 
                />
                <Text style={styles.transportModeText}>
                  {transportMode === 'car' 
                    ? 'Car' 
                    : transportMode === 'public' 
                      ? 'Public Transport' 
                      : transportMode === 'bike' 
                        ? 'Bicycle' 
                        : 'Walking'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
            </TouchableOpacity>
          )}
          
          {todayStatus === 'leave' && leaveReason && !isCheckedIn && (
            <TouchableOpacity 
              style={styles.reasonButton}
              onPress={() => setShowLeaveModal(true)}
            >
              <View style={styles.reasonButtonContent}>
                <Ionicons name="document-text" size={20} color="#4A80F0" />
                <Text style={styles.reasonButtonText}>
                  {leaveReason.length > 30 
                    ? `${leaveReason.substring(0, 30)}...` 
                    : leaveReason}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
            </TouchableOpacity>
          )}

          {/* Location Status Indicator */}
          {todayStatus === 'office' && (
            <View style={styles.locationStatus}>
              <Ionicons
                name={isLocationVerified ? "location" : "location-outline"}
                size={18}
                color={isLocationVerified ? "#34C759" : "#FF9500"}
              />
              <Text style={[
                styles.locationStatusText,
                { color: isLocationVerified ? "#34C759" : "#FF9500" }
              ]}>
                {isLocationVerified
                  ? "Location verified - You're at the office"
                  : currentLocation
                    ? "Location not verified - Please move closer to office"
                    : "Tap check-in to verify location"
                }
              </Text>
            </View>
          )}

          {/* Check In/Out Button */}
          <TouchableOpacity
            style={[
              styles.checkButton,
              isCheckedIn ? styles.checkOutButton : styles.checkInButton,
              isProcessingCheckIn && styles.disabledButton
            ]}
            onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
            disabled={isProcessingCheckIn}
          >
            <View style={styles.checkButtonContent}>
              {isProcessingCheckIn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                !isCheckedIn && todayStatus === 'office' && (
                  <Ionicons name="qr-code" size={20} color="#FFFFFF" />
                )
              )}
              <Text style={styles.checkButtonText}>
                {isProcessingCheckIn
                  ? 'Processing...'
                  : isCheckedIn
                    ? 'Check Out'
                    : todayStatus === 'office'
                      ? 'Check In with QR Code'
                      : 'Check In'
                }
              </Text>
            </View>
          </TouchableOpacity>
          
          {isCheckedIn && (
            <View style={styles.checkedInInfo}>
              <Ionicons name="time" size={18} color="#4A80F0" />
              <Text style={styles.checkedInText}>
                Checked in at {checkInTime}
              </Text>
            </View>
          )}
        </View>
        
        {/* Attendance History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          
          {attendanceHistory.length > 0 ? (
            <FlatList
              data={attendanceHistory}
              renderItem={renderAttendanceItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noHistoryContainer}>
              <Ionicons name="calendar-outline" size={60} color="#EDF1F7" />
              <Text style={styles.noHistoryText}>No attendance history yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Transport Mode Selection Modal */}
      <Modal
        visible={showTransportModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Transport Mode</Text>
              <TouchableOpacity onPress={() => setShowTransportModal(false)}>
                <Ionicons name="close" size={24} color="#222B45" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.modalOption,
                transportMode === 'car' && styles.selectedModalOption
              ]}
              onPress={() => {
                setTransportMode('car');
                setShowTransportModal(false);
              }}
            >
              <Ionicons 
                name="car" 
                size={24} 
                color={transportMode === 'car' ? "#4A80F0" : "#8F9BB3"} 
              />
              <Text style={[
                styles.modalOptionText,
                transportMode === 'car' && styles.selectedModalOptionText
              ]}>
                Car
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalOption,
                transportMode === 'public' && styles.selectedModalOption
              ]}
              onPress={() => {
                setTransportMode('public');
                setShowTransportModal(false);
              }}
            >
              <Ionicons 
                name="bus" 
                size={24} 
                color={transportMode === 'public' ? "#4A80F0" : "#8F9BB3"} 
              />
              <Text style={[
                styles.modalOptionText,
                transportMode === 'public' && styles.selectedModalOptionText
              ]}>
                Public Transport
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalOption,
                transportMode === 'bike' && styles.selectedModalOption
              ]}
              onPress={() => {
                setTransportMode('bike');
                setShowTransportModal(false);
              }}
            >
              <Ionicons 
                name="bicycle" 
                size={24} 
                color={transportMode === 'bike' ? "#4A80F0" : "#8F9BB3"} 
              />
              <Text style={[
                styles.modalOptionText,
                transportMode === 'bike' && styles.selectedModalOptionText
              ]}>
                Bicycle
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalOption,
                transportMode === 'walk' && styles.selectedModalOption
              ]}
              onPress={() => {
                setTransportMode('walk');
                setShowTransportModal(false);
              }}
            >
              <Ionicons 
                name="walk" 
                size={24} 
                color={transportMode === 'walk' ? "#4A80F0" : "#8F9BB3"} 
              />
              <Text style={[
                styles.modalOptionText,
                transportMode === 'walk' && styles.selectedModalOptionText
              ]}>
                Walking
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Leave Reason Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reason for Leave</Text>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                <Ionicons name="close" size={24} color="#222B45" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.leaveInput}
              placeholder="Enter reason for leave"
              value={leaveReason}
              onChangeText={setLeaveReason}
              multiline
            />
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => {
                if (!leaveReason.trim()) {
                  toast.error('Please provide a reason for leave');
                  return;
                }
                setShowLeaveModal(false);
              }}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Check-in Method Selector */}
      <EnhancedCheckInMethodSelector
        visible={showVerificationSelector}
        onClose={handleVerificationSelectorClose}
        onMethodSelected={handleVerificationMethodSelected}
        demoMode={true}
      />

      {/* Attendance Verification Demo */}
      <AttendanceVerificationDemo
        visible={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onScenarioSelected={(scenario) => {
          // When a scenario is selected, show the verification selector
          setShowVerificationSelector(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  demoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  todaySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 16,
  },
  statusSelection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedStatusOption: {
    backgroundColor: '#4A80F0',
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#222B45',
  },
  selectedStatusText: {
    color: 'white',
  },
  disabledStatusOption: {
    backgroundColor: '#F7F9FC',
    opacity: 0.6,
  },
  disabledStatusText: {
    color: '#C5CEE0',
  },
  wfhEligibilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  wfhEligibilityText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    color: '#FF3B30',
    flex: 1,
    textAlign: 'center',
  },
  officeLocationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  officeLocationText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    color: '#4A80F0',
    flex: 1,
    textAlign: 'center',
  },
  transportModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transportModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportModeText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#222B45',
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reasonButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#222B45',
    flex: 1,
  },
  checkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  checkInButton: {
    backgroundColor: '#4A80F0',
  },
  checkOutButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#C5CEE0',
    opacity: 0.7,
  },
  checkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  qrRecommendationCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  qrRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrRecommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
    marginLeft: 8,
  },
  qrRecommendationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  qrRecommendationFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qrFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qrFeatureText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
  },
  checkedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkedInText: {
    fontSize: 14,
    color: '#8F9BB3',
    marginLeft: 8,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  locationStatusText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  historySection: {
    marginBottom: 24,
  },
  attendanceItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceDate: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222B45',
  },
  attendanceDetails: {
    borderTopWidth: 1,
    borderTopColor: '#EDF1F7',
    paddingTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222B45',
  },
  transportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8F9BB3',
  },
  reasonContainer: {
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#222B45',
  },
  noHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noHistoryText: {
    fontSize: 16,
    color: '#8F9BB3',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  selectedModalOption: {
    backgroundColor: '#F0F7FF',
  },
  modalOptionText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#222B45',
  },
  selectedModalOptionText: {
    color: '#4A80F0',
    fontWeight: '600',
  },
  leaveInput: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  submitButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8F9BB3',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});