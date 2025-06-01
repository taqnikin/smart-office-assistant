import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { useNotifications } from '../contexts/NotificationContext';

// Sample parking data
const PARKING_DATA = {
  car: {
    total: 50,
    available: 12,
    spots: Array(50).fill(null).map((_, i) => ({
      id: `car-${i + 1}`,
      number: i + 1,
      type: 'car',
      isOccupied: Math.random() > 0.25, // Randomize occupancy for demo
      occupiedBy: null
    }))
  },
  bike: {
    total: 40,
    available: 28,
    spots: Array(40).fill(null).map((_, i) => ({
      id: `bike-${i + 1}`,
      number: i + 1,
      type: 'bike',
      isOccupied: Math.random() > 0.7, // Randomize occupancy for demo
      occupiedBy: null
    }))
  }
};

export default function ParkingScreen() {
  const navigation = useNavigation();
  const { sendParkingConfirmation } = useNotifications();
  const [activeTab, setActiveTab] = useState('car');
  const [parkingData, setParkingData] = useState(PARKING_DATA);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userAssignedSpot, setUserAssignedSpot] = useState(null);
  
  const screenWidth = Dimensions.get('window').width;
  const spotSize = (screenWidth - 72) / 5; // Calculate size based on screen width (5 spots per row with padding)
  
  // Simulates checking if user has already reserved a spot
  useEffect(() => {
    // In a real app, this would be an API call to check user's status
    const checkUserParking = () => {
      // Simulate user has spot Car-42 assigned
      setUserAssignedSpot({
        id: 'car-42',
        number: 42,
        type: 'car',
        isOccupied: true,
        occupiedBy: 'You'
      });
    };
    
    checkUserParking();
  }, []);
  
  // Helper to get spot status color
  const getSpotColor = (spot) => {
    if (userAssignedSpot && spot.id === userAssignedSpot.id) {
      return '#4A80F0'; // User's spot
    }
    if (selectedSpot && spot.id === selectedSpot.id) {
      return '#34C759'; // Selected spot
    }
    return spot.isOccupied ? '#FF3B30' : '#34C759'; // Occupied or available
  };
  
  // Handle spot press
  const handleSpotPress = (spot) => {
    if (spot.isOccupied && (!userAssignedSpot || spot.id !== userAssignedSpot.id)) {
      toast.error('This spot is already occupied');
      return;
    }
    
    if (userAssignedSpot && spot.id !== userAssignedSpot.id) {
      toast.error('You already have a spot reserved');
      return;
    }
    
    setSelectedSpot(spot);
  };
  
  // Book selected parking spot
  const bookParkingSpot = async () => {
    if (!selectedSpot) {
      toast.error('Please select a parking spot first');
      return;
    }

    // In a real app, this would make an API call to book the spot
    const spotNumber = `${selectedSpot.type.toUpperCase()}-${selectedSpot.number}`;
    const today = new Date().toLocaleDateString();

    // Send parking confirmation notification
    await sendParkingConfirmation(spotNumber, today);

    toast.success(`Parking spot ${spotNumber} booked successfully!`);

    // Update local state to reflect the booking
    setUserAssignedSpot(selectedSpot);
    
    // Update parking data
    setParkingData(prevData => {
      const updatedSpots = [...prevData[activeTab].spots];
      const spotIndex = updatedSpots.findIndex(spot => spot.id === selectedSpot.id);
      
      if (spotIndex !== -1) {
        updatedSpots[spotIndex] = {
          ...updatedSpots[spotIndex],
          isOccupied: true,
          occupiedBy: 'You'
        };
      }
      
      return {
        ...prevData,
        [activeTab]: {
          ...prevData[activeTab],
          available: prevData[activeTab].available - 1,
          spots: updatedSpots
        }
      };
    });
    
    setSelectedSpot(null);
  };
  
  // Release user's parking spot
  const releaseSpot = () => {
    if (!userAssignedSpot) return;
    
    // In a real app, this would make an API call to release the spot
    toast.success(`Parking spot ${userAssignedSpot.type.toUpperCase()}-${userAssignedSpot.number} released successfully!`);
    
    // Update parking data
    setParkingData(prevData => {
      const spotType = userAssignedSpot.type;
      const updatedSpots = [...prevData[spotType].spots];
      const spotIndex = updatedSpots.findIndex(spot => spot.id === userAssignedSpot.id);
      
      if (spotIndex !== -1) {
        updatedSpots[spotIndex] = {
          ...updatedSpots[spotIndex],
          isOccupied: false,
          occupiedBy: null
        };
      }
      
      return {
        ...prevData,
        [spotType]: {
          ...prevData[spotType],
          available: prevData[spotType].available + 1,
          spots: updatedSpots
        }
      };
    });
    
    setUserAssignedSpot(null);
  };
  
  // Render a parking spot
  const renderParkingSpot = ({ item }) => (
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
      disabled={item.isOccupied && (!userAssignedSpot || item.id !== userAssignedSpot.id)}
    >
      <Text style={styles.spotNumber}>{item.number}</Text>
      {userAssignedSpot && item.id === userAssignedSpot.id && (
        <View style={styles.userIndicator}>
          <Ionicons name="person" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
  
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
        {userAssignedSpot && (
          <View style={styles.reservationCard}>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationTitle}>Your Reserved Spot</Text>
              <Text style={styles.reservationSpot}>
                {userAssignedSpot.type.toUpperCase()}-{userAssignedSpot.number}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.releaseButton}
              onPress={releaseSpot}
            >
              <Text style={styles.releaseButtonText}>Release</Text>
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
          />
        </View>
        
        {/* Book Button */}
        {selectedSpot && !userAssignedSpot && (
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={bookParkingSpot}
          >
            <Text style={styles.bookButtonText}>
              Book Spot {selectedSpot.type.toUpperCase()}-{selectedSpot.number}
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
});