import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
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
import SignInScreen from './screens/SignInScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
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

  // Added safety check
  if (!user) {
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

  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#FFFFFF' } }}
    >
      {user?.isFirstTimeUser ? (
        <AppStack.Screen
          name="Onboarding"
          component={WrappedOnboardingScreen}
          options={{ gestureEnabled: false }} // Prevent back gestures during onboarding
        />
      ) : (
        <>
          <AppStack.Screen name="Home" component={WrappedHomeScreen} />
          <AppStack.Screen name="BookRoom" component={WrappedBookRoomScreen} />
          <AppStack.Screen name="Parking" component={WrappedParkingScreen} />
          <AppStack.Screen name="Attendance" component={WrappedAttendanceScreen} />
          <AppStack.Screen name="AdminDashboard" component={WrappedAdminDashboardScreen} />
          <AppStack.Screen name="Chatbot" component={WrappedChatbotScreen} />
          <AppStack.Screen name="Profile" component={WrappedProfileScreen} />
          <AppStack.Screen name="NotificationSettings" component={WrappedNotificationSettingsScreen} />
        </>
      )}
    </AppStack.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useContext(AuthContext);

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

  // Add some debugging
  useEffect(() => {
    console.log('Auth state changed:', { user: user ? 'Logged in' : 'Not logged in', loading });
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
      </View>
    );
  }

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
    <SafeAreaProvider style={styles.container}>
      <AuthProvider>
        <NotificationProvider>
          <Toaster richColors closeButton />
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    userSelect: "none"
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
  }
});