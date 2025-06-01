import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../App';
import { AuthContext } from '../AuthContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type AttendanceStatus = 'office' | 'wfh' | 'leave' | null;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const { user } = useContext(AuthContext);

  // If no user is logged in, show a fallback
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Please sign in to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get user name from employee details or fallback to email
  const userName = user.employeeDetails?.fullName || user.email.split('@')[0];
  const isAdmin = user.role === 'admin';

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null);

  const handleStatusSelection = (status: AttendanceStatus) => {
    setAttendanceStatus(status);
    // Navigate to attendance screen
    navigation.navigate('Attendance');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{userName}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.chatbotButton}
              onPress={() => {
                navigation.navigate('Chatbot');
              }}
            >
              <Ionicons name="mic" size={24} color="#4A80F0" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => {
                navigation.navigate('Profile');
              }}
            >
              <Ionicons name="person-circle" size={40} color="#4A80F0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <View style={styles.attendanceButtonsContainer}>
            <TouchableOpacity 
              style={[
                styles.attendanceButton, 
                attendanceStatus === 'office' && styles.selectedButton
              ]}
              onPress={() => handleStatusSelection('office')}
            >
              <Ionicons name="business" size={24} color={attendanceStatus === 'office' ? "#FFFFFF" : "#4A80F0"} />
              <Text style={[
                styles.buttonText,
                attendanceStatus === 'office' && styles.selectedButtonText
              ]}>In Office</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.attendanceButton, 
                attendanceStatus === 'wfh' && styles.selectedButton
              ]}
              onPress={() => handleStatusSelection('wfh')}
            >
              <Ionicons name="home" size={24} color={attendanceStatus === 'wfh' ? "#FFFFFF" : "#4A80F0"} />
              <Text style={[
                styles.buttonText,
                attendanceStatus === 'wfh' && styles.selectedButtonText
              ]}>WFH</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.attendanceButton, 
                attendanceStatus === 'leave' && styles.selectedButton
              ]}
              onPress={() => handleStatusSelection('leave')}
            >
              <Ionicons name="calendar" size={24} color={attendanceStatus === 'leave' ? "#FFFFFF" : "#4A80F0"} />
              <Text style={[
                styles.buttonText,
                attendanceStatus === 'leave' && styles.selectedButtonText
              ]}>On Leave</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => {
                navigation.navigate('BookRoom');
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#4A80F0' }]}>
                <Ionicons name="calendar" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessText}>Book Room</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => {
                navigation.navigate('Parking');
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="car" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessText}>Parking</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => {
                navigation.navigate('Attendance');
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#34C759' }]}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessText}>Attendance</Text>
            </TouchableOpacity>
            
            {isAdmin && (
              <TouchableOpacity
                style={styles.quickAccessItem}
                onPress={() => {
                  navigation.navigate('AdminDashboard');
                }}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#AF52DE' }]}>
                  <Ionicons name="analytics" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickAccessText}>Admin</Text>
              </TouchableOpacity>
            )}
            
            {/* Voice Assistant Quick Access Button */}
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => {
                navigation.navigate('Chatbot');
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessText}>Voice Assistant</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Meetings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Meetings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BookRoom')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.meetingCard}>
            <View style={styles.meetingTimeContainer}>
              <Text style={styles.meetingTime}>10:00 AM</Text>
              <Text style={styles.meetingDuration}>60 min</Text>
            </View>
            <View style={styles.meetingDivider} />
            <View style={styles.meetingDetailsContainer}>
              <Text style={styles.meetingTitle}>Product Sync</Text>
              <Text style={styles.meetingRoom}>Room: Falcon (3rd Floor)</Text>
              <View style={styles.participantsRow}>
                <Ionicons name="people" size={16} color="#4A80F0" />
                <Text style={styles.meetingParticipants}>5 participants</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.meetingCard}>
            <View style={styles.meetingTimeContainer}>
              <Text style={styles.meetingTime}>2:30 PM</Text>
              <Text style={styles.meetingDuration}>30 min</Text>
            </View>
            <View style={styles.meetingDivider} />
            <View style={styles.meetingDetailsContainer}>
              <Text style={styles.meetingTitle}>Sprint Planning</Text>
              <Text style={styles.meetingRoom}>Room: Eagle (2nd Floor)</Text>
              <View style={styles.participantsRow}>
                <Ionicons name="people" size={16} color="#4A80F0" />
                <Text style={styles.meetingParticipants}>8 participants</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Parking Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parking Availability</Text>
          <View style={styles.parkingContainer}>
            <View style={styles.parkingTypeContainer}>
              <View style={styles.parkingStatusContainer}>
                <View style={styles.parkingDot} />
                <Text style={styles.parkingTypeText}>Car Slots</Text>
              </View>
              <Text style={styles.parkingCountText}>12/50 available</Text>
            </View>
            <View style={styles.parkingProgress}>
              <View style={[styles.parkingProgressFill, { width: '76%' }]} />
            </View>
            
            <View style={[styles.parkingTypeContainer, { marginTop: 16 }]}>
              <View style={styles.parkingStatusContainer}>
                <View style={[styles.parkingDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.parkingTypeText}>Bike Slots</Text>
              </View>
              <Text style={styles.parkingCountText}>28/40 available</Text>
            </View>
            <View style={styles.parkingProgress}>
              <View style={[styles.parkingProgressFill, { width: '30%', backgroundColor: '#34C759' }]} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.viewParkingButton}
            onPress={() => navigation.navigate('Parking')}
          >
            <Text style={styles.viewParkingButtonText}>View Parking Map</Text>
          </TouchableOpacity>
        </View>
        
        {/* Voice Assistant Floating Button */}
        <View style={styles.floatingAssistantContainer}>
          <TouchableOpacity 
            style={styles.floatingAssistantButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Ionicons name="mic" size={24} color="#FFFFFF" />
            <Text style={styles.floatingButtonText}>Voice Assistant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatbotButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#E6EFFE',
    borderRadius: 20,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  profileButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#4A80F0',
    fontSize: 14,
  },
  attendanceButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendanceButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: '#4A80F0',
  },
  buttonText: {
    marginTop: 8,
    fontWeight: '600',
    color: '#4A80F0',
  },
  selectedButtonText: {
    color: 'white',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAccessItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222B45',
  },
  meetingCard: {
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
  meetingTimeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  meetingTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222B45',
  },
  meetingDuration: {
    fontSize: 12,
    color: '#8F9BB3',
    marginTop: 4,
  },
  meetingDivider: {
    width: 1,
    backgroundColor: '#EDF1F7',
    marginHorizontal: 16,
  },
  meetingDetailsContainer: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222B45',
    marginBottom: 4,
  },
  meetingRoom: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingParticipants: {
    fontSize: 13,
    color: '#8F9BB3',
    marginLeft: 6,
  },
  parkingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  parkingTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parkingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parkingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9500',
    marginRight: 8,
  },
  parkingTypeText: {
    fontSize: 14,
    color: '#222B45',
  },
  parkingCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222B45',
  },
  parkingProgress: {
    height: 6,
    backgroundColor: '#EDF1F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  parkingProgressFill: {
    height: '100%',
    backgroundColor: '#FF9500',
  },
  viewParkingButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewParkingButtonText: {
    color: '#4A80F0',
    fontWeight: '600',
    fontSize: 16,
  },
  floatingAssistantContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingBottom: 20,
  },
  floatingAssistantButton: {
    flexDirection: 'row',
    backgroundColor: '#4A80F0',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});