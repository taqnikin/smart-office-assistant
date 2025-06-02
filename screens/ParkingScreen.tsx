import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { useNotifications } from '../contexts/NotificationContext';
import { AuthContext } from '../AuthContext';
import { parkingAPI, type ParkingSpot, type ParkingReservation } from '../lib/supabase-api';
import { supabase } from '../supabase';

// Types for parking data
interface ParkingSpotWithReservation extends ParkingSpot {
  isOccupied: boolean;
  occupiedBy: string | null;
  reservationId?: string;
}

interface ParkingData {
  car: {
    total: number;
    available: number;
    spots: ParkingSpotWithReservation[];
  };
  bike: {
    total: number;
    available: number;
    spots: ParkingSpotWithReservation[];
  };
}

export default function ParkingScreen() {
  const navigation = useNavigation();
  const { sendParkingConfirmation } = useNotifications();
  const { user } = useContext(AuthContext);

  // State management
  const [activeTab, setActiveTab] = useState<'car' | 'bike'>('car');
  const [parkingData, setParkingData] = useState<ParkingData>({
    car: { total: 0, available: 0, spots: [] },
    bike: { total: 0, available: 0, spots: [] }
  });
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotWithReservation | null>(null);
  const [userReservation, setUserReservation] = useState<ParkingReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const spotSize = (screenWidth - 72) / 5; // Calculate size based on screen width (5 spots per row with padding)
  
  // Fetch parking data from database
  const fetchParkingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      // Fetch all parking spots with their current reservations
      const spotsWithReservations = await parkingAPI.getAllSpotsWithReservations(today);

      // Fetch user's current reservation
      const userCurrentReservation = await parkingAPI.getUserCurrentReservation(user.id);
      setUserReservation(userCurrentReservation);

      // Transform data for UI
      const transformedData = transformParkingData(spotsWithReservations, userCurrentReservation);
      setParkingData(transformedData);

    } catch (err) {
      console.error('Failed to fetch parking data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load parking data');
    } finally {
      setLoading(false);
    }
  };

  // Transform database data to UI format
  const transformParkingData = (spots: any[], userReservation: ParkingReservation | null): ParkingData => {
    const carSpots: ParkingSpotWithReservation[] = [];
    const bikeSpots: ParkingSpotWithReservation[] = [];

    spots.forEach(spot => {
      const reservation = spot.parking_reservations?.[0];
      const isUserSpot = userReservation?.parking_spot_id === spot.id;

      const transformedSpot: ParkingSpotWithReservation = {
        ...spot,
        isOccupied: !!reservation || isUserSpot,
        occupiedBy: isUserSpot ? 'You' : (reservation ? 'Occupied' : null),
        reservationId: reservation?.id
      };

      if (spot.spot_type === 'car') {
        carSpots.push(transformedSpot);
      } else {
        bikeSpots.push(transformedSpot);
      }
    });

    return {
      car: {
        total: carSpots.length,
        available: carSpots.filter(spot => !spot.isOccupied).length,
        spots: carSpots.sort((a, b) => a.spot_number - b.spot_number)
      },
      bike: {
        total: bikeSpots.length,
        available: bikeSpots.filter(spot => !spot.isOccupied).length,
        spots: bikeSpots.sort((a, b) => a.spot_number - b.spot_number)
      }
    };
  };

  // Refresh parking data
  const refreshParkingData = async () => {
    setRefreshing(true);
    await fetchParkingData();
    setRefreshing(false);
  };

  // Initial data fetch and real-time subscription
  useEffect(() => {
    if (user) {
      fetchParkingData();

      // Set up real-time subscription for parking updates
      const subscription = supabase
        .channel('parking_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'parking_reservations' },
          () => {
            fetchParkingData();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);
  
  // Helper to get spot status color
  const getSpotColor = (spot: ParkingSpotWithReservation) => {
    if (userReservation && spot.id === userReservation.parking_spot_id) {
      return '#4A80F0'; // User's spot
    }
    if (selectedSpot && spot.id === selectedSpot.id) {
      return '#34C759'; // Selected spot
    }
    return spot.isOccupied ? '#FF3B30' : '#34C759'; // Occupied or available
  };

  // Handle spot press
  const handleSpotPress = (spot: ParkingSpotWithReservation) => {
    if (!user) {
      toast.error('Please log in to reserve a parking spot');
      return;
    }

    if (spot.isOccupied && (!userReservation || spot.id !== userReservation.parking_spot_id)) {
      toast.error('This spot is already occupied');
      return;
    }

    if (userReservation && spot.id !== userReservation.parking_spot_id) {
      toast.error('You already have a spot reserved');
      return;
    }

    setSelectedSpot(spot);
  };
  
  // Book selected parking spot
  const bookParkingSpot = async () => {
    if (!selectedSpot || !user) {
      toast.error('Please select a parking spot first');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];

      // Create reservation in database
      const reservation = await parkingAPI.createReservation({
        user_id: user.id,
        parking_spot_id: selectedSpot.id,
        reservation_date: today,
        start_time: currentTime,
        status: 'active'
      });

      const spotNumber = `${selectedSpot.spot_type.toUpperCase()}-${selectedSpot.spot_number}`;

      // Send parking confirmation notification
      await sendParkingConfirmation(spotNumber, today);

      toast.success(`Parking spot ${spotNumber} booked successfully!`);

      // Refresh data to reflect the booking
      await fetchParkingData();
      setSelectedSpot(null);

    } catch (error) {
      console.error('Failed to book parking spot:', error);
      toast.error('Failed to book parking spot. Please try again.');
    }
  };
  
  // Release user's parking spot with confirmation
  const releaseSpot = async () => {
    if (!userReservation) {
      toast.error('No active reservation found to cancel');
      return;
    }

    const spotNumber = `${userReservation.parking_spots.spot_type.toUpperCase()}-${userReservation.parking_spots.spot_number}`;

    // Show confirmation dialog
    Alert.alert(
      'Release Parking Spot',
      `Are you sure you want to release parking spot ${spotNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            try {
              setReleasing(true);

              // Cancel reservation in database
              const cancelledReservation = await parkingAPI.cancelReservation(userReservation.id);

              if (cancelledReservation.status !== 'cancelled') {
                throw new Error('Reservation was not properly cancelled');
              }

              toast.success(`Parking spot ${spotNumber} released successfully!`);

              // Clear user reservation state immediately for better UX
              setUserReservation(null);

              // Refresh data to reflect the release
              await fetchParkingData();

            } catch (error) {
              console.error('Failed to release parking spot:', error);

              // Provide more specific error messages
              if (error instanceof Error) {
                if (error.message.includes('not found')) {
                  toast.error('Reservation not found. It may have already been cancelled.');
                } else if (error.message.includes('permission')) {
                  toast.error('You do not have permission to cancel this reservation.');
                } else {
                  toast.error(`Failed to release parking spot: ${error.message}`);
                }
              } else {
                toast.error('Failed to release parking spot. Please try again.');
              }

              // Refresh data to get current state
              await fetchParkingData();
            } finally {
              setReleasing(false);
            }
          },
        },
      ]
    );
  };
  
  // Render a parking spot
  const renderParkingSpot = ({ item }: { item: ParkingSpotWithReservation }) => (
    <TouchableOpacity
      style={[
        styles.parkingSpot,
        {
          width: spotSize,
          height: spotSize,
          backgroundColor: getSpotColor(item)
        }
      ]}
      onPress={() => handleSpotPress(item)}
      disabled={item.isOccupied && (!userReservation || item.id !== userReservation.parking_spot_id)}
    >
      <Text style={styles.spotNumber}>{item.spot_number}</Text>
      {userReservation && item.id === userReservation.parking_spot_id && (
        <View style={styles.userIndicator}>
          <Ionicons name="person" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading parking data...</Text>
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
          <Text style={styles.headerTitle}>Parking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchParkingData}>
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
        <Text style={styles.headerTitle}>Parking</Text>
        <View style={{ width: 40 }} /> {/* Empty view for alignment */}
      </View>
      
      <View style={styles.content}>
        {/* User's Reserved Spot */}
        {userReservation && (
          <View style={styles.reservationCard}>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationTitle}>Your Reserved Spot</Text>
              <Text style={styles.reservationSpot}>
                {userReservation.parking_spots.spot_type.toUpperCase()}-{userReservation.parking_spots.spot_number}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.releaseButton, releasing && styles.releaseButtonDisabled]}
              onPress={releaseSpot}
              disabled={releasing}
            >
              {releasing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.releaseButtonText}>Release</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Tabs for car/bike */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'car' && styles.activeTab]}
            onPress={() => setActiveTab('car')}
          >
            <Ionicons 
              name="car" 
              size={24} 
              color={activeTab === 'car' ? '#4A80F0' : '#8F9BB3'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'car' && styles.activeTabText
            ]}>
              Car ({parkingData.car.available}/{parkingData.car.total})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bike' && styles.activeTab]}
            onPress={() => setActiveTab('bike')}
          >
            <Ionicons 
              name="bicycle" 
              size={24} 
              color={activeTab === 'bike' ? '#4A80F0' : '#8F9BB3'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'bike' && styles.activeTabText
            ]}>
              Bike ({parkingData.bike.available}/{parkingData.bike.total})
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4A80F0' }]} />
            <Text style={styles.legendText}>Your Spot</Text>
          </View>
        </View>
        
        {/* Parking Layout */}
        <View style={styles.parkingLayout}>
          <FlatList
            data={parkingData[activeTab].spots}
            renderItem={renderParkingSpot}
            keyExtractor={item => item.id}
            numColumns={5}
            scrollEnabled={true}
            contentContainerStyle={styles.parkingGrid}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshParkingData}
                colors={['#4A80F0']}
                tintColor="#4A80F0"
              />
            }
          />
        </View>
        
        {/* Book Button */}
        {selectedSpot && !userReservation && (
          <TouchableOpacity
            style={styles.bookButton}
            onPress={bookParkingSpot}
          >
            <Text style={styles.bookButtonText}>
              Book Spot {selectedSpot.spot_type.toUpperCase()}-{selectedSpot.spot_number}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  reservationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4A80F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reservationInfo: {
    flex: 1,
  },
  reservationTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  reservationSpot: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  releaseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.7,
  },
  releaseButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#F0F7FF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#8F9BB3',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4A80F0',
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  parkingLayout: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  parkingGrid: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  parkingSpot: {
    margin: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  userIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  bookButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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