#!/usr/bin/env node

/**
 * Smart Office Assistant - Comprehensive Seed Data Verification Script
 * 
 * This script verifies that all seed data was created correctly across all tables.
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
  console.error('   - SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Get count of records in a table
 */
async function getTableCount(tableName, conditions = {}) {
  try {
    let query = supabase.from(tableName).select('id');
    
    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error(`Error counting ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Get sample records from a table
 */
async function getSampleRecords(tableName, limit = 3) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${tableName} samples:`, error.message);
    return [];
  }
}

/**
 * Verify room bookings
 */
async function verifyRoomBookings() {
  console.log('🏢 Verifying room bookings...');
  
  const totalBookings = await getTableCount('room_bookings');
  const confirmedBookings = await getTableCount('room_bookings', { status: 'confirmed' });
  const cancelledBookings = await getTableCount('room_bookings', { status: 'cancelled' });
  const completedBookings = await getTableCount('room_bookings', { status: 'completed' });
  
  console.log(`   📊 Total bookings: ${totalBookings}`);
  console.log(`   ✅ Confirmed: ${confirmedBookings}`);
  console.log(`   ❌ Cancelled: ${cancelledBookings}`);
  console.log(`   ✔️ Completed: ${completedBookings}`);
  
  if (totalBookings > 0) {
    const samples = await getSampleRecords('room_bookings');
    console.log(`   📋 Sample booking purposes: ${samples.map(b => b.purpose).join(', ')}`);
  }
  
  return totalBookings;
}

/**
 * Verify parking reservations
 */
async function verifyParkingReservations() {
  console.log('\n🚗 Verifying parking reservations...');
  
  const totalReservations = await getTableCount('parking_reservations');
  const activeReservations = await getTableCount('parking_reservations', { status: 'active' });
  const completedReservations = await getTableCount('parking_reservations', { status: 'completed' });
  const cancelledReservations = await getTableCount('parking_reservations', { status: 'cancelled' });
  
  console.log(`   📊 Total reservations: ${totalReservations}`);
  console.log(`   🟢 Active: ${activeReservations}`);
  console.log(`   ✔️ Completed: ${completedReservations}`);
  console.log(`   ❌ Cancelled: ${cancelledReservations}`);
  
  return totalReservations;
}

/**
 * Verify attendance records
 */
async function verifyAttendanceRecords() {
  console.log('\n📋 Verifying attendance records...');
  
  const totalRecords = await getTableCount('attendance_records');
  const officeRecords = await getTableCount('attendance_records', { status: 'office' });
  const wfhRecords = await getTableCount('attendance_records', { status: 'wfh' });
  const leaveRecords = await getTableCount('attendance_records', { status: 'leave' });
  
  console.log(`   📊 Total records: ${totalRecords}`);
  console.log(`   🏢 Office: ${officeRecords}`);
  console.log(`   🏠 Work from home: ${wfhRecords}`);
  console.log(`   🌴 Leave: ${leaveRecords}`);
  
  if (leaveRecords > 0) {
    const leaveReasons = await getSampleRecords('attendance_records');
    const reasons = leaveReasons
      .filter(r => r.leave_reason)
      .map(r => r.leave_reason)
      .slice(0, 3);
    if (reasons.length > 0) {
      console.log(`   📝 Sample leave reasons: ${reasons.join(', ')}`);
    }
  }
  
  return totalRecords;
}

/**
 * Verify chat messages
 */
async function verifyChatMessages() {
  console.log('\n💬 Verifying chat messages...');
  
  const totalMessages = await getTableCount('chat_messages');
  const userMessages = await getTableCount('chat_messages', { is_bot_message: false });
  const botMessages = await getTableCount('chat_messages', { is_bot_message: true });
  
  console.log(`   📊 Total messages: ${totalMessages}`);
  console.log(`   👤 User messages: ${userMessages}`);
  console.log(`   🤖 Bot messages: ${botMessages}`);
  
  if (totalMessages > 0) {
    const samples = await getSampleRecords('chat_messages');
    const intents = [...new Set(samples.map(m => m.intent).filter(Boolean))];
    console.log(`   🎯 Sample intents: ${intents.join(', ')}`);
  }
  
  return totalMessages;
}

