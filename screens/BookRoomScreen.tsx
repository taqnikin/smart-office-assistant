import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useBookingNotifications, useErrorNotifications } from '../hooks/useNotifications';
import { roomAPI, type Room, type RoomBooking } from '../lib/supabase-api';

// Time slots for booking (24-hour format for database)
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

// Helper function to format time for display
const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to calculate end time
const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':');
  const startHour = parseInt(hours);
  const endHour = startHour + duration;
  return `${endHour.toString().padStart(2, '0')}:${minutes}`;
};

interface RoomWithAvailability extends Room {
  isAvailable?: boolean;
  conflictingBookings?: number;
}

export default function BookRoomScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { sendRoomBookingConfirmation, scheduleRoomReminder } = useNotifications();
  const {
    notifyBookingSuccess,
    notifyBookingError,
    notifyBookingConflict,
    confirmBookingCancellation
  } = useBookingNotifications();
  const { notifyNetworkError, notifyAPIError, notifyValidationError } = useErrorNotifications();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<RoomWithAvailability | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [rooms, setRooms] = useState<RoomWithAvailability[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomWithAvailability[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterCapacity, setFilterCapacity] = useState(0);
  const [filterFloor, setFilterFloor] = useState('All');
  const [filterAV, setFilterAV] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  
  // Load rooms from database
  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await roomAPI.getAllRooms();
      setRooms(roomsData);
      setFilteredRooms(roomsData);
    } catch (error) {
      notifyAPIError('load rooms');
    } finally {
      setLoading(false);
    }
  };

  // Check room availability for selected date and time
  const checkRoomAvailability = async () => {
    if (!selectedTimeSlot || !selectedDate) return;

    try {
      setAvailabilityLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const endTime = calculateEndTime(selectedTimeSlot, duration);

      const roomsWithAvailability = await Promise.all(
        filteredRooms.map(async (room) => {
          const isAvailable = await roomAPI.checkRoomAvailability(
            room.id,
            dateStr,
            selectedTimeSlot,
            endTime
          );
          return {
            ...room,
            isAvailable
          };
        })
      );

      setFilteredRooms(roomsWithAvailability);
    } catch (error) {
      notifyAPIError('check room availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Check availability when date, time, or duration changes
  useEffect(() => {
    if (selectedTimeSlot && selectedDate) {
      checkRoomAvailability();
    }
  }, [selectedDate, selectedTimeSlot, duration]);

  // Generate dates for the next 7 days
  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getDates();
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Get day name
  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Is date selected
  const isDateSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };
  

  
  // Apply filters
  const applyFilters = () => {
    let results = [...rooms];

    if (filterCapacity > 0) {
      results = results.filter(room => room.capacity >= filterCapacity);
    }

    if (filterFloor !== 'All') {
      results = results.filter(room => room.floor === filterFloor);
    }

    if (filterAV) {
      results = results.filter(room => room.has_av);
    }

    setFilteredRooms(results);
    setModalVisible(false);

    // Re-check availability for filtered rooms
    if (selectedTimeSlot && selectedDate) {
      checkRoomAvailability();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterCapacity(0);
    setFilterFloor('All');
    setFilterAV(false);
    setFilteredRooms(rooms);
    setModalVisible(false);

    // Re-check availability for all rooms
    if (selectedTimeSlot && selectedDate) {
      checkRoomAvailability();
    }
  };
  
  // Validate booking inputs
  const validateBookingInputs = (): boolean => {
    // Check if user is authenticated
    if (!user?.id) {
      notifyBookingError('Please sign in to book a room');
      return false;
    }

    // Check if room is selected
    if (!selectedRoom) {
      notifyValidationError('Room Selection', 'Please select a room');
      return false;
    }

    // Check if time slot is selected
    if (!selectedTimeSlot) {
      notifyValidationError('Time Selection', 'Please select a time slot');
      return false;
    }

    // Check if purpose is provided
    if (!purpose.trim()) {
      notifyValidationError('Purpose', 'Please enter a purpose for booking');
      return false;
    }

    // Check purpose length
    if (purpose.trim().length < 3) {
      notifyValidationError('Purpose', 'Purpose must be at least 3 characters long');
      return false;
    }

    if (purpose.trim().length > 200) {
      notifyValidationError('Purpose', 'Purpose must be less than 200 characters');
      return false;
    }

    // Check if room is still available
    if (selectedRoom.isAvailable === false) {
      notifyBookingConflict(selectedRoom.name, formatTimeForDisplay(selectedTimeSlot));
      return false;
    }

    // Check if selected date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      notifyValidationError('Date', 'Cannot book rooms for past dates');
      return false;
    }

    // Check if selected time is not in the past for today's bookings
    if (bookingDate.getTime() === today.getTime()) {
      const now = new Date();
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      const bookingTime = new Date();
      bookingTime.setHours(hours, minutes, 0, 0);

      if (bookingTime <= now) {
        notifyValidationError('Time', 'Cannot book rooms for past time slots');
        return false;
      }
    }

    // Check if end time doesn't exceed business hours
    const endTime = calculateEndTime(selectedTimeSlot, duration);
    const [endHours] = endTime.split(':').map(Number);
    if (endHours > 18) { // Assuming business hours end at 6 PM
      notifyValidationError('Duration', 'Booking cannot extend beyond 6:00 PM');
      return false;
    }

    return true;
  };

  // Book room
  const bookRoom = async () => {
    // Validate all inputs first
    if (!validateBookingInputs()) {
      return;
    }

    try {
      setBookingLoading(true);

      const dateStr = selectedDate.toISOString().split('T')[0];
      const endTime = calculateEndTime(selectedTimeSlot, duration);

      // Double-check availability before booking
      const isStillAvailable = await roomAPI.checkRoomAvailability(
        selectedRoom.id,
        dateStr,
        selectedTimeSlot,
        endTime
      );

      if (!isStillAvailable) {
        notifyBookingConflict(selectedRoom.name, formatTimeForDisplay(selectedTimeSlot));
        return;
      }

      const booking: Omit<RoomBooking, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        room_id: selectedRoom.id,
        booking_date: dateStr,
        start_time: selectedTimeSlot,
        end_time: endTime,
        duration_hours: duration,
        purpose: purpose.trim(),
        status: 'confirmed'
      };

      const createdBooking = await roomAPI.createBooking(booking);

      // Send confirmation notification
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = formatTimeForDisplay(selectedTimeSlot);
      const endTimeFormatted = formatTimeForDisplay(endTime);

      await sendRoomBookingConfirmation(selectedRoom.name, formattedDate, formattedTime);

      // Schedule reminder notification
      const bookingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      await scheduleRoomReminder(selectedRoom.name, bookingDateTime, createdBooking.id);

      // Show success notification with comprehensive details
      notifyBookingSuccess(
        selectedRoom.name,
        formattedDate,
        `${formattedTime} - ${endTimeFormatted} (${duration}h)`
      );

      navigation.goBack();

    } catch (error: any) {
      // Handle different types of errors
      if (error?.message?.includes('conflict') || error?.message?.includes('already booked')) {
        notifyBookingConflict(selectedRoom.name, formatTimeForDisplay(selectedTimeSlot));
      } else if (error?.message?.includes('network') || error?.message?.includes('connection')) {
        notifyNetworkError('book the room');
      } else {
        notifyBookingError('Failed to book room. Please try again.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle time slot selection with validation
  const handleTimeSlotSelectionWithValidation = (timeSlot: string) => {
    // Check if the time slot is in the past for today's date
    const today = new Date();
    const bookingDate = new Date(selectedDate);

    if (bookingDate.toDateString() === today.toDateString()) {
      const now = new Date();
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);

      if (slotTime <= now) {
        notifyValidationError('Time Selection', 'Cannot select past time slots for today');
        return;
      }
    }

    setSelectedTimeSlot(timeSlot);
  };

  // Reset form when date changes
  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    // Reset selections when date changes
    setSelectedRoom(null);
    setSelectedTimeSlot(null);
    setPurpose('');
  };

  // Handle room selection with availability check
  const handleRoomSelectionWithValidation = (room: RoomWithAvailability) => {
    if (room.isAvailable === false && selectedTimeSlot) {
      notifyBookingConflict(room.name, formatTimeForDisplay(selectedTimeSlot));
      return;
    }
    setSelectedRoom(room);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222B45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Room</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#4A80F0" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
            {dates.map((date, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.dateItem,
                  isDateSelected(date) && styles.selectedDateItem
                ]}
                onPress={() => handleDateSelection(date)}
              >
                <Text style={[
                  styles.dayName,
                  isDateSelected(date) && styles.selectedDateText
                ]}>
                  {getDayName(date)}
                </Text>
                <Text style={[
                  styles.dateNumber,
                  isDateSelected(date) && styles.selectedDateText
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Room Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Rooms</Text>
            {availabilityLoading && (
              <ActivityIndicator size="small" color="#4A80F0" />
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A80F0" />
              <Text style={styles.loadingText}>Loading rooms...</Text>
            </View>
          ) : filteredRooms.length === 0 ? (
            <View style={styles.noRoomsContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#8F9BB3" />
              <Text style={styles.noRoomsText}>No rooms match your filters</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredRooms}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.roomCard,
                    selectedRoom?.id === item.id && styles.selectedRoomCard,
                    item.isAvailable === false && styles.unavailableRoomCard
                  ]}
                  onPress={() => handleRoomSelectionWithValidation(item)}
                  disabled={item.isAvailable === false}
                >
                  <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                      <Text style={styles.roomName}>{item.name}</Text>
                      {selectedTimeSlot && (
                        <View style={[
                          styles.availabilityBadge,
                          item.isAvailable === false ? styles.unavailableBadge : styles.availableBadge
                        ]}>
                          <Text style={[
                            styles.availabilityText,
                            item.isAvailable === false ? styles.unavailableText : styles.availableText
                          ]}>
                            {item.isAvailable === false ? 'Unavailable' : 'Available'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.roomDetails}>{item.floor} Floor • Capacity: {item.capacity}</Text>
                    <View style={styles.amenitiesContainer}>
                      {item.has_av && (
                        <View style={styles.amenityTag}>
                          <Ionicons name="tv-outline" size={14} color="#4A80F0" />
                          <Text style={styles.amenityText}>AV</Text>
                        </View>
                      )}
                      {item.has_whiteboard && (
                        <View style={styles.amenityTag}>
                          <Ionicons name="document-text-outline" size={14} color="#4A80F0" />
                          <Text style={styles.amenityText}>Whiteboard</Text>
                        </View>
                      )}
                      {item.has_teleconference && (
                        <View style={styles.amenityTag}>
                          <Ionicons name="videocam-outline" size={14} color="#4A80F0" />
                          <Text style={styles.amenityText}>Video</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.roomSelection}>
                    {selectedRoom?.id === item.id ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4A80F0" />
                    ) : item.isAvailable === false ? (
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color="#8F9BB3" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
        
        {/* Time Slot Selection */}
        {selectedRoom && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollView}>
              {TIME_SLOTS.map((timeSlot, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.timeSlot,
                    selectedTimeSlot === timeSlot && styles.selectedTimeSlot
                  ]}
                  onPress={() => handleTimeSlotSelectionWithValidation(timeSlot)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedTimeSlot === timeSlot && styles.selectedTimeSlotText
                  ]}>
                    {formatTimeForDisplay(timeSlot)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Duration Selection */}
        {selectedTimeSlot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duration (hours)</Text>
            <View style={styles.durationContainer}>
              <TouchableOpacity 
                style={styles.durationControl}
                onPress={() => duration > 1 && setDuration(duration - 1)}
                disabled={duration <= 1}
              >
                <Ionicons name="remove" size={24} color={duration <= 1 ? "#D7D9E0" : "#4A80F0"} />
              </TouchableOpacity>
              <Text style={styles.durationText}>{duration}</Text>
              <TouchableOpacity 
                style={styles.durationControl}
                onPress={() => duration < 4 && setDuration(duration + 1)}
                disabled={duration >= 4}
              >
                <Ionicons name="add" size={24} color={duration >= 4 ? "#D7D9E0" : "#4A80F0"} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Booking Purpose */}
        {selectedTimeSlot && (
          <View style={styles.section}>
            <View style={styles.purposeHeader}>
              <Text style={styles.sectionTitle}>Purpose</Text>
              <Text style={[
                styles.characterCounter,
                purpose.length > 200 && styles.characterCounterError
              ]}>
                {purpose.length}/200
              </Text>
            </View>
            <TextInput
              style={[
                styles.purposeInput,
                purpose.length > 200 && styles.purposeInputError
              ]}
              placeholder="e.g., Team Meeting, Client Call, etc."
              value={purpose}
              onChangeText={setPurpose}
              multiline
              maxLength={250} // Allow slight overflow for better UX
            />
            {purpose.length > 200 && (
              <Text style={styles.validationError}>
                Purpose must be less than 200 characters
              </Text>
            )}
            {purpose.length > 0 && purpose.length < 3 && (
              <Text style={styles.validationError}>
                Purpose must be at least 3 characters long
              </Text>
            )}
          </View>
        )}
        
        {/* Book Button */}
        {selectedRoom && selectedTimeSlot && (
          <TouchableOpacity
            style={[
              styles.bookButton,
              (bookingLoading || selectedRoom.isAvailable === false) && styles.disabledButton
            ]}
            onPress={bookRoom}
            disabled={bookingLoading || selectedRoom.isAvailable === false}
          >
            {bookingLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.bookButtonText}>
                {selectedRoom.isAvailable === false ? 'Room Unavailable' : 'Book Room'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Filter Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Rooms</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#222B45" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Capacity</Text>
              <TextInput
                style={styles.filterInput}
                keyboardType="numeric"
                placeholder="Enter minimum capacity"
                value={filterCapacity.toString() === '0' ? '' : filterCapacity.toString()}
                onChangeText={(text) => {
                  const number = parseInt(text) || 0;
                  setFilterCapacity(number);
                }}
              />
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Floor</Text>
              <View style={styles.filterOptions}>
                {['All', '1st', '2nd', '3rd', '4th'].map((floor) => (
                  <TouchableOpacity
                    key={floor}
                    style={[
                      styles.filterOption,
                      filterFloor === floor && styles.selectedFilterOption
                    ]}
                    onPress={() => setFilterFloor(floor)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterFloor === floor && styles.selectedFilterOptionText
                      ]}
                    >
                      {floor}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Amenities</Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFilterAV(!filterAV)}
              >
                <View style={[styles.checkbox, filterAV && styles.checkedCheckbox]}>
                  {filterAV && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Requires AV Equipment</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetFilterButton} onPress={resetFilters}>
                <Text style={styles.resetFilterButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterButton} onPress={applyFilters}>
                <Text style={styles.applyFilterButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8F9BB3',
  },
  dateScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateItem: {
    width: 60,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedDateItem: {
    backgroundColor: '#4A80F0',
  },
  dayName: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
  },
  selectedDateText: {
    color: 'white',
  },
  roomCard: {
    flexDirection: 'row',
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
  selectedRoomCard: {
    borderColor: '#4A80F0',
    borderWidth: 2,
  },
  unavailableRoomCard: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  roomInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    flex: 1,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  availableBadge: {
    backgroundColor: '#E8F5E8',
  },
  unavailableBadge: {
    backgroundColor: '#FFE8E8',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: '#34C759',
  },
  unavailableText: {
    color: '#FF3B30',
  },
  roomDetails: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 8,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 12,
    color: '#4A80F0',
    marginLeft: 4,
  },
  roomSelection: {
    justifyContent: 'center',
  },
  timeScrollView: {
    flexDirection: 'row',
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTimeSlot: {
    backgroundColor: '#4A80F0',
  },
  timeSlotText: {
    color: '#222B45',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: 'white',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationControl: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 20,
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
    marginHorizontal: 24,
  },
  purposeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  characterCounter: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  characterCounterError: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  purposeInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  purposeInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  validationError: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#8F9BB3',
    opacity: 0.6,
  },
  noRoomsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noRoomsText: {
    fontSize: 16,
    color: '#8F9BB3',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    minHeight: '60%',
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
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedFilterOption: {
    backgroundColor: '#4A80F0',
  },
  filterOptionText: {
    color: '#222B45',
  },
  selectedFilterOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8F9BB3',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#222B45',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
  },
  resetFilterButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    marginRight: 12,
  },
  resetFilterButtonText: {
    color: '#8F9BB3',
    fontSize: 16,
    fontWeight: '600',
  },
  applyFilterButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4A80F0',
    alignItems: 'center',
  },
  applyFilterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noRoomsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noRoomsText: {
    fontSize: 16,
    color: '#8F9BB3',
    marginVertical: 16,
  },
  resetButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});