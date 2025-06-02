import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { AuthContext } from '../AuthContext';
import { userAPI, roomAPI, parkingAPI, RoomBooking, ParkingReservation } from '../lib/supabase-api';
import { useResponsive, useResponsiveLayout } from '../hooks/useResponsive';

export default function BookingManagementScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const responsive = useResponsive();
  const layout = useResponsiveLayout();
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [parkingReservations, setParkingReservations] = useState<ParkingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'parking'>('rooms');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [roomData, parkingData] = await Promise.all([
        roomAPI.getUserBookings(user.id),
        userAPI.getUserParkingReservations(user.id)
      ]);
      
      setRoomBookings(roomData);
      setParkingReservations(parkingData);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleCancelRoomBooking = (booking: RoomBooking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for ${booking.rooms?.name} on ${new Date(booking.booking_date).toLocaleDateString()}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelRoomBooking(booking.id)
        }
      ]
    );
  };

  const cancelRoomBooking = async (bookingId: string) => {
    try {
      await roomAPI.cancelBooking(bookingId);
      toast.success('Booking cancelled successfully');
      loadBookings(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleCancelParkingReservation = (reservation: ParkingReservation) => {
    Alert.alert(
      'Cancel Reservation',
      `Are you sure you want to cancel your parking reservation for ${new Date(reservation.reservation_date).toLocaleDateString()}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelParkingReservation(reservation.id)
        }
      ]
    );
  };

  const cancelParkingReservation = async (reservationId: string) => {
    try {
      await parkingAPI.cancelReservation(reservationId);
      toast.success('Parking reservation cancelled successfully');
      loadBookings(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      case 'completed':
        return '#8E8E93';
      default:
        return '#007AFF';
    }
  };

  const canCancelBooking = (booking: RoomBooking) => {
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursDifference = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status === 'confirmed' && hoursDifference > 1; // Can cancel if more than 1 hour before
  };

  const canCancelReservation = (reservation: ParkingReservation) => {
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
    const now = new Date();
    const hoursDifference = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return reservation.status === 'active' && hoursDifference > 0.5; // Can cancel if more than 30 minutes before
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A80F0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A80F0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rooms' && styles.activeTab]}
          onPress={() => setActiveTab('rooms')}
        >
          <Ionicons name="business" size={20} color={activeTab === 'rooms' ? '#FFFFFF' : '#4A80F0'} />
          <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
            Room Bookings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'parking' && styles.activeTab]}
          onPress={() => setActiveTab('parking')}
        >
          <Ionicons name="car" size={20} color={activeTab === 'parking' ? '#FFFFFF' : '#4A80F0'} />
          <Text style={[styles.tabText, activeTab === 'parking' && styles.activeTabText]}>
            Parking
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'rooms' ? (
          <View>
            {roomBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No room bookings found</Text>
                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={() => navigation.navigate('BookRoom' as never)}
                >
                  <Text style={styles.bookNowButtonText}>Book a Room</Text>
                </TouchableOpacity>
              </View>
            ) : (
              roomBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.roomName}>{booking.rooms?.name || 'Unknown Room'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {booking.start_time} - {booking.end_time}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text" size={16} color="#666" />
                      <Text style={styles.detailText}>{booking.purpose}</Text>
                    </View>
                  </View>

                  {canCancelBooking(booking) && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelRoomBooking(booking)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {parkingReservations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No parking reservations found</Text>
                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={() => navigation.navigate('Parking' as never)}
                >
                  <Text style={styles.bookNowButtonText}>Reserve Parking</Text>
                </TouchableOpacity>
              </View>
            ) : (
              parkingReservations.map((reservation) => (
                <View key={reservation.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.roomName}>Parking Spot</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) }]}>
                      <Text style={styles.statusText}>{reservation.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {new Date(reservation.reservation_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {reservation.start_time} - {reservation.end_time}
                      </Text>
                    </View>
                  </View>

                  {canCancelReservation(reservation) && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelParkingReservation(reservation)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4A80F0',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  cancelButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 24,
  },
  bookNowButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
