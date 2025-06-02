// Smart Office Assistant - Supabase API Helper Functions
// This file provides typed API functions for interacting with the database

import { supabase } from '../supabase';

// Types based on database schema
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  is_first_time_user: boolean;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface EmployeeDetails {
  id: string;
  user_id: string;
  full_name: string;
  employee_id: string;
  date_of_joining: string;
  work_hours: string;
  work_mode: 'in-office' | 'wfh' | 'hybrid';
  department?: string;
  position?: string;
  phone_number?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  vehicle_type?: 'Car' | 'Bike' | 'Public Transport' | 'Walk' | 'None';
  vehicle_registration?: string;
  checkin_reminder: boolean;
  checkin_reminder_time: number;
  occupancy_reminder: boolean;
  occupancy_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  has_av: boolean;
  has_whiteboard: boolean;
  has_teleconference: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomBooking {
  id: string;
  user_id: string;
  room_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  purpose: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ParkingSpot {
  id: string;
  spot_number: number;
  spot_type: 'car' | 'bike';
  floor: string;
  section: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParkingReservation {
  id: string;
  user_id: string;
  parking_spot_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  status: 'office' | 'wfh' | 'leave';
  check_in_time?: string;
  check_out_time?: string;
  transport_mode?: 'car' | 'bike' | 'public' | 'walk';
  leave_reason?: string;
  location_lat?: number;
  location_lng?: number;
  office_location_id?: string;
  primary_verification_method?: 'gps' | 'wifi' | 'qr_code' | 'manual';
  verification_confidence?: number;
  wfh_approval_id?: string;
  check_in_method_count?: number;
  is_verified?: boolean;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  timezone: string;
  is_active: boolean;
  office_hours: any;
  created_at: string;
  updated_at: string;
}

export interface OfficeWiFiNetwork {
  id: string;
  office_location_id: string;
  ssid: string;
  description?: string;
  is_active: boolean;
  security_level: 'open' | 'secure' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface OfficeQRCode {
  id: string;
  office_location_id: string;
  code_value: string;
  location_description: string;
  generated_by?: string;
  is_active: boolean;
  expires_at?: string;
  scan_count: number;
  last_scanned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WFHApproval {
  id: string;
  employee_id: string;
  manager_id?: string;
  request_date: string;
  requested_for_date: string;
  reason: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  status: 'pending' | 'approved' | 'denied' | 'expired';
  manager_comments?: string;
  approved_at?: string;
  expires_at?: string;
  is_recurring: boolean;
  recurrence_pattern?: any;
  created_at: string;
  updated_at: string;
}

export interface AttendanceVerificationMethod {
  id: string;
  attendance_record_id: string;
  verification_type: 'gps' | 'wifi' | 'qr_code' | 'manual';
  verification_data: any;
  verification_success: boolean;
  verification_timestamp: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message_text: string;
  is_bot_message: boolean;
  intent?: string;
  response_data?: any;
  created_at: string;
}

// API Functions

// User Management
export const userAPI = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertUser(userData: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getEmployeeDetails(userId: string): Promise<EmployeeDetails | null> {
    const { data, error } = await supabase
      .from('employee_details')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getEmployeeDetailsWithWFHEligibility(userId: string): Promise<(EmployeeDetails & { wfh_eligibility?: boolean }) | null> {
    const { data, error } = await supabase
      .from('employee_details')
      .select('*, wfh_eligibility')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertEmployeeDetails(details: Partial<EmployeeDetails>): Promise<EmployeeDetails> {
    const { data, error } = await supabase
      .from('employee_details')
      .upsert(details)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async softDeleteUser(id: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Add missing function for parking reservations
  async getUserParkingReservations(userId: string, limit = 10): Promise<ParkingReservation[]> {
    const { data, error } = await supabase
      .from('parking_reservations')
      .select(`
        *,
        parking_spots:parking_spot_id (spot_number, spot_type, section, floor)
      `)
      .eq('user_id', userId)
      .order('reservation_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

// Room Management
export const roomAPI = {
  async getAllRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  },

  async getRoomById(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createBooking(booking: Omit<RoomBooking, 'id' | 'created_at' | 'updated_at'>): Promise<RoomBooking> {
    const { data, error } = await supabase
      .from('room_bookings')
      .insert(booking)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserBookings(userId: string, limit = 10): Promise<RoomBooking[]> {
    const { data, error } = await supabase
      .from('room_bookings')
      .select(`
        *,
        rooms:room_id (name, floor, capacity)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async cancelBooking(bookingId: string): Promise<RoomBooking> {
    const { data, error } = await supabase
      .from('room_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkRoomAvailability(roomId: string, date: string, startTime: string, endTime: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('room_bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .eq('status', 'confirmed')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

    if (error) throw error;
    return data.length === 0;
  }
};

// Parking Management
export const parkingAPI = {
  async getAllParkingSpots(): Promise<ParkingSpot[]> {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .eq('is_active', true)
      .order('spot_type')
      .order('spot_number');

    if (error) throw error;
    return data;
  },

  async createReservation(reservation: Omit<ParkingReservation, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingReservation> {
    const { data, error } = await supabase
      .from('parking_reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserReservation(userId: string, date: string): Promise<ParkingReservation | null> {
    const { data, error } = await supabase
      .from('parking_reservations')
      .select(`
        *,
        parking_spots:parking_spot_id (spot_number, spot_type, section)
      `)
      .eq('user_id', userId)
      .eq('reservation_date', date)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async cancelReservation(reservationId: string): Promise<ParkingReservation> {
    const { data, error } = await supabase
      .from('parking_reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getParkingAvailability(date: string): Promise<any> {
    const { data, error } = await supabase
      .from('parking_availability')
      .select('*');

    if (error) throw error;
    return data;
  },

  async getAllSpotsWithReservations(date: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('parking_spots')
      .select(`
        *,
        parking_reservations!left (
          id,
          user_id,
          status,
          users (
            employee_details (full_name)
          )
        )
      `)
      .eq('is_active', true)
      .eq('parking_reservations.reservation_date', date)
      .eq('parking_reservations.status', 'active')
      .order('spot_type')
      .order('spot_number');

    if (error) throw error;
    return data;
  },

  async getUserCurrentReservation(userId: string): Promise<ParkingReservation | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('parking_reservations')
      .select(`
        *,
        parking_spots (*)
      `)
      .eq('user_id', userId)
      .eq('reservation_date', today)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// Attendance Management
export const attendanceAPI = {
  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserAttendanceHistory(userId: string, limit = 30): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('attendance_date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async checkIn(attendanceData: {
    user_id: string;
    attendance_date: string;
    status: 'office' | 'wfh' | 'leave';
    check_in_time: string;
    transport_mode?: string;
    location_lat?: number;
    location_lng?: number;
    leave_reason?: string;
    office_location_id?: string;
  }): Promise<AttendanceRecord> {
    // Server-side validation for WFH check-ins
    if (attendanceData.status === 'wfh') {
      const eligibility = await wfhAPI.checkWFHEligibility(
        attendanceData.user_id,
        attendanceData.attendance_date
      );

      if (!eligibility.eligible) {
        throw new Error(`WFH check-in denied: ${eligibility.reason}`);
      }
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkOut(attendanceId: string): Promise<AttendanceRecord> {
    const checkOutTime = new Date().toTimeString().split(' ')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .update({ check_out_time: checkOutTime })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkInWithVerification(attendanceData: {
    user_id: string;
    attendance_date: string;
    status: 'office' | 'wfh' | 'leave';
    check_in_time: string;
    transport_mode?: string;
    location_lat?: number;
    location_lng?: number;
    office_location_id?: string;
    primary_verification_method: 'gps' | 'wifi' | 'qr_code' | 'manual';
    verification_confidence?: number;
    wfh_approval_id?: string;
    verification_notes?: string;
  }, verificationMethods: {
    verification_type: 'gps' | 'wifi' | 'qr_code' | 'manual';
    verification_data: any;
    verification_success: boolean;
  }[]): Promise<AttendanceRecord> {
    // Start transaction
    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from('attendance_records')
      .insert({
        ...attendanceData,
        check_in_method_count: verificationMethods.length,
        is_verified: verificationMethods.every(v => v.verification_success)
      })
      .select()
      .single();

    if (attendanceError) throw attendanceError;

    // Insert verification methods
    const verificationRecords = verificationMethods.map(method => ({
      attendance_record_id: attendanceRecord.id,
      ...method
    }));

    const { error: verificationError } = await supabase
      .from('attendance_verification_methods')
      .insert(verificationRecords);

    if (verificationError) throw verificationError;

    return attendanceRecord;
  }
};

// Office Configuration API
export const officeAPI = {
  async getOfficeLocations(): Promise<OfficeLocation[]> {
    const { data, error } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  },

  async getOfficeWiFiNetworks(officeLocationId?: string): Promise<OfficeWiFiNetwork[]> {
    let query = supabase
      .from('office_wifi_networks')
      .select('*')
      .eq('is_active', true);

    if (officeLocationId) {
      query = query.eq('office_location_id', officeLocationId);
    }

    const { data, error } = await query.order('ssid');

    if (error) throw error;
    return data;
  },

  async getOfficeQRCodes(officeLocationId?: string): Promise<OfficeQRCode[]> {
    let query = supabase
      .from('office_qr_codes')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (officeLocationId) {
      query = query.eq('office_location_id', officeLocationId);
    }

    const { data, error } = await query.order('location_description');

    if (error) throw error;
    return data;
  },

  async validateQRCode(codeValue: string): Promise<OfficeQRCode | null> {
    const { data, error } = await supabase
      .from('office_qr_codes')
      .select('*')
      .eq('code_value', codeValue)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async isWiFiNetworkValid(ssid: string, officeLocationId?: string): Promise<boolean> {
    let query = supabase
      .from('office_wifi_networks')
      .select('id')
      .eq('ssid', ssid)
      .eq('is_active', true);

    if (officeLocationId) {
      query = query.eq('office_location_id', officeLocationId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async calculateDistanceFromOffice(
    userLat: number,
    userLng: number,
    officeLocationId: string
  ): Promise<{ distance: number; withinRadius: boolean }> {
    const { data: office, error } = await supabase
      .from('office_locations')
      .select('latitude, longitude, geofence_radius')
      .eq('id', officeLocationId)
      .single();

    if (error) throw error;

    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = userLat * Math.PI/180;
    const φ2 = office.latitude * Math.PI/180;
    const Δφ = (office.latitude - userLat) * Math.PI/180;
    const Δλ = (office.longitude - userLng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // Distance in meters

    return {
      distance,
      withinRadius: distance <= office.geofence_radius
    };
  }
};

// WFH Approval API
export const wfhAPI = {
  async createWFHRequest(requestData: {
    employee_id: string;
    manager_id?: string;
    requested_for_date: string;
    reason: string;
    urgency?: 'normal' | 'urgent' | 'emergency';
    is_recurring?: boolean;
    recurrence_pattern?: any;
  }): Promise<WFHApproval> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .insert({
        ...requestData,
        request_date: new Date().toISOString().split('T')[0],
        urgency: requestData.urgency || 'normal'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getWFHApprovalForDate(employeeId: string, date: string): Promise<WFHApproval | null> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('requested_for_date', date)
      .eq('status', 'approved')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUserWFHRequests(employeeId: string, limit = 30): Promise<WFHApproval[]> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getManagerPendingRequests(managerId: string): Promise<WFHApproval[]> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .select(`
        *,
        employee:users!wfh_approvals_employee_id_fkey(
          email,
          employee_details(full_name, employee_id)
        )
      `)
      .eq('manager_id', managerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async approveWFHRequest(
    approvalId: string,
    managerId: string,
    comments?: string
  ): Promise<WFHApproval> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        manager_comments: comments
      })
      .eq('id', approvalId)
      .eq('manager_id', managerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async denyWFHRequest(
    approvalId: string,
    managerId: string,
    comments: string
  ): Promise<WFHApproval> {
    const { data, error } = await supabase
      .from('wfh_approvals')
      .update({
        status: 'denied',
        manager_comments: comments
      })
      .eq('id', approvalId)
      .eq('manager_id', managerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkWFHEligibility(employeeId: string, date: string): Promise<{
    eligible: boolean;
    reason?: string;
    maxDaysPerMonth?: number;
    usedDaysThisMonth?: number;
    workMode?: string;
  }> {
    // Get employee WFH settings including work_mode
    const { data: employee, error: employeeError } = await supabase
      .from('employee_details')
      .select('wfh_eligibility, max_wfh_days_per_month, work_mode')
      .eq('user_id', employeeId)
      .single();

    if (employeeError) throw employeeError;

    // Check work_mode first - only 'hybrid' and 'wfh' users can work from home
    if (employee.work_mode === 'in-office') {
      return {
        eligible: false,
        reason: 'Your work mode is set to "In-Office Only". WFH is not available for your role.',
        workMode: employee.work_mode
      };
    }

    // Check WFH eligibility flag
    if (!employee.wfh_eligibility) {
      return {
        eligible: false,
        reason: 'Work from home is not enabled for your account. Please contact HR.',
        workMode: employee.work_mode
      };
    }

    // Check monthly usage
    const startOfMonth = new Date(date);
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);

    const { data: monthlyUsage, error: usageError } = await supabase
      .from('wfh_approvals')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .gte('requested_for_date', startOfMonth.toISOString().split('T')[0])
      .lte('requested_for_date', endOfMonth.toISOString().split('T')[0]);

    if (usageError) throw usageError;

    const usedDays = monthlyUsage.length;
    const maxDays = employee.max_wfh_days_per_month || 0;

    if (usedDays >= maxDays) {
      return {
        eligible: false,
        reason: `Monthly WFH limit reached (${usedDays}/${maxDays} days used). Contact your manager for additional approval.`,
        maxDaysPerMonth: maxDays,
        usedDaysThisMonth: usedDays,
        workMode: employee.work_mode
      };
    }

    return {
      eligible: true,
      maxDaysPerMonth: maxDays,
      usedDaysThisMonth: usedDays,
      workMode: employee.work_mode
    };
  }
};

// Analytics API for admin dashboard
export const analyticsAPI = {
  async getAttendanceStats(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('attendance_date, status')
      .gte('attendance_date', startDate.toISOString().split('T')[0])
      .lte('attendance_date', endDate.toISOString().split('T')[0]);

    if (error) throw error;
    return data;
  },

  async getParkingUsage(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('parking_reservations')
      .select(`
        reservation_date,
        parking_spots (spot_type)
      `)
      .gte('reservation_date', startDate.toISOString().split('T')[0])
      .lte('reservation_date', endDate.toISOString().split('T')[0])
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  async getRoomOccupancy(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('room_bookings')
      .select(`
        booking_date,
        rooms (name)
      `)
      .gte('booking_date', startDate.toISOString().split('T')[0])
      .lte('booking_date', endDate.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (error) throw error;
    return data;
  },

  async getTodayStats(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('attendance_date', today);

    if (attendanceError) throw attendanceError;

    // Get today's parking
    const { data: parking, error: parkingError } = await supabase
      .from('parking_reservations')
      .select('id')
      .eq('reservation_date', today)
      .eq('status', 'active');

    if (parkingError) throw parkingError;

    // Get today's room bookings
    const { data: rooms, error: roomsError } = await supabase
      .from('room_bookings')
      .select('id')
      .eq('booking_date', today)
      .eq('status', 'confirmed');

    if (roomsError) throw roomsError;

    // Get total users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) throw usersError;

    return {
      attendance: {
        total: attendance.length,
        office: attendance.filter(a => a.status === 'office').length,
        wfh: attendance.filter(a => a.status === 'wfh').length,
        leave: attendance.filter(a => a.status === 'leave').length,
        totalUsers: users.length
      },
      parking: {
        occupied: parking.length
      },
      rooms: {
        booked: rooms.length
      }
    };
  },

  async exportData(dataType: 'attendance' | 'bookings' | 'parking' | 'users', timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    switch (dataType) {
      case 'attendance':
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select(`
            attendance_date,
            status,
            check_in_time,
            check_out_time,
            transport_mode,
            users (
              employee_details (full_name, employee_id)
            )
          `)
          .gte('attendance_date', startDate.toISOString().split('T')[0])
          .lte('attendance_date', endDate.toISOString().split('T')[0]);

        if (attendanceError) throw attendanceError;
        return attendanceData;

      case 'bookings':
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('room_bookings')
          .select(`
            booking_date,
            start_time,
            end_time,
            purpose,
            status,
            rooms (name),
            users (
              employee_details (full_name, employee_id)
            )
          `)
          .gte('booking_date', startDate.toISOString().split('T')[0])
          .lte('booking_date', endDate.toISOString().split('T')[0]);

        if (bookingsError) throw bookingsError;
        return bookingsData;

      case 'parking':
        const { data: parkingData, error: parkingError } = await supabase
          .from('parking_reservations')
          .select(`
            reservation_date,
            start_time,
            end_time,
            status,
            parking_spots (spot_number, spot_type),
            users (
              employee_details (full_name, employee_id)
            )
          `)
          .gte('reservation_date', startDate.toISOString().split('T')[0])
          .lte('reservation_date', endDate.toISOString().split('T')[0]);

        if (parkingError) throw parkingError;
        return parkingData;

      case 'users':
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            email,
            role,
            created_at,
            employee_details (
              full_name,
              employee_id,
              work_mode,
              date_of_joining
            )
          `);

        if (usersError) throw usersError;
        return usersData;

      default:
        throw new Error('Invalid data type');
    }
  },

  // AI-Driven Analytics Functions
  async getAttendancePredictions(userId?: string): Promise<any> {
    // Get historical attendance data for pattern analysis
    const { data: historicalData, error } = await supabase
      .from('attendance_records')
      .select(`
        attendance_date,
        status,
        user_id,
        users (
          employee_details (work_mode)
        )
      `)
      .gte('attendance_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('attendance_date', { ascending: false });

    if (error) throw error;

    // Simple ML-like analysis for attendance patterns
    const predictions = this.analyzeAttendancePatterns(historicalData, userId);
    return predictions;
  },

  analyzeAttendancePatterns(data: any[], userId?: string): any {
    const filteredData = userId ? data.filter(d => d.user_id === userId) : data;

    // Group by day of week
    const dayPatterns = filteredData.reduce((acc, record) => {
      const dayOfWeek = new Date(record.attendance_date).getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

      if (!acc[dayName]) {
        acc[dayName] = { office: 0, wfh: 0, leave: 0, total: 0 };
      }

      acc[dayName][record.status]++;
      acc[dayName].total++;
      return acc;
    }, {});

    // Calculate predictions for next week
    const predictions = Object.entries(dayPatterns).map(([day, stats]: [string, any]) => ({
      day,
      predictedOfficeAttendance: Math.round((stats.office / stats.total) * 100),
      predictedWFH: Math.round((stats.wfh / stats.total) * 100),
      confidence: Math.min(95, Math.max(60, stats.total * 2)) // Confidence based on data points
    }));

    return {
      weeklyPredictions: predictions,
      peakOfficeDays: predictions
        .sort((a, b) => b.predictedOfficeAttendance - a.predictedOfficeAttendance)
        .slice(0, 3)
        .map(p => p.day),
      recommendedWFHDays: predictions
        .sort((a, b) => a.predictedOfficeAttendance - b.predictedOfficeAttendance)
        .slice(0, 2)
        .map(p => p.day)
    };
  },

  async getRoomRecommendations(userId: string, meetingSize: number, duration: number, preferredDate: string): Promise<any> {
    // Get user's historical room preferences
    const { data: userBookings, error: userError } = await supabase
      .from('room_bookings')
      .select(`
        room_id,
        duration_hours,
        purpose,
        rooms (name, capacity, floor, amenities)
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('booking_date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (userError) throw userError;

    // Get all available rooms
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', meetingSize);

    if (roomsError) throw roomsError;

    // Get room utilization data
    const { data: utilizationData, error: utilizationError } = await supabase
      .from('room_bookings')
      .select(`
        room_id,
        booking_date,
        start_time,
        end_time,
        rooms (name)
      `)
      .eq('status', 'confirmed')
      .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (utilizationError) throw utilizationError;

    return this.calculateRoomRecommendations(userBookings, allRooms, utilizationData, meetingSize, duration);
  },

  calculateRoomRecommendations(userBookings: any[], allRooms: any[], utilizationData: any[], meetingSize: number, duration: number): any {
    // Calculate user preferences
    const userPreferences = userBookings.reduce((acc, booking) => {
      const roomId = booking.room_id;
      if (!acc[roomId]) {
        acc[roomId] = { count: 0, room: booking.rooms };
      }
      acc[roomId].count++;
      return acc;
    }, {});

    // Calculate room utilization scores
    const utilizationScores = utilizationData.reduce((acc, booking) => {
      const roomId = booking.room_id;
      if (!acc[roomId]) {
        acc[roomId] = 0;
      }
      acc[roomId]++;
      return acc;
    }, {});

    // Score and rank rooms
    const recommendations = allRooms.map(room => {
      let score = 0;

      // User preference score (40% weight)
      const userPrefCount = userPreferences[room.id]?.count || 0;
      score += (userPrefCount / Math.max(1, userBookings.length)) * 40;

      // Capacity efficiency score (30% weight)
      const capacityEfficiency = meetingSize / room.capacity;
      score += (capacityEfficiency > 0.5 && capacityEfficiency <= 1 ? 30 : 15);

      // Low utilization bonus (20% weight)
      const utilization = utilizationScores[room.id] || 0;
      score += Math.max(0, 20 - utilization);

      // Amenities bonus (10% weight)
      const amenitiesScore = room.amenities ? Object.keys(room.amenities).length * 2 : 0;
      score += Math.min(10, amenitiesScore);

      return {
        ...room,
        recommendationScore: Math.round(score),
        utilizationRate: utilization,
        userFamiliarity: userPrefCount > 0
      };
    });

    return recommendations
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 5);
  },

  // Automated Conflict Resolution
  async detectBookingConflicts(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Find overlapping room bookings
    const { data: conflicts, error } = await supabase
      .from('room_bookings')
      .select(`
        *,
        rooms (name, capacity),
        users (
          employee_details (full_name, employee_id)
        )
      `)
      .eq('status', 'confirmed')
      .gte('booking_date', today)
      .lte('booking_date', nextWeek);

    if (error) throw error;

    // Group by room and date to find conflicts
    const conflictGroups = conflicts.reduce((acc, booking) => {
      const key = `${booking.room_id}-${booking.booking_date}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(booking);
      return acc;
    }, {});

    // Find actual time conflicts
    const detectedConflicts = [];
    for (const [key, bookings] of Object.entries(conflictGroups)) {
      const bookingList = bookings as any[];
      if (bookingList.length > 1) {
        // Check for time overlaps
        for (let i = 0; i < bookingList.length; i++) {
          for (let j = i + 1; j < bookingList.length; j++) {
            const booking1 = bookingList[i];
            const booking2 = bookingList[j];

            if (this.hasTimeOverlap(booking1, booking2)) {
              detectedConflicts.push({
                conflictId: `${booking1.id}-${booking2.id}`,
                room: booking1.rooms,
                date: booking1.booking_date,
                conflictingBookings: [booking1, booking2],
                severity: 'high',
                suggestedResolution: await this.generateConflictResolution(booking1, booking2)
              });
            }
          }
        }
      }
    }

    return detectedConflicts;
  },

  hasTimeOverlap(booking1: any, booking2: any): boolean {
    const start1 = new Date(`${booking1.booking_date}T${booking1.start_time}`);
    const end1 = new Date(`${booking1.booking_date}T${booking1.end_time}`);
    const start2 = new Date(`${booking2.booking_date}T${booking2.start_time}`);
    const end2 = new Date(`${booking2.booking_date}T${booking2.end_time}`);

    return start1 < end2 && start2 < end1;
  },

  async generateConflictResolution(booking1: any, booking2: any): Promise<any> {
    // Find alternative rooms for the same time
    const { data: alternativeRooms, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', Math.min(booking1.rooms.capacity, booking2.rooms.capacity));

    if (error) throw error;

    // Check availability of alternative rooms
    const availableAlternatives = [];
    for (const room of alternativeRooms) {
      if (room.id !== booking1.room_id) {
        const isAvailable = await roomAPI.checkRoomAvailability(
          room.id,
          booking1.booking_date,
          booking1.start_time,
          booking1.end_time
        );
        if (isAvailable) {
          availableAlternatives.push(room);
        }
      }
    }

    return {
      type: 'room_reassignment',
      priority: booking1.created_at < booking2.created_at ? 'booking1' : 'booking2',
      alternativeRooms: availableAlternatives.slice(0, 3),
      suggestedActions: [
        'Move newer booking to alternative room',
        'Contact users to negotiate time change',
        'Suggest virtual meeting option'
      ]
    };
  },

  // Auto-Release System
  async detectUnusedBookings(): Promise<any[]> {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const today = now.toISOString().split('T')[0];

    // Find bookings that should have started but show no activity
    const { data: potentialUnused, error } = await supabase
      .from('room_bookings')
      .select(`
        *,
        rooms (name),
        users (
          employee_details (full_name)
        )
      `)
      .eq('booking_date', today)
      .eq('status', 'confirmed')
      .lt('start_time', currentTime);

    if (error) throw error;

    const unusedBookings = [];
    for (const booking of potentialUnused) {
      const startTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const minutesPassed = (now.getTime() - startTime.getTime()) / (1000 * 60);

      // Consider unused if 15+ minutes past start time
      if (minutesPassed >= 15) {
        unusedBookings.push({
          ...booking,
          minutesOverdue: Math.round(minutesPassed),
          autoReleaseEligible: minutesPassed >= 30, // Auto-release after 30 minutes
          suggestedAction: minutesPassed >= 30 ? 'auto_release' : 'send_reminder'
        });
      }
    }

    return unusedBookings;
  },

  async autoReleaseUnusedBookings(): Promise<any> {
    const unusedBookings = await this.detectUnusedBookings();
    const eligibleForRelease = unusedBookings.filter(b => b.autoReleaseEligible);

    const releasedBookings = [];
    for (const booking of eligibleForRelease) {
      try {
        const { data: cancelled, error } = await supabase
          .from('room_bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Auto-released due to no-show'
          })
          .eq('id', booking.id)
          .select()
          .single();

        if (!error) {
          releasedBookings.push(cancelled);
        }
      } catch (error) {
        console.error(`Failed to auto-release booking ${booking.id}:`, error);
      }
    }

    return {
      totalDetected: unusedBookings.length,
      autoReleased: releasedBookings.length,
      releasedBookings,
      nextCheck: new Date(Date.now() + 15 * 60 * 1000) // Next check in 15 minutes
    };
  }
};

// Chat Management
export const chatAPI = {
  async saveMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

// Admin APIs
export const adminAPI = {
  async getAllUsers(includeDeleted = false): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        employee_details (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        employee_details (*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createUser(userData: {
    email: string;
    password: string;
    role: 'user' | 'admin';
    employeeDetails: Omit<EmployeeDetails, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  }): Promise<{ user: User; employeeDetails: EmployeeDetails }> {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        role: userData.role,
        full_name: userData.employeeDetails.full_name
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    try {
      // Create user record in database
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          role: userData.role,
          is_first_time_user: true
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create employee details
      const { data: employeeRecord, error: employeeError } = await supabase
        .from('employee_details')
        .insert({
          user_id: authData.user.id,
          ...userData.employeeDetails
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      return {
        user: userRecord,
        employeeDetails: employeeRecord
      };
    } catch (error) {
      // Cleanup: delete auth user if database operations failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  },

  async updateUser(id: string, updates: {
    email?: string;
    role?: 'user' | 'admin';
    employeeDetails?: Partial<Omit<EmployeeDetails, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
  }): Promise<{ user: User; employeeDetails?: EmployeeDetails }> {
    const results: any = {};

    // Update user record
    if (updates.email || updates.role !== undefined) {
      const userUpdates: any = {};
      if (updates.email) userUpdates.email = updates.email;
      if (updates.role !== undefined) userUpdates.role = updates.role;

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', id)
        .select()
        .single();

      if (userError) throw userError;
      results.user = userRecord;

      // Update auth user email if changed
      if (updates.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
          email: updates.email
        });
        if (authError) throw authError;
      }
    }

    // Update employee details
    if (updates.employeeDetails) {
      const { data: employeeRecord, error: employeeError } = await supabase
        .from('employee_details')
        .update(updates.employeeDetails)
        .eq('user_id', id)
        .select()
        .single();

      if (employeeError) throw employeeError;
      results.employeeDetails = employeeRecord;
    }

    // If no user record was updated, fetch current user
    if (!results.user) {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) throw userError;
      results.user = userRecord;
    }

    return results;
  },

  async getDailyAttendanceSummary(date?: string): Promise<any> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .eq('attendance_date', targetDate)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getSystemSettings(): Promise<any> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key');

    if (error) throw error;
    return data;
  },

  async updateSystemSetting(key: string, value: string): Promise<any> {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async softDeleteUser(id: string): Promise<void> {
    // Since we don't have a deleted column, we'll use the auth system to disable the user
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { disabled: true }
    });
    if (error) throw error;
  },

  async restoreUser(id: string): Promise<void> {
    // Restore user by removing the disabled flag
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { disabled: false }
    });
    if (error) throw error;
  },

  async permanentDeleteUser(id: string): Promise<void> {
    // Delete from auth first
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    // Database records will be cascade deleted due to foreign key constraints
  },

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword
    });
    if (error) throw error;
  },

  async searchUsers(query: string, filters?: {
    role?: 'user' | 'admin';
    department?: string;
    workMode?: 'in-office' | 'wfh' | 'hybrid';
    includeDeleted?: boolean;
  }): Promise<User[]> {
    let dbQuery = supabase
      .from('users')
      .select(`
        *,
        employee_details (*)
      `);

    // Apply filters - no deleted column in current schema

    if (filters?.role) {
      dbQuery = dbQuery.eq('role', filters.role);
    }

    // Text search across email and employee details
    if (query.trim()) {
      dbQuery = dbQuery.or(`
        email.ilike.%${query}%,
        employee_details.full_name.ilike.%${query}%,
        employee_details.employee_id.ilike.%${query}%,
        employee_details.department.ilike.%${query}%,
        employee_details.position.ilike.%${query}%
      `);
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false });
    if (error) throw error;

    // Apply additional filters that require post-processing
    let filteredData = data;

    if (filters?.department) {
      filteredData = filteredData.filter(user =>
        user.employee_details?.some((emp: any) =>
          emp.department?.toLowerCase().includes(filters.department!.toLowerCase())
        )
      );
    }

    if (filters?.workMode) {
      filteredData = filteredData.filter(user =>
        user.employee_details?.some((emp: any) => emp.work_mode === filters.workMode)
      );
    }

    return filteredData;
  },

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    deletedUsers: number;
    adminUsers: number;
    usersByRole: Record<string, number>;
    usersByDepartment: Record<string, number>;
    usersByWorkMode: Record<string, number>;
  }> {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select(`
        *,
        employee_details (*)
      `);

    if (error) throw error;

    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => !u.deleted).length,
      deletedUsers: allUsers.filter(u => u.deleted).length,
      adminUsers: allUsers.filter(u => u.role === 'admin' && !u.deleted).length,
      usersByRole: {} as Record<string, number>,
      usersByDepartment: {} as Record<string, number>,
      usersByWorkMode: {} as Record<string, number>
    };

    // Calculate role distribution
    allUsers.forEach(user => {
      if (!user.deleted) {
        stats.usersByRole[user.role] = (stats.usersByRole[user.role] || 0) + 1;
      }
    });

    // Calculate department and work mode distribution
    allUsers.forEach(user => {
      if (!user.deleted && user.employee_details?.length > 0) {
        const emp = user.employee_details[0];
        if (emp.department) {
          stats.usersByDepartment[emp.department] = (stats.usersByDepartment[emp.department] || 0) + 1;
        }
        if (emp.work_mode) {
          stats.usersByWorkMode[emp.work_mode] = (stats.usersByWorkMode[emp.work_mode] || 0) + 1;
        }
      }
    });

    return stats;
  },

  async bulkUpdateUsers(userIds: string[], updates: {
    role?: 'user' | 'admin';
    deleted?: boolean;
  }): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .in('id', userIds)
      .select();

    if (error) throw error;
    return data;
  }
};