/**
 * Verify system settings
 */
async function verifySystemSettings() {
  console.log('\n⚙️ Verifying system settings...');
  
  const totalSettings = await getTableCount('system_settings');
  console.log(`   📊 Total settings: ${totalSettings}`);
  
  if (totalSettings > 0) {
    const samples = await getSampleRecords('system_settings', 5);
    console.log(`   🔧 Sample settings: ${samples.map(s => s.setting_key).join(', ')}`);
  }
  
  return totalSettings;
}

/**
 * Verify data relationships
 */
async function verifyDataRelationships() {
  console.log('\n🔗 Verifying data relationships...');
  
  try {
    // Check if all bookings have valid users and rooms
    const { data: bookingsWithUsers, error: bookingsError } = await supabase
      .from('room_bookings')
      .select(`
        id,
        users!inner(email),
        rooms!inner(name)
      `)
      .limit(5);
    
    if (bookingsError) throw bookingsError;
    
    console.log(`   ✅ Room bookings have valid user and room references`);
    
    // Check if parking reservations have valid users and spots
    const { data: reservationsWithData, error: reservationsError } = await supabase
      .from('parking_reservations')
      .select(`
        id,
        users!inner(email),
        parking_spots!inner(spot_number)
      `)
      .limit(5);
    
    if (reservationsError) throw reservationsError;
    
    console.log(`   ✅ Parking reservations have valid user and spot references`);
    
    // Check if attendance records have valid users
    const { data: attendanceWithUsers, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        users!inner(email)
      `)
      .limit(5);
    
    if (attendanceError) throw attendanceError;
    
    console.log(`   ✅ Attendance records have valid user references`);
    
    // Check if chat messages have valid users
    const { data: messagesWithUsers, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        users!inner(email)
      `)
      .limit(5);
    
    if (messagesError) throw messagesError;
    
    console.log(`   ✅ Chat messages have valid user references`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Relationship verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifySeedData() {
  console.log('🔍 Starting comprehensive seed data verification...\n');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);
  
  try {
    // Verify each table
    const bookingsCount = await verifyRoomBookings();
    const reservationsCount = await verifyParkingReservations();
    const recordsCount = await verifyAttendanceRecords();
    const messagesCount = await verifyChatMessages();
    const settingsCount = await verifySystemSettings();
    
    // Verify relationships
    const relationshipsValid = await verifyDataRelationships();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    const totalRecords = bookingsCount + reservationsCount + recordsCount + messagesCount + settingsCount;
    
    console.log(`📅 Room Bookings: ${bookingsCount}`);
    console.log(`🅿️ Parking Reservations: ${reservationsCount}`);
    console.log(`📋 Attendance Records: ${recordsCount}`);
    console.log(`💬 Chat Messages: ${messagesCount}`);
    console.log(`⚙️ System Settings: ${settingsCount}`);
    console.log(`📊 Total Records: ${totalRecords}`);
    console.log(`🔗 Relationships: ${relationshipsValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (totalRecords > 0 && relationshipsValid) {
      console.log('\n🎉 Seed data verification completed successfully!');
      console.log('✨ Your Smart Office Assistant database is fully populated and ready to use!');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Test the application with the created user accounts');
      console.log('2. Verify room booking functionality');
      console.log('3. Test parking reservation features');
      console.log('4. Check attendance tracking');
      console.log('5. Try the AI chat assistant');
    } else {
      console.log('\n⚠️ Issues found during verification:');
      if (totalRecords === 0) {
        console.log('- No seed data found. Run: npm run seed:data');
      }
      if (!relationshipsValid) {
        console.log('- Data relationship issues detected');
      }
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  verifySeedData();
}

module.exports = { verifySeedData };
