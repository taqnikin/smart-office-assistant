# 🏢 Smart Office Assistant

> A comprehensive React Native mobile application for streamlined office management and enhanced employee workflows.

[![React Native](https://img.shields.io/badge/React%20Native-0.76.9-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52.0.42-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

## 📋 Overview

Smart Office Assistant is a **production-ready** mobile application that consolidates office management functions into a single, intuitive platform. It addresses the challenges of fragmented office systems by providing unified access to room bookings, parking reservations, attendance tracking, and AI-powered assistance.

### ✨ Key Features

- 🔐 **Secure Authentication** - Role-based access with Supabase Auth
- 🏢 **Room Booking System** - Real-time availability with conflict prevention
- 🚗 **Smart Parking Management** - Interactive map with multi-vehicle support
- 📊 **GPS Attendance Tracking** - Location-verified check-in/out with work modes
- 🤖 **AI Chatbot Assistant** - Intelligent help with natural language processing
- 👨‍💼 **Admin Dashboard** - Analytics, user management, and data export
- 📱 **Push Notifications** - Real-time updates and reminders
- 🌐 **Cross-Platform** - iOS and Android support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smart-office-assistant.git
cd smart-office-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials to .env

# Seed the database
npm run db:seed:all

# Start the development server
npm start
```

### Available Scripts

```bash
npm start          # Start Expo development server
npm run web        # Run in web browser
npm run android    # Run on Android
npm run ios        # Run on iOS
npm test           # Run tests
npm run build      # Build for production
```

## 🧪 Testing

### Test Credentials

**Admin Account:**
- Email: `admin@smartoffice.com`
- Password: `AdminPass123!`

**Regular User:**
- Email: `sarah.johnson@smartoffice.com`
- Password: `UserPass123!`

### Core Feature Testing

1. **Authentication** - Login/logout with role-based access
2. **Room Booking** - Interactive booking with real-time availability
3. **Parking System** - Visual map interface with spot reservations
4. **Attendance** - GPS-verified check-in with work mode selection
5. **AI Assistant** - Natural language queries with quick actions
6. **Admin Dashboard** - Analytics, user management, data export

## 🛠 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React Native, Expo, TypeScript, React Navigation |
| **Backend** | Supabase, PostgreSQL, Row Level Security |
| **Features** | Location Services, Push Notifications, Camera/Barcode |
| **Security** | JWT Authentication, Input Validation, Rate Limiting |
| **Testing** | Jest, React Native Testing Library |

## 📱 Screenshots

| Home Dashboard | Room Booking | Parking Map | Admin Analytics |
|---------------|--------------|-------------|-----------------|
| ![Home](./screenshots/home.png) | ![Rooms](./screenshots/rooms.png) | ![Parking](./screenshots/parking.png) | ![Admin](./screenshots/admin.png) |

## 🏗 Architecture

```
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and external services
│   ├── utils/              # Helper functions
│   ├── types/              # TypeScript type definitions
│   └── constants/          # App constants
├── assets/                 # Images, fonts, icons
└── __tests__/             # Test files
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Input Validation** - XSS and injection protection
- **Rate Limiting** - Brute force attack prevention
- **Secure Storage** - Encrypted credential storage
- **Location Privacy** - GPS data handled securely

## 📊 Production Ready Features

- ✅ **Complete Feature Set** - 85/85 features implemented
- ✅ **Security Hardened** - Production-grade security measures
- ✅ **Performance Optimized** - <500ms response times
- ✅ **Error Handling** - Comprehensive error boundaries
- ✅ **Real-time Sync** - Live data updates across devices
- ✅ **Cross-Platform** - iOS and Android compatibility

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure code passes ESLint and Prettier
- Test on both iOS and Android

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/your-username/smart-office-assistant/issues)
- 💬 [Discussions](https://github.com/your-username/smart-office-assistant/discussions)

## 🏆 Acknowledgments

- [React Native](https://reactnative.dev/) - Mobile framework
- [Expo](https://expo.dev/) - Development platform
- [Supabase](https://supabase.com/) - Backend services
- [React Navigation](https://reactnavigation.org/) - Navigation library

---

**Built with ❤️ by the Smart Office Team**

⭐ **Star this repo if you find it helpful!**