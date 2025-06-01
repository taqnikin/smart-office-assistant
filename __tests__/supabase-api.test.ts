import {
  userAPI,
  roomAPI,
  parkingAPI,
  attendanceAPI,
  type User,
  type Room,
  type RoomBooking,
  type ParkingSpot,
  type AttendanceRecord,
  type EmployeeDetails,
  type UserPreferences,
  type ParkingReservation
} from '../lib/supabase-api';
import { supabase } from '../supabase';

// Mock the supabase module
jest.mock('../supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Supabase API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain with all methods
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      or: jest.fn(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockChain as any);
  });

  describe('User API', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      is_first_time_user: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get current user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({ data: mockUser, error: null });

      const result = await userAPI.getCurrentUser();

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when no authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await userAPI.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should update user', async () => {
      const updates = { role: 'admin' as const };
      const updatedUser = { ...mockUser, ...updates };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({ data: updatedUser, error: null });

      const result = await userAPI.updateUser('user-123', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockChain.update).toHaveBeenCalledWith(updates);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result.role).toBe('admin');
    });

    it('should get employee details', async () => {
      const mockEmployeeDetails: EmployeeDetails = {
        id: 'emp-123',
        user_id: 'user-123',
        full_name: 'John Doe',
        employee_id: 'EMP001',
        date_of_joining: '2024-01-01',
        work_hours: '9-5',
        work_mode: 'in-office',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({ data: mockEmployeeDetails, error: null });

      const result = await userAPI.getEmployeeDetails('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('employee_details');
      expect(result).toEqual(mockEmployeeDetails);
    });
  });

  describe('Room API', () => {
    const mockRoom: Room = {
      id: 'room-123',
      name: 'Conference Room A',
      capacity: 10,
      floor: '1',
      has_av: true,
      has_whiteboard: true,
      has_teleconference: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get all active rooms', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.order.mockResolvedValue({ data: [mockRoom], error: null });

      const result = await roomAPI.getAllRooms();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('rooms');
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockChain.order).toHaveBeenCalledWith('name');
      expect(result).toEqual([mockRoom]);
    });

    it('should create room booking', async () => {
      const booking = {
        user_id: 'user-123',
        room_id: 'room-123',
        booking_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '11:00:00',
        duration_hours: 1,
        purpose: 'Team meeting',
        status: 'confirmed' as const
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({
        data: { ...booking, id: 'booking-123' },
        error: null
      });

      const result = await roomAPI.createBooking(booking);

      expect(mockSupabase.from).toHaveBeenCalledWith('room_bookings');
      expect(mockChain.insert).toHaveBeenCalledWith(booking);
      expect(result.purpose).toBe(booking.purpose);
    });

    it('should check room availability', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.or.mockResolvedValue({ data: [], error: null });

      const result = await roomAPI.checkRoomAvailability(
        'room-123',
        '2024-01-15',
        '10:00:00',
        '11:00:00'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('room_bookings');
      expect(result).toBe(true);
    });
  });

  describe('Parking API', () => {
    const mockParkingSpot: ParkingSpot = {
      id: 'spot-123',
      spot_number: 1,
      spot_type: 'car',
      floor: '1',
      section: 'A',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should get all parking spots', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.order.mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [mockParkingSpot], error: null })
      });

      const result = await parkingAPI.getAllParkingSpots();

      expect(mockSupabase.from).toHaveBeenCalledWith('parking_spots');
      expect(result).toEqual([mockParkingSpot]);
    });

    it('should create parking reservation', async () => {
      const reservation = {
        user_id: 'user-123',
        parking_spot_id: 'spot-123',
        reservation_date: '2024-01-15',
        start_time: '08:00:00',
        end_time: '18:00:00',
        status: 'active' as const
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({
        data: { ...reservation, id: 'reservation-123' },
        error: null
      });

      const result = await parkingAPI.createReservation(reservation);

      expect(mockSupabase.from).toHaveBeenCalledWith('parking_reservations');
      expect(result.status).toBe(reservation.status);
    });

    it('should get user parking reservation', async () => {
      const mockReservation: ParkingReservation = {
        id: 'reservation-123',
        user_id: 'user-123',
        parking_spot_id: 'spot-123',
        reservation_date: '2024-01-15',
        start_time: '08:00:00',
        end_time: '18:00:00',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({ data: mockReservation, error: null });

      const result = await parkingAPI.getUserReservation('user-123', '2024-01-15');

      expect(mockSupabase.from).toHaveBeenCalledWith('parking_reservations');
      expect(result).toEqual(mockReservation);
    });
  });

  describe('Attendance API', () => {
    const mockAttendance: AttendanceRecord = {
      id: 'attendance-123',
      user_id: 'user-123',
      attendance_date: '2024-01-15',
      check_in_time: '09:00:00',
      check_out_time: '17:00:00',
      transport_mode: 'car',
      status: 'office',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T17:00:00Z'
    };

    it('should create attendance record', async () => {
      const newRecord = {
        user_id: 'user-123',
        attendance_date: '2024-01-15',
        check_in_time: '09:00:00',
        transport_mode: 'car' as const,
        status: 'office' as const
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({
        data: { ...newRecord, id: 'attendance-123' },
        error: null
      });

      const result = await attendanceAPI.createAttendanceRecord(newRecord);

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_records');
      expect(result.status).toBe(newRecord.status);
    });

    it('should get user attendance history', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.limit.mockResolvedValue({ data: [mockAttendance], error: null });

      const result = await attendanceAPI.getUserAttendanceHistory('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_records');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual([mockAttendance]);
    });

    it('should update attendance record', async () => {
      const updates = {
        check_out_time: '18:00:00',
        status: 'office' as const
      };

      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({
        data: { ...mockAttendance, ...updates },
        error: null
      });

      const result = await attendanceAPI.updateAttendanceRecord('attendance-123', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_records');
      expect(mockChain.update).toHaveBeenCalledWith(updates);
      expect(result.check_out_time).toBe(updates.check_out_time);
    });

    it('should get today attendance', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({ data: mockAttendance, error: null });

      const result = await attendanceAPI.getTodayAttendance('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_records');
      expect(result).toEqual(mockAttendance);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.order.mockRejectedValue(new Error('Network error'));

      await expect(roomAPI.getAllRooms()).rejects.toThrow('Network error');
    });

    it('should handle database constraint errors', async () => {
      const mockChain = mockSupabase.from() as any;
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Unique constraint violation' }
      });

      // The API function should throw when there's an error
      await expect(userAPI.updateUser('user-123', {
        email: 'duplicate@example.com'
      })).rejects.toEqual({ message: 'Unique constraint violation' });
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const result = await userAPI.getCurrentUser();
      expect(result).toBeNull();
    });
  });
});
