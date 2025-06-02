# 🗄️ Database Integration Implementation Guide

## 📋 **Overview**

This guide provides step-by-step instructions for replacing mock data with real database integration in the Smart Office Assistant application.

---

## 🎯 **Priority Order for Implementation**

1. **🔴 Critical:** ParkingScreen.tsx - Most complex mock data
2. **🔴 Critical:** AttendanceScreen.tsx - Core functionality
3. **🔴 Critical:** AuthContext.tsx - Security critical
4. **🟡 Medium:** AdminDashboardScreen.tsx - Analytics features

---

## 📱 **COMPONENT 1: ParkingScreen.tsx**

### **Current State Analysis**
**File:** `screens/ParkingScreen.tsx`  
**Mock Data Location:** Lines 18-41  
**Mock Logic Location:** Lines 55-69  

### **Step 1: Remove Mock Data**
```typescript
// REMOVE these lines (18-41):
const PARKING_DATA = {
  car: {
    total: 50,
    available: 12,
    spots: Array(50).fill(null).map((_, i) => ({
      id: `car-${i + 1}`,
      number: i + 1,
      type: 'car',
      isOccupied: Math.random() > 0.25,
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
      isOccupied: Math.random() > 0.7,
      occupiedBy: null
    }))
  }
};
```

### **Step 2: Add Database Integration**
```typescript
import { parkingAPI, type ParkingSpot, type ParkingReservation } from '../lib/supabase-api';
import { AuthContext } from '../AuthContext';

// Add these state variables:
const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [userReservation, setUserReservation] = useState<ParkingReservation | null>(null);
const [refreshing, setRefreshing] = useState(false);

// Add context
const { user } = useContext(AuthContext);
```

### **Step 3: Implement Data Fetching**
```typescript
const fetchParkingData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Fetch all parking spots
    const spots = await parkingAPI.getAllSpots();
    setParkingSpots(spots);
    
    // Fetch user's current reservation
    if (user) {
      const reservation = await parkingAPI.getUserReservation(user.id);
      setUserReservation(reservation);
    }
  } catch (err) {
    console.error('Failed to fetch parking data:', err);
    setError(err.message || 'Failed to load parking data');
  } finally {
    setLoading(false);
  }
};

const refreshParkingData = async () => {
  setRefreshing(true);
  await fetchParkingData();
  setRefreshing(false);
};

useEffect(() => {
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
}, [user]);
```

### **Step 4: Update Spot Selection Logic**
```typescript
// REPLACE the mock user assignment logic (lines 55-69) with:
const handleSpotSelection = async (spot: ParkingSpot) => {
  if (!user) {
    toast.error('Please log in to reserve a parking spot');
    return;
  }
  
  if (spot.isOccupied) {
    toast.error('This spot is already occupied');
    return;
  }
  
  try {
    await parkingAPI.createReservation({
      user_id: user.id,
      parking_spot_id: spot.id,
      reservation_date: new Date().toISOString().split('T')[0]
    });
    
    toast.success(`Spot ${spot.spot_number} reserved successfully!`);
    await fetchParkingData(); // Refresh data
  } catch (error) {
    toast.error('Failed to reserve parking spot');
    console.error('Reservation error:', error);
  }
};
```

### **Step 5: Update Render Logic**
```typescript
// Add loading and error states to render:
if (loading) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading parking data...</Text>
      </View>
    </SafeAreaView>
  );
}

if (error) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchParkingData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Update the parking data usage:
const carSpots = parkingSpots.filter(spot => spot.spot_type === 'car');
const bikeSpots = parkingSpots.filter(spot => spot.spot_type === 'bike');
const availableCarSpots = carSpots.filter(spot => !spot.isOccupied).length;
const availableBikeSpots = bikeSpots.filter(spot => !spot.isOccupied).length;
```

---

## 📊 **COMPONENT 2: AttendanceScreen.tsx**

### **Current State Analysis**
**File:** `screens/AttendanceScreen.tsx`  
**Mock Data Location:** Lines 20-62  
**State Initialization:** Line 69  

