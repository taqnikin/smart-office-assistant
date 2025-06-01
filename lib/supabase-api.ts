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
  vehicle_type?: 'Car' | 'Bike' | 'None';
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
  created_at: string;
  updated_at: string;
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
  async getAllUsers(): Promise<User[]> {
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
  }
};
