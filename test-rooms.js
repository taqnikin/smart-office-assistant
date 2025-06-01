// Test script to check and add sample rooms
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://udnhkdnbvjzcxooukqrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbmhrZG5idmp6Y3hvb3VrcXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2Njk1NTYsImV4cCI6MjA2NDI0NTU1Nn0.fUGiIMEf7xk7R0G9EFOjYkJpO3ptkrMYjnwkA-PeOPs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRooms() {
  console.log('🏢 Testing rooms functionality...\n');

  try {
    // Check existing rooms
    console.log('📋 Checking existing rooms...');
    const { data: existingRooms, error: fetchError } = await supabase
      .from('rooms')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching rooms:', fetchError.message);
    } else {
      console.log(`✅ Found ${existingRooms.length} existing rooms`);
      if (existingRooms.length > 0) {
        console.log('📋 Existing rooms:');
        existingRooms.forEach(room => {
          console.log(`   - ${room.name} (Floor: ${room.floor}, Capacity: ${room.capacity})`);
        });
      }
    }

    // If no rooms exist, try to add sample rooms
    if (!existingRooms || existingRooms.length === 0) {
      console.log('\n📋 Adding sample rooms...');
      
      const sampleRooms = [
        {
          name: 'Falcon',
          floor: '3rd',
          capacity: 8,
          has_av: true,
          has_whiteboard: true,
          has_teleconference: true,
          is_active: true,
          description: 'Conference room with full AV setup'
        },
        {
          name: 'Eagle',
          floor: '2nd',
          capacity: 12,
          has_av: true,
          has_whiteboard: true,
          has_teleconference: true,
          is_active: true,
          description: 'Large meeting room for team meetings'
        },
        {
          name: 'Hawk',
          floor: '2nd',
          capacity: 6,
          has_av: true,
          has_whiteboard: false,
          has_teleconference: false,
          is_active: true,
          description: 'Small meeting room for quick discussions'
        },
        {
          name: 'Sparrow',
          floor: '1st',
          capacity: 4,
          has_av: false,
          has_whiteboard: true,
          has_teleconference: false,
          is_active: true,
          description: 'Cozy room for small team meetings'
        }
      ];

      for (const room of sampleRooms) {
        console.log(`   Adding room: ${room.name}`);
        const { error: insertError } = await supabase
          .from('rooms')
          .insert(room);

        if (insertError) {
          console.error(`   ❌ Error adding ${room.name}:`, insertError.message);
        } else {
          console.log(`   ✅ Added ${room.name} successfully`);
        }
      }
    }

    // Test room booking with mock user
    console.log('\n🧪 Testing room booking with mock user...');
    
    const { data: rooms } = await supabase.from('rooms').select('*').limit(1);
    
    if (rooms && rooms.length > 0) {
      const testRoom = rooms[0];
      console.log(`📋 Using room: ${testRoom.name} (ID: ${testRoom.id})`);
      
      const testBooking = {
        user_id: '550e8400-e29b-41d4-a716-446655440001', // Mock user ID
        room_id: testRoom.id,
        booking_date: '2025-01-20',
        start_time: '10:00:00',
        end_time: '11:00:00',
        duration_hours: 1,
        purpose: 'Test booking for mock user',
        status: 'confirmed'
      };

      const { data: booking, error: bookingError } = await supabase
        .from('room_bookings')
        .insert(testBooking)
        .select()
        .single();

      if (bookingError) {
        console.error('❌ Room booking failed:', bookingError.message);
        console.log('💡 This is expected due to RLS policies. The app will use local storage for mock users.');
      } else {
        console.log('✅ Room booking successful!');
        console.log('📋 Booking details:', booking);
        
        // Clean up test booking
        await supabase.from('room_bookings').delete().eq('id', booking.id);
        console.log('🧹 Test booking cleaned up');
      }
    } else {
      console.log('❌ No rooms available for testing');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testRooms();
