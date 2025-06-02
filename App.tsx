import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';
import HomeScreen from './screens/HomeScreen';
import BookRoomScreen from './screens/BookRoomScreen';
import ParkingScreen from './screens/ParkingScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { AuthProvider, AuthContext } from './AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppNotificationProvider } from './contexts/AppNotificationContext';
import { NotificationManager } from './components/NotificationManager';
import SignInScreen from './screens/SignInScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import BookingManagementScreen from './screens/BookingManagementScreen';
import QRCodeDemoScreen from './screens/QRCodeDemoScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import QRCodeDisplayScreen from './screens/QRCodeDisplayScreen';
import ErrorBoundary, { ScreenErrorBoundary } from './components/ErrorBoundary';
import { errorLogger } from './services/ErrorLoggingService';

// Define parameter types for the root stack
export type RootStackParamList = {
  Home: undefined;
  BookRoom: undefined;
  Parking: undefined;
  Attendance: undefined;
  AdminDashboard: undefined;
  Chatbot: undefined;
  Profile: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  NotificationSettings: undefined;
  BookingManagement: undefined;
  QRCodeDemo: undefined;
  QRScanner: {
    fromDemo?: boolean;
    demoMode?: boolean;
  };
  QRCodeDisplay: undefined;
};

// Auth stack for unauthenticated users
const AuthStack = createNativeStackNavigator<{ SignIn: undefined }>();
function AuthStackNavigator() {
  const WrappedSignInScreen = () => (
    <ScreenErrorBoundary>
      <SignInScreen />
    </ScreenErrorBoundary>
  );

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={WrappedSignInScreen} />
    </AuthStack.Navigator>
  );
}

