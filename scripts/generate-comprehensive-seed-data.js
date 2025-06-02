#!/usr/bin/env node

/**
 * Smart Office Assistant - Comprehensive Seed Data Generator
 * 
 * This script generates realistic seed data for all remaining database tables:
 * - Room bookings (next 2 weeks)
 * - Parking reservations (next week)
 * - Attendance records (past 30 days)
 * - Chat messages (various interactions)
 * - Enhanced system settings
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();
if (fs.existsSync('.env.seed')) {
  require('dotenv').config({ path: '.env.seed' });
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper functions for date/time generation
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date) => date.toISOString().split('T')[0];
const formatTime = (hours, minutes = 0) => `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

const getRandomTime = (startHour, endHour) => {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
  const minute = Math.random() < 0.5 ? 0 : 30;
  return formatTime(hour, minute);
};

const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Sample data arrays
const BOOKING_PURPOSES = [
  'Team standup meeting',
  'Client presentation',
  'Project planning session',
  'Training workshop',
  'Interview session',
  'Department meeting',
  'Quarterly review',
  'Product demo',
  'Strategy discussion',
  'Code review session',
  'Budget planning',
  'Performance review',
  'Onboarding session',
  'Brainstorming session',
  'Sprint planning'
];

const LEAVE_REASONS = [
  'Annual leave',
  'Sick leave',
  'Personal day',
  'Medical appointment',
  'Family emergency',
  'Mental health day',
  'Vacation',
  'Conference attendance',
  'Training course',
  'Public holiday'
];

const CHAT_INTENTS = [
  'room_booking',
  'parking_reservation',
  'attendance_query',
  'general_inquiry',
  'help_request',
  'system_status',
  'schedule_query',
  'facility_info'
];

const USER_MESSAGES = [
  'Can I book Conference Room A for tomorrow at 2 PM?',
  'What parking spots are available today?',
  'How do I check my attendance history?',
  'Is the Training Room available this afternoon?',
  'I need to cancel my parking reservation',
  'What are the office hours?',
  'How do I book a meeting room?',
  'Can you show me my upcoming bookings?',
  'Is there a bike parking spot available?',
  'I forgot to check in today, can you help?'
];

const BOT_RESPONSES = [
  'I can help you book Conference Room A. Let me check availability.',
  'Here are the available parking spots for today.',
  'You can view your attendance history in the Attendance section.',
  'The Training Room is available from 2:00 PM to 5:00 PM today.',
  'I\'ve cancelled your parking reservation for today.',
  'Office hours are 8:00 AM to 6:00 PM, Monday to Friday.',
  'To book a meeting room, go to the Rooms section and select your preferred time.',
  'Here are your upcoming room bookings.',
  'Yes, bike parking spot #103 is available.',
  'I can help you record your attendance. What time did you arrive?'
];

/**
 * Fetch existing data from database
 */
async function fetchExistingData() {
  console.log('📊 Fetching existing data...');
  
  try {
    // Fetch users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .order('email');
    
    if (usersError) throw usersError;

    // Fetch employee details
    const { data: employees, error: employeesError } = await supabase
      .from('employee_details')
      .select('user_id, full_name, work_mode')
      .order('full_name');
    
    if (employeesError) throw employeesError;

    // Fetch user preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('user_id, vehicle_type, vehicle_registration')
      .order('user_id');
    
    if (preferencesError) throw preferencesError;

    // Fetch rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, capacity')
      .eq('is_active', true)
      .order('name');
    
    if (roomsError) throw roomsError;

    // Fetch parking spots
    const { data: parkingSpots, error: parkingError } = await supabase
      .from('parking_spots')
      .select('id, spot_number, spot_type')
      .eq('is_active', true)
      .order('spot_number');
    
    if (parkingError) throw parkingError;

    // Combine user data
    const userData = users.map(user => {
      const employee = employees.find(emp => emp.user_id === user.id);
      const prefs = preferences.find(pref => pref.user_id === user.id);
      return {
        ...user,
        full_name: employee?.full_name || 'Unknown',
        work_mode: employee?.work_mode || 'hybrid',
        vehicle_type: prefs?.vehicle_type || 'None',
        vehicle_registration: prefs?.vehicle_registration
      };
    });

    console.log(`   ✅ Found ${userData.length} users`);
    console.log(`   ✅ Found ${rooms.length} rooms`);
    console.log(`   ✅ Found ${parkingSpots.length} parking spots`);

    return { users: userData, rooms, parkingSpots };
  } catch (error) {
    console.error('❌ Failed to fetch existing data:', error.message);
    throw error;
  }
}

