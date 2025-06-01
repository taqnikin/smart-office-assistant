# Smart Office Assistant - Application Testing Guide

## 🚀 Application Status
- **Development Server**: Running on http://localhost:8081
- **Platform**: React Native Web (Expo)
- **Database**: Supabase (tables created via migrations)

## 🧪 Manual Testing Checklist

### 1. Authentication Flow
- [ ] **Sign In Screen**: Should appear when app loads
- [ ] **Mock User Login**: Test with demo credentials
  - Email: `demo@smartoffice.com`
  - Password: `demo123`
- [ ] **Admin Login**: Test admin access
  - Email: `admin@smartoffice.com` 
  - Password: `admin123`

### 2. Home Screen Features
- [ ] **Welcome Message**: Shows user name and current date
- [ ] **Quick Access Cards**: 
  - Book Room
  - Parking
  - Attendance
  - Admin Dashboard (if admin user)
- [ ] **Navigation**: All buttons should navigate to respective screens
- [ ] **Voice Assistant Button**: Should navigate to chatbot

### 3. Room Booking System
- [ ] **Room List**: Should display available rooms
- [ ] **Room Details**: Show capacity, amenities (AV, whiteboard, teleconference)
- [ ] **Booking Form**: 
  - Date picker
  - Time selection
  - Duration input
  - Purpose field
- [ ] **Booking Confirmation**: Success message and booking details

### 4. Parking Management
- [ ] **Parking Overview**: Show available spots by type (Car/Bike)
- [ ] **Spot Selection**: Visual parking layout
- [ ] **Reservation**: Book parking spot for specific date
- [ ] **Current Reservations**: Show user's active bookings

### 5. Attendance Tracking
- [ ] **Check-in/Check-out**: Toggle attendance status
- [ ] **Status Selection**: Office, WFH, Leave options
- [ ] **Transport Mode**: Car, Bike, Public Transport, Walk
- [ ] **Attendance History**: Previous records display

### 6. Admin Dashboard (Admin Users Only)
- [ ] **User Management**: List of all users
- [ ] **Attendance Overview**: Daily/weekly summaries
- [ ] **Room Utilization**: Booking statistics
- [ ] **Parking Analytics**: Usage patterns
- [ ] **System Settings**: Configuration options

### 7. AI Chatbot
- [ ] **Chat Interface**: Message input and display
- [ ] **Bot Responses**: Simulated AI responses
- [ ] **Voice Input**: Microphone button (UI only)
- [ ] **Chat History**: Previous conversations

### 8. User Profile
- [ ] **Personal Information**: Display user details
- [ ] **Employee Details**: Work info, department, etc.
- [ ] **Preferences**: Vehicle type, reminders
- [ ] **Settings**: Notification preferences
- [ ] **Sign Out**: Logout functionality

### 9. Onboarding Flow (First-time Users)
- [ ] **Welcome Screen**: Introduction to app
- [ ] **Employee Details Form**: Personal information input
- [ ] **Preferences Setup**: Vehicle and notification settings
- [ ] **Completion**: Navigate to main app

## 🔧 Technical Testing

### Performance
- [ ] **Loading Times**: App loads within 3 seconds
- [ ] **Navigation**: Smooth transitions between screens
- [ ] **Responsive Design**: Works on different screen sizes
- [ ] **Memory Usage**: No significant memory leaks

### Error Handling
- [ ] **Network Errors**: Graceful handling of connection issues
- [ ] **Form Validation**: Proper error messages for invalid inputs
- [ ] **Authentication Errors**: Clear error messages for login failures
- [ ] **Toast Notifications**: Success/error feedback to users

### Data Persistence
- [ ] **Local Storage**: User preferences saved locally
- [ ] **Session Management**: User stays logged in on refresh
- [ ] **Form State**: Input values preserved during navigation

## 🐛 Known Issues to Test

1. **Database Connection**: Tables may not be accessible due to RLS policies
2. **Version Compatibility**: Some packages have version mismatches
3. **Web Platform**: Some React Native features may not work on web
4. **Mock Data**: App currently uses mock data instead of real database

## 📊 Test Results Template

### Authentication: ✅ / ❌
- Sign in: 
- Mock users: 
- Session persistence: 

### Navigation: ✅ / ❌
- Home screen: 
- All screens accessible: 
- Back navigation: 

### Core Features: ✅ / ❌
- Room booking: 
- Parking management: 
- Attendance tracking: 
- Admin dashboard: 

### UI/UX: ✅ / ❌
- Responsive design: 
- Loading states: 
- Error handling: 
- Toast notifications: 

## 🎯 Success Criteria

The application is considered successfully running if:
1. ✅ Development server starts without errors
2. ✅ App loads in browser
3. ✅ Authentication flow works with mock users
4. ✅ All main screens are accessible
5. ✅ Core functionality works (even with mock data)
6. ✅ UI is responsive and user-friendly

## 📝 Next Steps

After manual testing:
1. **Fix Database Issues**: Resolve table access problems
2. **Replace Mock Data**: Connect to real Supabase data
3. **Add Real Authentication**: Implement Supabase Auth
4. **Performance Optimization**: Address any performance issues
5. **Mobile Testing**: Test on actual mobile devices
6. **Production Deployment**: Prepare for production release
