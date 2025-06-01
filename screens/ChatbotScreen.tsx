import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { toast } from 'sonner-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

// Message type definition
interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

type ChatbotScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chatbot'>;

const ChatbotScreen = () => {
  const navigation = useNavigation<ChatbotScreenNavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm your SmartOffice assistant. You can ask me to book a room, check parking availability, or mark your attendance.",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scale = useSharedValue(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Pulse animation with Reanimated 2
  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1 // Infinite repetition
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }
    
    return () => {
      cancelAnimation(scale);
    };
  }, [isListening, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Simulate voice recognition and handle user commands
  const startListening = () => {
    if (isListening || isProcessing) return;
    
    setIsListening(true);
    toast.info('Listening...');
    
    // Simulate recording for 3 seconds
    setTimeout(() => {
      setIsListening(false);
      setIsProcessing(true);
      
      // Simulate random user command
      const commands = [
        "Book a meeting room for tomorrow at 2 PM",
        "Check parking availability",
        "Mark my attendance as in-office today",
        "I want to work from home today",
        "Show me available rooms on floor 3",
      ];
      
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      
      // Add user message
      addMessage(randomCommand, false);
      
      // Process the command after a short delay
      setTimeout(() => {
        processCommand(randomCommand);
        setIsProcessing(false);
      }, 1500);
      
    }, 3000);
  };

  const addMessage = (text: string, isBot: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Book room intent
    if (lowerCommand.includes('book') && (lowerCommand.includes('room') || lowerCommand.includes('meeting'))) {
      addMessage("I'll help you book a room. Let me find available options.", true);
      setTimeout(() => {
        addMessage("Room 301 is available at that time. Should I book it for you?", true);
        
        setTimeout(() => {
          addMessage("Room 301 has been booked for tomorrow at 2 PM. The booking confirmation has been sent to your email.", true);
          toast.success("Room booked successfully!");
        }, 2000);
      }, 1500);
    }
    
    // Check parking intent
    else if (lowerCommand.includes('park') || lowerCommand.includes('parking')) {
      addMessage("Checking real-time parking availability...", true);
      
      setTimeout(() => {
        addMessage("There are currently 12 car parking spots and 8 bike parking spots available. Would you like me to reserve one for you?", true);
      }, 1500);
    }
    
    // Attendance intent
    else if (lowerCommand.includes('attend') || lowerCommand.includes('office') || lowerCommand.includes('work')) {
      if (lowerCommand.includes('home') || lowerCommand.includes('wfh')) {
        addMessage("I'll mark your attendance as Work From Home for today.", true);
        
        setTimeout(() => {
          addMessage("Your attendance has been recorded as WFH for today, May 30, 2025.", true);
          toast.success("Attendance marked as WFH!");
        }, 1500);
      } else {
        addMessage("I'll mark your attendance as In-Office for today.", true);
        
        setTimeout(() => {
          addMessage("Your attendance has been recorded as In-Office for today, May 30, 2025. How are you commuting today?", true);
        }, 1500);
      }
    }
    
    // Show rooms intent
    else if ((lowerCommand.includes('show') || lowerCommand.includes('available')) && lowerCommand.includes('room')) {
      addMessage("Let me check available rooms for you...", true);
      
      setTimeout(() => {
        addMessage("On floor 3, rooms 301, 302, and 305 are currently available. Room 302 has video conferencing equipment. Would you like to book any of these rooms?", true);
      }, 1500);
    }
    
    // Fallback intent
    else {
      addMessage("I'm not sure I understand. You can ask me to book a room, check parking, or mark your attendance.", true);
    }
  };

  // Simulate AI response with quick actions
  const simulateQuickAction = (action: string) => {
    addMessage(action, false);
    
    setTimeout(() => {
      if (action.includes("Yes, book")) {
        addMessage("Great! I've booked room 301 for your meeting. The confirmation has been sent to your email.", true);
        toast.success("Room booked successfully!");
      } else if (action.includes("Reserve")) {
        addMessage("I've reserved parking spot B12 for you today. It will be available when you arrive.", true);
        toast.success("Parking spot reserved!");
      } else if (action.includes("Car") || action.includes("Bike") || action.includes("Public")) {
        addMessage(`I've updated your commute method to ${action} for today's attendance record.`, true);
        toast.success("Commute method updated!");
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
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
                {message.text}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Quick Action Buttons - Contextually shown based on conversation */}
      {messages.length > 0 && 
       messages[messages.length-1].isBot && 
       (messages[messages.length-1].text.includes("Should I book") || 
        messages[messages.length-1].text.includes("reserve one") ||
        messages[messages.length-1].text.includes("How are you commuting")) && (
        <View style={styles.quickActions}>
          {messages[messages.length-1].text.includes("Should I book") && (
            <>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Yes, book Room 301")}>
                <Text style={styles.quickActionText}>Yes, book Room 301</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickActionButton, styles.secondaryButton]}
                onPress={() => simulateQuickAction("No, show me other options")}>
                <Text style={styles.secondaryButtonText}>Show other options</Text>
              </TouchableOpacity>
            </>
          )}
          
          {messages[messages.length-1].text.includes("reserve one") && (
            <>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Reserve a car spot")}>
                <Text style={styles.quickActionText}>Reserve car spot</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Reserve a bike spot")}>
                <Text style={styles.quickActionText}>Reserve bike spot</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickActionButton, styles.secondaryButton]}
                onPress={() => simulateQuickAction("No thanks")}>
                <Text style={styles.secondaryButtonText}>No thanks</Text>
              </TouchableOpacity>
            </>
          )}
          
          {messages[messages.length-1].text.includes("How are you commuting") && (
            <>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Car")}>
                <Text style={styles.quickActionText}>Car</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Bike")}>
                <Text style={styles.quickActionText}>Bike</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => simulateQuickAction("Public Transport")}>
                <Text style={styles.quickActionText}>Public Transport</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      
      {/* Mic Button */}
      <View style={styles.micContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4A80F0" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={startListening}
            disabled={isListening}>
            <Animated.View 
              style={[
                styles.micButton,
                animatedStyle
              ]}>
              <Ionicons 
                name={isListening ? "radio" : "mic"} 
                size={28} 
                color="white" 
              />
            </Animated.View>
          </TouchableOpacity>
        )}
        <Text style={styles.micText}>
          {isListening 
            ? "Listening..." 
            : isProcessing 
              ? "Processing..." 
              : "Tap to speak"}
        </Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
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
    paddingBottom: 20,
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
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  micButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4A80F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  micText: {
    marginTop: 12,
    color: '#666',
    fontSize: 15,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
  },
  processingText: {
    marginTop: 10,
    color: '#4A80F0',
    fontSize: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  quickActionText: {
    color: 'white',
    fontWeight: '500',
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
});

export default ChatbotScreen;