/**
 * Generate room bookings for the next 2 weeks
 */
async function generateRoomBookings(users, rooms) {
  console.log('🏢 Generating room bookings...');

  const bookings = [];
  const today = new Date();

  // Track bookings per room per day to avoid conflicts
  const roomSchedule = {};

  // Generate bookings for next 14 days
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const bookingDate = addDays(today, dayOffset);
    const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
    const dateKey = formatDate(bookingDate);

    // Skip weekends for most bookings
    if (isWeekend && Math.random() > 0.2) continue;

    // Initialize room schedule for this date
    if (!roomSchedule[dateKey]) {
      roomSchedule[dateKey] = {};
      rooms.forEach(room => {
        roomSchedule[dateKey][room.id] = [];
      });
    }

    // Generate 2-4 bookings per day
    const bookingsPerDay = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < bookingsPerDay; i++) {
      const user = getRandomElement(users);
      const room = getRandomElement(rooms);
      const duration = Math.floor(Math.random() * 3) + 1; // 1-3 hours

      // Find available time slot for this room
      let startHour = null;
      let endHour = null;

      // Try to find a non-conflicting time slot
      for (let attempt = 0; attempt < 10; attempt++) {
        const tryStartHour = Math.floor(Math.random() * 8) + 9; // 9 AM to 4 PM
        const tryEndHour = tryStartHour + duration;

        if (tryEndHour > 17) continue; // Don't book past 5 PM

        // Check for conflicts with existing bookings for this room
        const existingBookings = roomSchedule[dateKey][room.id];
        const hasConflict = existingBookings.some(booking => {
          return (tryStartHour < booking.endHour && tryEndHour > booking.startHour);
        });

        if (!hasConflict) {
          startHour = tryStartHour;
          endHour = tryEndHour;
          break;
        }
      }

      // If we couldn't find a slot, skip this booking
      if (startHour === null) continue;

      // Add to room schedule
      roomSchedule[dateKey][room.id].push({
        startHour: startHour,
        endHour: endHour
      });

      const status = Math.random() < 0.85 ? 'confirmed' :
                    Math.random() < 0.7 ? 'completed' : 'cancelled';

      bookings.push({
        user_id: user.id,
        room_id: room.id,
        booking_date: dateKey,
        start_time: formatTime(startHour),
        end_time: formatTime(endHour),
        duration_hours: duration,
        purpose: getRandomElement(BOOKING_PURPOSES),
        status: status
      });
    }
  }

  console.log(`   📅 Generated ${bookings.length} room bookings`);
  return bookings;
}

/**
 * Generate parking reservations for the next week
 */
async function generateParkingReservations(users, parkingSpots) {
  console.log('🚗 Generating parking reservations...');

  const reservations = [];
  const today = new Date();

  // Filter users who have vehicles
  const usersWithVehicles = users.filter(user => user.vehicle_type !== 'None');

  // Track reservations per user per day to avoid unique constraint violation
  const userReservations = {};

  // Generate reservations for next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const reservationDate = addDays(today, dayOffset);
    const isWeekend = reservationDate.getDay() === 0 || reservationDate.getDay() === 6;
    const dateKey = formatDate(reservationDate);

    // Fewer reservations on weekends
    if (isWeekend && Math.random() > 0.3) continue;

    // Initialize user reservations for this date
    if (!userReservations[dateKey]) {
      userReservations[dateKey] = new Set();
    }

    for (const user of usersWithVehicles) {
      // Skip if user already has a reservation for this date
      if (userReservations[dateKey].has(user.id)) continue;

      // 70% chance user makes a reservation on any given day
      if (Math.random() > 0.7) continue;

      // Skip if user works from home
      if (user.work_mode === 'wfh' && Math.random() > 0.1) continue;

      const availableSpots = parkingSpots.filter(spot =>
        spot.spot_type === user.vehicle_type.toLowerCase()
      );

      if (availableSpots.length === 0) continue;

      const spot = getRandomElement(availableSpots);
      const status = Math.random() < 0.9 ? 'active' :
                    Math.random() < 0.7 ? 'completed' : 'cancelled';

      // Mark user as having a reservation for this date
      userReservations[dateKey].add(user.id);

      reservations.push({
        user_id: user.id,
        parking_spot_id: spot.id,
        reservation_date: dateKey,
        start_time: '00:00:00',
        end_time: '23:59:59',
        status: status
      });
    }
  }

  console.log(`   🅿️ Generated ${reservations.length} parking reservations`);
  return reservations;
}

