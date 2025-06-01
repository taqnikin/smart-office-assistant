# Smart Office Assistant - Database Schema Design

## Overview
This document defines the complete database schema for the Smart Office Assistant application using Supabase (PostgreSQL). The schema supports user management, room booking, parking management, attendance tracking, and administrative features.

---

## 🗄️ Database Tables

### 1. Users Table (`users`)
**Purpose:** Core user authentication and profile information
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_first_time_user BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Employee Details Table (`employee_details`)
**Purpose:** Extended employee information and work details
```sql
CREATE TABLE employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  date_of_joining DATE NOT NULL,
  work_hours VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
  work_mode VARCHAR(20) DEFAULT 'hybrid' CHECK (work_mode IN ('in-office', 'wfh', 'hybrid')),
  department VARCHAR(100),
  position VARCHAR(100),
  phone_number VARCHAR(20),
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. User Preferences Table (`user_preferences`)
**Purpose:** User settings and notification preferences
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('Car', 'Bike', 'None')),
  vehicle_registration VARCHAR(20),
  checkin_reminder BOOLEAN DEFAULT true,
  checkin_reminder_time INTEGER DEFAULT 30, -- minutes before
  occupancy_reminder BOOLEAN DEFAULT true,
  occupancy_threshold INTEGER DEFAULT 80, -- percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Rooms Table (`rooms`)
**Purpose:** Meeting room information and amenities
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  capacity INTEGER NOT NULL,
  has_av BOOLEAN DEFAULT false,
  has_whiteboard BOOLEAN DEFAULT false,
  has_teleconference BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Room Bookings Table (`room_bookings`)
**Purpose:** Room reservation records
```sql
CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent overlapping bookings
  CONSTRAINT no_overlap EXCLUDE USING gist (
    room_id WITH =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp
    ) WITH &&
  ) WHERE (status = 'confirmed')
);
```

### 6. Parking Spots Table (`parking_spots`)
**Purpose:** Physical parking space inventory
```sql
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_number INTEGER NOT NULL,
  spot_type VARCHAR(10) NOT NULL CHECK (spot_type IN ('car', 'bike')),
  floor VARCHAR(10),
  section VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(spot_number, spot_type)
);
```

### 7. Parking Reservations Table (`parking_reservations`)
**Purpose:** Parking spot bookings and assignments
```sql
CREATE TABLE parking_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parking_spot_id UUID REFERENCES parking_spots(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME DEFAULT '00:00:00',
  end_time TIME DEFAULT '23:59:59',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One active reservation per user per day
  UNIQUE(user_id, reservation_date) WHERE (status = 'active')
);
```

### 8. Attendance Records Table (`attendance_records`)
**Purpose:** Daily attendance tracking
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('office', 'wfh', 'leave')),
  check_in_time TIME,
  check_out_time TIME,
  transport_mode VARCHAR(20) CHECK (transport_mode IN ('car', 'bike', 'public', 'walk')),
  leave_reason TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One record per user per day
  UNIQUE(user_id, attendance_date)
);
```

### 9. Chat Messages Table (`chat_messages`)
**Purpose:** Chatbot conversation history
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_bot_message BOOLEAN DEFAULT false,
  intent VARCHAR(50),
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. System Settings Table (`system_settings`)
**Purpose:** Application-wide configuration
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔗 Relationships & Constraints

### Primary Relationships
1. **users** → **employee_details** (1:1)
2. **users** → **user_preferences** (1:1)
3. **users** → **room_bookings** (1:many)
4. **users** → **parking_reservations** (1:many)
5. **users** → **attendance_records** (1:many)
6. **users** → **chat_messages** (1:many)
7. **rooms** → **room_bookings** (1:many)
8. **parking_spots** → **parking_reservations** (1:many)

### Business Rules Enforced
- No overlapping room bookings for the same room
- One active parking reservation per user per day
- One attendance record per user per day
- Unique employee IDs across the organization
- Unique parking spot numbers within each type

---

## 📊 Indexes for Performance

```sql
-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_employee_details_employee_id ON employee_details(employee_id);

-- Booking and reservation indexes
CREATE INDEX idx_room_bookings_date_room ON room_bookings(booking_date, room_id);
CREATE INDEX idx_room_bookings_user_date ON room_bookings(user_id, booking_date);
CREATE INDEX idx_parking_reservations_date ON parking_reservations(reservation_date);
CREATE INDEX idx_parking_reservations_user_date ON parking_reservations(user_id, reservation_date);

-- Attendance tracking indexes
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, attendance_date);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);

-- Chat history indexes
CREATE INDEX idx_chat_messages_user_created ON chat_messages(user_id, created_at);
```

---

## 🔒 Row Level Security (RLS) Policies

### Users can only access their own data
```sql
-- Enable RLS on all tables
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- User data access policies
CREATE POLICY "Users can view own employee details" ON employee_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own employee details" ON employee_details
  FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for other user-specific tables...
```

### Admin access policies
```sql
-- Admins can view all data
CREATE POLICY "Admins can view all room bookings" ON room_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🚀 Initial Data Setup

### Sample Rooms Data
```sql
INSERT INTO rooms (name, floor, capacity, has_av, has_whiteboard, has_teleconference) VALUES
('Falcon', '3rd', 8, true, true, true),
('Eagle', '2nd', 12, true, true, true),
('Hawk', '2nd', 6, true, false, false),
('Sparrow', '1st', 4, false, true, false),
('Condor', '4th', 20, true, true, true);
```

### Sample Parking Spots Data
```sql
-- Car parking spots (1-50)
INSERT INTO parking_spots (spot_number, spot_type, floor, section)
SELECT generate_series(1, 50), 'car', 'Ground', 'A';

-- Bike parking spots (1-40)
INSERT INTO parking_spots (spot_number, spot_type, floor, section)
SELECT generate_series(1, 40), 'bike', 'Ground', 'B';
```

### System Settings
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('office_hours_start', '08:00', 'string', 'Office opening time'),
('office_hours_end', '18:00', 'string', 'Office closing time'),
('max_booking_duration', '8', 'number', 'Maximum room booking duration in hours'),
('advance_booking_days', '30', 'number', 'How many days in advance bookings are allowed');
```

---

**Next Steps:**
1. Create migration scripts for Supabase
2. Set up API endpoints for CRUD operations
3. Implement real-time subscriptions
4. Add data validation functions
5. Create backup and maintenance procedures
