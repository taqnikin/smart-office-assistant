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
  const { user, completeOnboarding } = useContext(AuthContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Debug logging
  useEffect(() => {
    console.log('OnboardingScreen - User:', user ? 'Logged in' : 'Not logged in');
    console.log('OnboardingScreen - User details:', {
      id: user?.id,
      email: user?.email,
      isFirstTimeUser: user?.isFirstTimeUser,
      hasEmployeeDetails: !!user?.employeeDetails
    });
  }, [user]);
  
  // Animation values
  const buttonScale = useSharedValue(0.8);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Access employee details or provide defaults
  const employeeDetails = user?.employeeDetails || {
    fullName: user?.email?.split('@')[0] || 'New Employee',
    employeeId: 'Not assigned yet',
    dateOfJoining: new Date().toISOString().split('T')[0],
    workHours: '9:00 AM - 6:00 PM',
    workMode: 'in-office'
  } as EmployeeDetails;

  // Format date of joining to be more readable
  const formattedJoiningDate = (() => {
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

  // Handle the onboarding conversation flow
  useEffect(() => {
    // Initial welcome message
    if (onboardingStep === 0) {
      setTimeout(() => {
        addMessage(`Hi ${employeeDetails.fullName}! 👋 Welcome to Smart Office! I'm your virtual assistant and I'll be helping you get started.`, true);
        
        setTimeout(() => {
          setOnboardingStep(1);
        }, 1500);
      }, 1000);
    } 
    // Employee details introduction
    else if (onboardingStep === 1) {
      setTimeout(() => {
        addMessage("Let me share some information about your account:", true);
        
        setTimeout(() => {
          setOnboardingStep(2);
        }, 1500);
      }, 1000);
    } 
    // Show employee name
    else if (onboardingStep === 2) {
      setTimeout(() => {
        addMessage(`Your full name: **${employeeDetails.fullName}**`, true);
        
        setTimeout(() => {
          setOnboardingStep(3);
        }, 1500);
      }, 1000);
    } 
    // Show employee ID
    else if (onboardingStep === 3) {
      setTimeout(() => {
        addMessage(`Your employee ID: **${employeeDetails.employeeId}**`, true);
        
        setTimeout(() => {
          setOnboardingStep(4);
        }, 1500);
      }, 1000);
    } 
    // Show joining date
    else if (onboardingStep === 4) {
      setTimeout(() => {
        addMessage(`Your joining date: **${formattedJoiningDate}**`, true);
        
        setTimeout(() => {
          setOnboardingStep(5);
        }, 1500);
      }, 1000);
    } 
    // Show work hours
    else if (onboardingStep === 5) {
      setTimeout(() => {
        addMessage(`Your work hours: **${employeeDetails.workHours}**`, true);
        
        setTimeout(() => {
          setOnboardingStep(6);
        }, 1500);
      }, 1000);
    } 
    // Show work mode
    else if (onboardingStep === 6) {
      setTimeout(() => {
        const workModeText = {
          'in-office': 'In-office',
          'wfh': 'Work from Home',
          'hybrid': 'Hybrid (Mix of office and remote)'
        }[employeeDetails.workMode];
        
        addMessage(`Your work mode: **${workModeText}**`, true);
        
        setTimeout(() => {
          setOnboardingStep(7);
        }, 1500);
      }, 1000);
    } 
    // Features intro
    else if (onboardingStep === 7) {
      setTimeout(() => {
        addMessage("Now, let me show you what you can do with the Smart Office app:", true);
        
        setTimeout(() => {
          setOnboardingStep(8);
        }, 1500);
      }, 1000);
    } 
    // Room booking feature
    else if (onboardingStep === 8) {
      setTimeout(() => {
        addMessage("🏢 **Book Meeting Rooms** - You can easily reserve meeting spaces for your team discussions", true);
        
        setTimeout(() => {
          setOnboardingStep(9);
        }, 1500);
      }, 1000);
    } 
    // Parking feature
    else if (onboardingStep === 9) {
      setTimeout(() => {
        addMessage("🚗 **Reserve Parking** - Find and book available parking spots for your vehicle", true);
        
        setTimeout(() => {
          setOnboardingStep(10);
        }, 1500);
      }, 1000);
    } 
    // Attendance feature
    else if (onboardingStep === 10) {
      setTimeout(() => {
        addMessage("📝 **Mark Attendance** - Check-in and check-out with flexible work options", true);
        
        setTimeout(() => {
          setOnboardingStep(11);
        }, 1500);
      }, 1000);
    } 
    // Chat assistance
    else if (onboardingStep === 11) {
      setTimeout(() => {
        addMessage("🤖 **Voice Assistant** - Ask me questions anytime by using the chat feature", true);
        
        setTimeout(() => {
          setOnboardingStep(12);
        }, 1500);
      }, 1000);
    } 
    // Profile information
    else if (onboardingStep === 12) {
      setTimeout(() => {
        addMessage("👤 **Profile** - View and manage your account details", true);
        
        setTimeout(() => {
          setOnboardingStep(13);
        }, 1500);
      }, 1000);
    } 
    // Completion message
    else if (onboardingStep === 13) {
      setTimeout(() => {
        addMessage("Do you have any questions before we continue to the app?", true);
        
        // Animate button using withTiming (supported by current version)
        buttonScale.value = withDelay(300, withTiming(1, { duration: 600 }));

        // Use React Native Animated for profile card, but disable native driver
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false, // Changed to false to avoid native driver warning
        }).start();
        
        setIsCompleted(true);
      }, 1000);
    }
  }, [onboardingStep, employeeDetails]);

  const addMessage = (text: string, isBot: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const handleQuickResponse = (response: string) => {
    // Add user response to chat
    addMessage(response, false);
    
    // Based on response, show appropriate follow-up
    if (response === "Yes, I have questions") {
      setTimeout(() => {
        addMessage("Feel free to ask me anything once we get to the app. I'll be available through the Voice Assistant icon on the home screen.", true);
        
        setTimeout(() => {
          addMessage("Ready to explore the app now?", true);
        }, 2000);
      }, 1000);
    } else {
      setTimeout(() => {
        addMessage("Great! Let's get you started with the app. Click the button below to continue.", true);
      }, 1000);
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

  // Safety check for user
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome Onboarding</Text>
        </View>
        <View style={[styles.messagesContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading your profile...</Text>
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
        {messages.map(message => (
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

        {/* Employee Profile Card - Only shown when onboarding is complete */}
        {isCompleted && (
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
      
      {/* Quick Response Buttons - Only shown when asking for questions */}
      {isCompleted && messages.length > 0 && 
       messages[messages.length-1].isBot && 
       messages[messages.length-1].text.includes("Do you have any questions") && (
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleQuickResponse("Yes, I have questions")}>
            <Text style={styles.quickActionText}>Yes, I have questions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.primaryButton]}
            onPress={() => handleQuickResponse("No, I'm ready to explore")}>
            <Text style={styles.quickActionText}>No, I'm ready to explore</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Continue Button - Only shown at the end of onboarding */}
      {isCompleted && messages.length > 0 && 
       messages[messages.length-1].isBot && 
       (messages[messages.length-1].text.includes("Let's get you started") || 
        messages[messages.length-1].text.includes("Ready to explore")) && (
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
});

export default OnboardingScreen;