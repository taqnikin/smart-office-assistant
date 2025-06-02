import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext, EmployeeDetails } from '../AuthContext';
import { RootStackParamList } from '../App';
import { webhookOnboardingService, type OnboardingState } from '../services/WebhookOnboardingService';
// Removed date-fns import - using native Date methods instead

// Message type definition
interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { user, completeOnboarding, updateUserPreferences } = useContext(AuthContext);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    messages: [],
    isCompleted: false,
    quickActions: [],
    nextSteps: [],
    currentStep: 0
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize webhook-based onboarding
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (!user) {
        console.log('OnboardingScreen: No user available, waiting...');
        return;
      }

      console.log('OnboardingScreen: Initializing webhook-based onboarding for user:', user.id);
      setIsInitializing(true);

      try {
        // Subscribe to onboarding state changes
        const unsubscribe = webhookOnboardingService.subscribe((state) => {
          console.log('OnboardingScreen: Received onboarding state update:', state);
          setOnboardingState(state);
        });

        // Initialize onboarding with webhook
        await webhookOnboardingService.initializeOnboarding(
          user.id,
          user.employeeDetails
        );

        setIsInitializing(false);

        // Cleanup subscription on unmount
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('OnboardingScreen: Error initializing onboarding:', error);
        setIsInitializing(false);
      }
    };

    initializeOnboarding();
  }, [user]);
  
  // Animation values
  const buttonScale = useSharedValue(0.8);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && onboardingState.messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [onboardingState.messages]);

  // Access employee details - if missing, we'll handle it in the flow
  const employeeDetails = user?.employeeDetails;
  const hasEmployeeDetails = !!employeeDetails;

  // Format date of joining to be more readable
  const formattedJoiningDate = (() => {
    if (!employeeDetails?.dateOfJoining) return 'Not available';
    try {
      const date = new Date(employeeDetails.dateOfJoining);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return employeeDetails.dateOfJoining;
    }
  })();

  // Animation effect when onboarding is completed
  useEffect(() => {
    if (onboardingState.isCompleted) {
      // Animate button using withTiming
      buttonScale.value = withDelay(300, withTiming(1, { duration: 600 }));

      // Use React Native Animated for profile card
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [onboardingState.isCompleted]);

  // Handle quick action responses from webhook
  const handleQuickAction = async (action: string) => {
    try {
      console.log('OnboardingScreen: Handling quick action:', action);
      await webhookOnboardingService.handleUserResponse(
        action,
        user?.id,
        user?.employeeDetails
      );
    } catch (error) {
      console.error('OnboardingScreen: Error handling quick action:', error);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      console.log('Completing onboarding...');
      console.log('User before onboarding completion:', user);

      await completeOnboarding();

      console.log('Onboarding completed successfully, navigating to Home...');

      // Use replace instead of reset to ensure proper navigation
      navigation.replace('Home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Show an error message to the user
      addMessage("Sorry, there was an error completing your onboarding. Please try again.", true);
    }
  };

  // Animated style for the continue button
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Get work mode icon
  const getWorkModeIcon = () => {
    if (!employeeDetails?.workMode) return 'help-outline';
    switch (employeeDetails.workMode) {
      case 'in-office':
        return 'business-outline';
      case 'wfh':
        return 'home-outline';
      case 'hybrid':
        return 'git-branch-outline';
      default:
        return 'business-outline';
    }
  };

  // Format work mode text
  const getWorkModeText = () => {
    if (!employeeDetails?.workMode) return 'Not specified';
    switch (employeeDetails.workMode) {
      case 'in-office':
        return 'In-office';
      case 'wfh':
        return 'Work from Home';
      case 'hybrid':
        return 'Hybrid';
      default:
        return 'Not specified';
    }
  };

  // Safety check for user and loading state
  if (!user || isInitializing) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome Onboarding</Text>
        </View>
        <View style={[styles.messagesContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: '#666' }}>
            {!user ? 'Loading your profile...' : 'Initializing onboarding...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Onboarding</Text>
      </View>
      
      {/* Chat Messages */}
      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContent}>
        {onboardingState.messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isBot ? styles.botBubble : styles.userBubble
            ]}>
            {message.isBot && (
              <View style={styles.botIconContainer}>
                <Ionicons name="cube-outline" size={18} color="#4A80F0" />
              </View>
            )}
            <View style={[
              styles.messageContent,
              message.isBot ? styles.botContent : styles.userContent
            ]}>
              <Text style={[
                styles.messageText,
                message.isBot ? styles.botText : styles.userText
              ]}>
                {message.text.replace(/\*\*(.*?)\*\*/g, '$1')}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          </View>
        ))}

        {/* Employee Profile Card - Only shown when onboarding is complete and has employee details */}
        {onboardingState.isCompleted && hasEmployeeDetails && (
          <View style={[styles.profileCardContainer, { opacity: fadeAnim }]}>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Text style={styles.profileTitle}>Employee Profile</Text>
              </View>

              <View style={styles.profileContent}>
                <View style={styles.profileRow}>
                  <Ionicons name="person-outline" size={20} color="#4A80F0" />
                  <Text style={styles.profileLabel}>Name:</Text>
                  <Text style={styles.profileValue}>{employeeDetails.fullName}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Ionicons name="card-outline" size={20} color="#4A80F0" />
                  <Text style={styles.profileLabel}>ID:</Text>
                  <Text style={styles.profileValue}>{employeeDetails.employeeId}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Ionicons name="calendar-outline" size={20} color="#4A80F0" />
                  <Text style={styles.profileLabel}>Joined:</Text>
                  <Text style={styles.profileValue}>{formattedJoiningDate}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Ionicons name="time-outline" size={20} color="#4A80F0" />
                  <Text style={styles.profileLabel}>Hours:</Text>
                  <Text style={styles.profileValue}>{employeeDetails.workHours}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Ionicons name={getWorkModeIcon()} size={20} color="#4A80F0" />
                  <Text style={styles.profileLabel}>Mode:</Text>
                  <Text style={styles.profileValue}>{getWorkModeText()}</Text>
                </View>


              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Action Buttons from Webhook */}
      {onboardingState.quickActions.length > 0 && (
        <View style={styles.quickActions}>
          {onboardingState.quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionButton, index === 0 ? styles.primaryButton : null]}
              onPress={() => handleQuickAction(action)}>
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Continue Button - Only shown when onboarding is completed */}
      {onboardingState.isCompleted && onboardingState.messages.length > 0 && (
        <Animated.View
          style={[styles.continueButtonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleCompleteOnboarding}>
            <Text style={styles.continueButtonText}>Continue to App</Text>
            <Ionicons name="arrow-forward" size={22} color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4A80F0',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingTop: 20,
    paddingBottom: 120, // Extra padding at bottom for profile card
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '85%',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6EFFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageContent: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  botContent: {
    backgroundColor: '#E6EFFE',
  },
  userContent: {
    backgroundColor: '#4A80F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botText: {
    color: '#333',
  },
  userText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f0f2f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickActionButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 5,
    minWidth: 150,
    alignItems: 'center',
  },
  quickActionText: {
    color: 'white',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  secondaryButtonText: {
    color: '#4A80F0',
    fontWeight: '500',
  },
  profileCardContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  profileHeader: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  profileTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContent: {
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    marginLeft: 10,
    width: 60,
  },
  profileValue: {
    fontSize: 15,
    color: '#333',
    marginLeft: 5,
    flex: 1,
  },
  continueButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 10,
  },
  vehicleSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    width: '100%',
  },
  vehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
    marginVertical: 5,
    minWidth: 140,
    justifyContent: 'center',
  },
  vehicleButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  carButton: {
    backgroundColor: '#FF6B6B',
  },
  bikeButton: {
    backgroundColor: '#4ECDC4',
  },
  publicTransportButton: {
    backgroundColor: '#45B7D1',
  },
  walkButton: {
    backgroundColor: '#96CEB4',
  },
});

export default OnboardingScreen;