/**
 * Generate attendance records for the past 30 days
 */
async function generateAttendanceRecords(users) {
  console.log('📋 Generating attendance records...');

  const records = [];
  const today = new Date();

  // Track attendance per user per day to avoid unique constraint violation
  const userAttendance = {};

  // Generate records for past 30 days
  for (let dayOffset = -30; dayOffset < 0; dayOffset++) {
    const attendanceDate = addDays(today, dayOffset);
    const isWeekend = attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6;
    const dateKey = formatDate(attendanceDate);

    // Initialize user attendance for this date
    if (!userAttendance[dateKey]) {
      userAttendance[dateKey] = new Set();
    }

    for (const user of users) {
      // Skip if user already has attendance record for this date
      if (userAttendance[dateKey].has(user.id)) continue;

      // Skip weekends unless user occasionally works
      if (isWeekend && Math.random() > 0.1) continue;

      let status, checkInTime, checkOutTime, transportMode, leaveReason;

      // Determine attendance status based on work mode
      if (user.work_mode === 'wfh') {
        status = Math.random() < 0.8 ? 'wfh' : Math.random() < 0.9 ? 'office' : 'leave';
      } else if (user.work_mode === 'in-office') {
        status = Math.random() < 0.85 ? 'office' : Math.random() < 0.9 ? 'wfh' : 'leave';
      } else { // hybrid
        status = Math.random() < 0.5 ? 'office' : Math.random() < 0.9 ? 'wfh' : 'leave';
      }

      if (status === 'office') {
        const checkInHour = Math.floor(Math.random() * 2) + 8; // 8-9 AM
        const checkInMinute = Math.floor(Math.random() * 60);
        checkInTime = formatTime(checkInHour, checkInMinute);

        const workHours = Math.floor(Math.random() * 2) + 8; // 8-9 hours
        const checkOutHour = checkInHour + workHours;
        const checkOutMinute = Math.floor(Math.random() * 60);
        checkOutTime = formatTime(Math.min(checkOutHour, 18), checkOutMinute);

        // Transport mode based on vehicle type
        if (user.vehicle_type === 'Car') {
          transportMode = Math.random() < 0.8 ? 'car' : getRandomElement(['public', 'walk']);
        } else if (user.vehicle_type === 'Bike') {
          transportMode = Math.random() < 0.7 ? 'bike' : getRandomElement(['public', 'walk']);
        } else {
          transportMode = getRandomElement(['public', 'walk']);
        }
      } else if (status === 'wfh') {
        checkInTime = getRandomTime(8, 10);
        checkOutTime = getRandomTime(16, 18);
        transportMode = null;
      } else { // leave
        checkInTime = null;
        checkOutTime = null;
        transportMode = null;
        leaveReason = getRandomElement(LEAVE_REASONS);
      }

      // Mark user as having attendance record for this date
      userAttendance[dateKey].add(user.id);

      records.push({
        user_id: user.id,
        attendance_date: dateKey,
        status: status,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        transport_mode: transportMode,
        leave_reason: leaveReason,
        location_lat: status === 'office' ? 37.7749 + (Math.random() - 0.5) * 0.001 : null,
        location_lng: status === 'office' ? -122.4194 + (Math.random() - 0.5) * 0.001 : null
      });
    }
  }

  console.log(`   📊 Generated ${records.length} attendance records`);
  return records;
}

/**
 * Generate chat messages
 */
