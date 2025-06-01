import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { useNotifications } from '../contexts/NotificationContext';

// Sample attendance data
const ATTENDANCE_HISTORY = [
  {
    id: '1',
    date: '2023-05-29',
    status: 'office',
    checkInTime: '09:15 AM',
    checkOutTime: '05:45 PM',
    transportMode: 'car'
  },
  {
    id: '2',
    date: '2023-05-28',
    status: 'wfh',
    checkInTime: '09:05 AM',
    checkOutTime: '06:10 PM',
    transportMode: null
  },
  {
    id: '3',
    date: '2023-05-27',
    status: 'leave',
    checkInTime: null,
    checkOutTime: null,
    transportMode: null,
    leaveReason: 'Personal emergency'
  },
  {
    id: '4',
    date: '2023-05-26',
    status: 'office',
    checkInTime: '09:30 AM',
    checkOutTime: '05:30 PM',
    transportMode: 'public'
  },
  {
    id: '5',
    date: '2023-05-25',
    status: 'wfh',
    checkInTime: '09:10 AM',
    checkOutTime: '06:45 PM',
    transportMode: null
  }
];

export default function AttendanceScreen() {
  const navigation = useNavigation();
  const { sendAttendanceReminder } = useNotifications();

  // State
  const [attendanceHistory, setAttendanceHistory] = useState(ATTENDANCE_HISTORY);
  const [todayStatus, setTodayStatus] = useState('office'); // 'office', 'wfh', 'leave'
  const [transportMode, setTransportMode] = useState('car'); // 'car', 'public', 'bike', 'walk'
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle status selection
  const handleStatusSelection = (status) => {
    // Prevent changing status if already checked in
    if (isCheckedIn) {
      toast.error('You are already checked in. Please check out first.');
      return;
    }
    
    setTodayStatus(status);
    
    if (status === 'office') {
      setShowTransportModal(true);
    } else if (status === 'leave') {
      setShowLeaveModal(true);
    }
  };
  
  // Handle check in
  const handleCheckIn = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (todayStatus === 'leave') {
      if (!leaveReason.trim()) {
        toast.error('Please provide a reason for leave');
        return;
      }
      
      // Record leave
      const newAttendance = {
        id: `${now.getTime()}`,
        date: now.toISOString().split('T')[0],
        status: 'leave',
        checkInTime: null,
        checkOutTime: null,
        transportMode: null,
        leaveReason
      };
      
      setAttendanceHistory([newAttendance, ...attendanceHistory]);
      toast.success('Leave recorded successfully!');
      return;
    }
    
    if (todayStatus === 'office' && !transportMode) {
      toast.error('Please select a mode of transport');
      return;
    }
    
    setCheckInTime(formattedTime);
    setIsCheckedIn(true);
    
    toast.success(`Checked in at ${formattedTime}`);
  };
  
  // Handle check out
  const handleCheckOut = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setCheckOutTime(formattedTime);
    setIsCheckedIn(false);
    
    // Record attendance
    const newAttendance = {
      id: `${now.getTime()}`,
      date: now.toISOString().split('T')[0],
      status: todayStatus,
      checkInTime,
      checkOutTime: formattedTime,
      transportMode: todayStatus === 'office' ? transportMode : null
    };
    
    setAttendanceHistory([newAttendance, ...attendanceHistory]);
    toast.success(`Checked out at ${formattedTime}`);
    
    // Reset for next day
    setCheckInTime(null);
    setCheckOutTime(null);
  };
  
  // Get attendance status icon
  const getAttendanceStatusIcon = (status) => {
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
  const getTransportModeIcon = (mode) => {
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
  const renderAttendanceItem = ({ item }) => (
    <View style={styles.attendanceItem}>
      <View style={styles.attendanceDate}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
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
            
            {item.status === 'office' && (
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
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#222B45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} /> {/* Empty view for alignment */}
      </View>
      
      <ScrollView style={styles.content}>
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
                todayStatus === 'wfh' && styles.selectedStatusOption
              ]}
              onPress={() => handleStatusSelection('wfh')}
              disabled={isCheckedIn}
            >
              <Ionicons 
                name="home" 
                size={28} 
                color={todayStatus === 'wfh' ? "white" : "#34C759"} 
              />
              <Text style={[
                styles.statusText,
                todayStatus === 'wfh' && styles.selectedStatusText
              ]}>
                Work from Home
              </Text>
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
          
          {/* Check In/Out Button */}
          <TouchableOpacity 
            style={[
              styles.checkButton,
              isCheckedIn ? styles.checkOutButton : styles.checkInButton
            ]}
            onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          >
            <Text style={styles.checkButtonText}>
              {isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
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
  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
});