// App stack for authenticated users
const AppStack = createNativeStackNavigator<RootStackParamList>();
function AppStackNavigator() {
  const { user } = useContext(AuthContext);

  console.log('🧭 AppStackNavigator: Rendering with user:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    isFirstTimeUser: user?.isFirstTimeUser,
    role: user?.role
  });

  // Added safety check
  if (!user) {
    console.log('🚫 AppStackNavigator: No user found, returning AuthStackNavigator');
    return <AuthStackNavigator />;
  }

  // Wrap components with ScreenErrorBoundary
  const WrappedOnboardingScreen = () => (
    <ScreenErrorBoundary>
      <OnboardingScreen />
    </ScreenErrorBoundary>
  );

  const WrappedHomeScreen = () => (
    <ScreenErrorBoundary>
      <HomeScreen />
    </ScreenErrorBoundary>
  );

  const WrappedBookRoomScreen = () => (
    <ScreenErrorBoundary>
      <BookRoomScreen />
    </ScreenErrorBoundary>
  );

  const WrappedParkingScreen = () => (
    <ScreenErrorBoundary>
      <ParkingScreen />
    </ScreenErrorBoundary>
  );

  const WrappedAttendanceScreen = () => (
    <ScreenErrorBoundary>
      <AttendanceScreen />
    </ScreenErrorBoundary>
  );

  const WrappedAdminDashboardScreen = () => (
    <ScreenErrorBoundary>
      <AdminDashboardScreen />
    </ScreenErrorBoundary>
  );

  const WrappedChatbotScreen = () => (
    <ScreenErrorBoundary>
      <ChatbotScreen />
    </ScreenErrorBoundary>
  );

  const WrappedProfileScreen = () => (
    <ScreenErrorBoundary>
      <ProfileScreen />
    </ScreenErrorBoundary>
  );

  const WrappedNotificationSettingsScreen = () => (
    <ScreenErrorBoundary>
      <NotificationSettingsScreen />
    </ScreenErrorBoundary>
  );

  const WrappedBookingManagementScreen = () => (
    <ScreenErrorBoundary>
      <BookingManagementScreen />
    </ScreenErrorBoundary>
  );

  const WrappedQRCodeDemoScreen = () => (
    <ScreenErrorBoundary>
      <QRCodeDemoScreen />
    </ScreenErrorBoundary>
  );

  const WrappedQRScannerScreen = () => (
    <ScreenErrorBoundary>
      <QRScannerScreen />
    </ScreenErrorBoundary>
  );

  const WrappedQRCodeDisplayScreen = () => (
    <ScreenErrorBoundary>
      <QRCodeDisplayScreen />
    </ScreenErrorBoundary>
  );

  const initialRoute = user?.isFirstTimeUser ? "Onboarding" : "Home";
  console.log('🎯 AppStackNavigator: Initial route determined:', {
    initialRoute,
    isFirstTimeUser: user?.isFirstTimeUser,
    userEmail: user?.email
  });

  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFFFF' } }}
      initialRouteName={initialRoute}
    >
      <AppStack.Screen
        name="Onboarding"
        component={WrappedOnboardingScreen}
        options={{ gestureEnabled: false }} // Prevent back gestures during onboarding
      />
      <AppStack.Screen name="Home" component={WrappedHomeScreen} />
      <AppStack.Screen name="BookRoom" component={WrappedBookRoomScreen} />
      <AppStack.Screen name="Parking" component={WrappedParkingScreen} />
      <AppStack.Screen name="Attendance" component={WrappedAttendanceScreen} />
      <AppStack.Screen name="AdminDashboard" component={WrappedAdminDashboardScreen} />
      <AppStack.Screen name="Chatbot" component={WrappedChatbotScreen} />
      <AppStack.Screen name="Profile" component={WrappedProfileScreen} />
      <AppStack.Screen name="NotificationSettings" component={WrappedNotificationSettingsScreen} />
      <AppStack.Screen name="BookingManagement" component={WrappedBookingManagementScreen} />
      <AppStack.Screen name="QRCodeDemo" component={WrappedQRCodeDemoScreen} />
      <AppStack.Screen name="QRScanner" component={WrappedQRScannerScreen} />
      <AppStack.Screen name="QRCodeDisplay" component={WrappedQRCodeDisplayScreen} />
    </AppStack.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useContext(AuthContext);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Initialize error logging service
  useEffect(() => {
    const initializeErrorLogging = async () => {
      try {
        await errorLogger.initialize();
      } catch (error) {
        console.error('Failed to initialize error logging:', error);
      }
    };

    initializeErrorLogging();
  }, []);

  // Add loading timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      console.log('⏰ AppContent: Starting loading timeout (15s)');
      const timeout = setTimeout(() => {
        console.warn('⚠️ AppContent: Loading timeout reached - forcing app to continue');
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout

      return () => {
        clearTimeout(timeout);
        setLoadingTimeout(false);
      };
    }
  }, [loading]);

  // Add some debugging
  useEffect(() => {
    console.log('🏠 AppContent: Auth state changed:', {
      user: user ? 'Logged in' : 'Not logged in',
      loading,
      loadingTimeout,
      userEmail: user?.email,
      isFirstTimeUser: user?.isFirstTimeUser
    });
  }, [user, loading, loadingTimeout]);

  console.log('🏠 AppContent: Rendering with state:', {
    loading,
    loadingTimeout,
    hasUser: !!user,
    userEmail: user?.email,
    isFirstTimeUser: user?.isFirstTimeUser
  });

  // Show loading screen unless timeout is reached
  if (loading && !loadingTimeout) {
    console.log('⏳ AppContent: Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
        <Text style={styles.loadingSubText}>
          This should only take a few seconds
        </Text>
      </View>
    );
  }

  // If loading timeout is reached, show error message and continue
  if (loadingTimeout) {
    console.warn('⚠️ AppContent: Loading timeout - showing fallback UI');
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: '#FF6B6B' }]}>
          Loading is taking longer than expected
        </Text>
        <Text style={styles.loadingSubText}>
          Continuing with limited functionality...
        </Text>
        <ErrorBoundary>
          <NavigationContainer>
            <AuthStackNavigator />
          </NavigationContainer>
        </ErrorBoundary>
      </View>
    );
  }

  console.log('🚀 AppContent: Loading complete, rendering navigation');

  return (
    <ErrorBoundary>
      <NavigationContainer>
        {!user ? <AuthStackNavigator /> : <AppStackNavigator />}
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider style={styles.container}>
        <AuthProvider>
          <NotificationProvider>
            <AppNotificationProvider>
              <Toaster richColors closeButton />
              <AppContent />
              <NotificationManager />
            </AppNotificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});