async function generateChatMessages(users) {
  console.log('💬 Generating chat messages...');

  const messages = [];
  const today = new Date();

  // Generate messages over the past 14 days
  for (let dayOffset = -14; dayOffset < 0; dayOffset++) {
    const messageDate = addDays(today, dayOffset);

    // 2-5 conversations per day
    const conversationsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < conversationsPerDay; i++) {
      const user = getRandomElement(users);
      const intent = getRandomElement(CHAT_INTENTS);
      const userMessage = getRandomElement(USER_MESSAGES);
      const botResponse = getRandomElement(BOT_RESPONSES);

      const conversationTime = new Date(messageDate);
      conversationTime.setHours(
        Math.floor(Math.random() * 10) + 8, // 8 AM to 5 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      // User message
      messages.push({
        user_id: user.id,
        message_text: userMessage,
        is_bot_message: false,
        intent: intent,
        response_data: null,
        created_at: conversationTime.toISOString()
      });

      // Bot response (1-3 seconds later)
      const botTime = new Date(conversationTime);
      botTime.setSeconds(botTime.getSeconds() + Math.floor(Math.random() * 3) + 1);

      const responseData = {
        intent: intent,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        entities: intent === 'room_booking' ? { room_type: 'conference' } :
                 intent === 'parking_reservation' ? { vehicle_type: user.vehicle_type } :
                 intent === 'attendance_query' ? { query_type: 'history' } : {}
      };

      messages.push({
        user_id: user.id,
        message_text: botResponse,
        is_bot_message: true,
        intent: intent,
        response_data: responseData,
        created_at: botTime.toISOString()
      });
    }
  }

  console.log(`   💭 Generated ${messages.length} chat messages`);
  return messages;
}

/**
 * Insert data into database
 */
async function insertSeedData(bookings, reservations, records, messages) {
  console.log('💾 Inserting seed data into database...');

  try {
    // Insert room bookings
    if (bookings.length > 0) {
      const { error: bookingsError } = await supabase
        .from('room_bookings')
        .insert(bookings);

      if (bookingsError) throw new Error(`Room bookings: ${bookingsError.message}`);
      console.log(`   ✅ Inserted ${bookings.length} room bookings`);
    }

    // Insert parking reservations
    if (reservations.length > 0) {
      const { error: reservationsError } = await supabase
        .from('parking_reservations')
        .insert(reservations);

      if (reservationsError) throw new Error(`Parking reservations: ${reservationsError.message}`);
      console.log(`   ✅ Inserted ${reservations.length} parking reservations`);
    }

    // Insert attendance records
    if (records.length > 0) {
      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(records);

      if (recordsError) throw new Error(`Attendance records: ${recordsError.message}`);
      console.log(`   ✅ Inserted ${records.length} attendance records`);
    }

    // Insert chat messages
    if (messages.length > 0) {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messages);

      if (messagesError) throw new Error(`Chat messages: ${messagesError.message}`);
      console.log(`   ✅ Inserted ${messages.length} chat messages`);
    }

  } catch (error) {
    console.error('❌ Failed to insert seed data:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function generateComprehensiveSeedData() {
  console.log('🚀 Starting comprehensive seed data generation...\n');

  try {
    // Fetch existing data
    const { users, rooms, parkingSpots } = await fetchExistingData();

    if (users.length === 0) {
      console.error('❌ No users found. Please run the user seed script first.');
      process.exit(1);
    }

    console.log('');

    // Generate all seed data
    const bookings = await generateRoomBookings(users, rooms);
    const reservations = await generateParkingReservations(users, parkingSpots);
    const records = await generateAttendanceRecords(users);
    const messages = await generateChatMessages(users);

    console.log('');

    // Insert into database
    await insertSeedData(bookings, reservations, records, messages);

    console.log('\n🎉 Comprehensive seed data generation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   📅 Room bookings: ${bookings.length}`);
    console.log(`   🅿️ Parking reservations: ${reservations.length}`);
    console.log(`   📋 Attendance records: ${records.length}`);
    console.log(`   💬 Chat messages: ${messages.length}`);
    console.log('\n✨ Your Smart Office Assistant database is now fully populated!');

  } catch (error) {
    console.error('💥 Seed data generation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateComprehensiveSeedData();
}

module.exports = { generateComprehensiveSeedData };