### **Step 1: Remove Mock Data**
```typescript
// REMOVE these lines (20-62):
const ATTENDANCE_HISTORY = [
  {
    id: '1',
    date: '2023-05-29',
    status: 'office',
    checkInTime: '09:15 AM',
    checkOutTime: '05:45 PM',
    transportMode: 'car'
  },
  // ... rest of mock data
];
```

### **Step 2: Add Database Integration**
```typescript
import { attendanceAPI, type AttendanceRecord } from '../lib/supabase-api';
import { AuthContext } from '../AuthContext';

// Add these state variables:
const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const { user } = useContext(AuthContext);
```

### **Step 3: Implement Data Fetching**
```typescript
const fetchAttendanceData = async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    setError(null);
    
    // Fetch user's attendance history
    const history = await attendanceAPI.getUserAttendance(user.id);
    setAttendanceHistory(history);
    
    // Fetch today's attendance record
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await attendanceAPI.getTodayAttendance(user.id, today);
    setTodayRecord(todayAttendance);
    
    // Update component state based on today's record
    if (todayAttendance) {
      setTodayStatus(todayAttendance.status);
      setIsCheckedIn(!!todayAttendance.check_in_time);
      setCheckInTime(todayAttendance.check_in_time);
      setCheckOutTime(todayAttendance.check_out_time);
      setTransportMode(todayAttendance.transport_mode || 'car');
    }
  } catch (err) {
    console.error('Failed to fetch attendance data:', err);
    setError(err.message || 'Failed to load attendance data');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchAttendanceData();
}, [user]);
```

### **Step 4: Implement Check-in/Check-out Logic**
```typescript
const handleCheckIn = async () => {
  if (!user) return;
  
  try {
    const location = await getCurrentLocation();
    const checkInData = {
      user_id: user.id,
      attendance_date: new Date().toISOString().split('T')[0],
      status: todayStatus,
      check_in_time: new Date().toTimeString().split(' ')[0],
      transport_mode: transportMode,
      location_lat: location?.coords.latitude,
      location_lng: location?.coords.longitude
    };
    
    await attendanceAPI.checkIn(checkInData);
    toast.success('Checked in successfully!');
    await fetchAttendanceData(); // Refresh data
  } catch (error) {
    toast.error('Failed to check in');
    console.error('Check-in error:', error);
  }
};

const handleCheckOut = async () => {
  if (!user || !todayRecord) return;
  
  try {
    await attendanceAPI.checkOut(todayRecord.id);
    toast.success('Checked out successfully!');
    await fetchAttendanceData(); // Refresh data
  } catch (error) {
    toast.error('Failed to check out');
    console.error('Check-out error:', error);
  }
};
```

---

## 👤 **COMPONENT 3: AuthContext.tsx**

### **Current State Analysis**
**File:** `AuthContext.tsx`  
**Mock Users Location:** Lines 905-932  
**Mock Logic Location:** Lines 1083-1094  

### **Step 1: Remove Mock Users**
```typescript
// REMOVE these lines (905-932):
const MOCK_USERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user1@example.com',
    password: 'user123',
    role: 'user',
    employeeDetails: {
      fullName: 'Alex Johnson',
      employeeId: 'EMP-2025-001',
      dateOfJoining: '2025-01-15',
      workHours: '9:00 AM - 5:00 PM',
      workMode: 'hybrid',
    },
  },
  // ... rest of mock users
];
```

### **Step 2: Remove Mock Authentication Logic**
```typescript
// REMOVE these lines (1083-1094):
if (mockUser) {
  // If this is a mock user, simulate a successful sign in
  const isOnboarded = await storage.getItem(`onboarded-${mockUser.id}`);
  
  const userData = {
    id: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    employeeDetails: mockUser.employeeDetails,
    preferences: DEFAULT_PREFERENCES,
    isFirstTimeUser: isOnboarded !== 'true',
  };
  
  setUser(userData);
  setIsAuthenticated(true);
  return { success: true };
}
```

### **Step 3: Ensure Database-Only Authentication**
```typescript
// The signIn function should only contain:
const signIn = async (email: string, password: string) => {
  try {
    setLoading(true);
    setError(null);

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user data returned');

    // Fetch user data from database
    const userData = await userAPI.getCurrentUser();
    if (!userData) throw new Error('User not found in database');

    setUser(userData);
    setIsAuthenticated(true);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error.message || 'Sign in failed';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};
```
