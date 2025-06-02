// Smart Office Assistant - QR Code Demo Screen
// Main demo screen that showcases the complete QR code scanning and check-in flow

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

interface DemoStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: () => void;
  completed: boolean;
}

export default function QRCodeDemoScreen() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const demoSteps: DemoStep[] = [
    {
      id: 'view-qr-codes',
      title: 'View QR Codes',
      description: 'Explore available office QR codes for different locations',
      icon: 'qr-code',
      color: '#4A80F0',
      action: () => {
        navigation.navigate('QRCodeDisplay');
        markStepCompleted('view-qr-codes');
      },
      completed: completedSteps.includes('view-qr-codes'),
    },
    {
      id: 'scan-qr-code',
      title: 'Scan QR Code',
      description: 'Experience the camera scanner with live preview and animations',
      icon: 'camera',
      color: '#34C759',
      action: () => {
        navigation.navigate('QRScanner', { fromDemo: true, demoMode: true });
        markStepCompleted('scan-qr-code');
      },
      completed: completedSteps.includes('scan-qr-code'),
    },
    {
      id: 'verification-flow',
      title: 'Verification Methods',
      description: 'Test multiple check-in verification methods (QR, GPS, WiFi)',
      icon: 'checkmark-circle',
      color: '#FF9500',
      action: () => {
        navigation.navigate('Attendance');
        markStepCompleted('verification-flow');
      },
      completed: completedSteps.includes('verification-flow'),
    },
    {
      id: 'complete-checkin',
      title: 'Complete Check-in',
      description: 'Experience the full attendance check-in process',
      icon: 'time',
      color: '#FF2D55',
      action: () => {
        navigation.navigate('Attendance');
        markStepCompleted('complete-checkin');
      },
      completed: completedSteps.includes('complete-checkin'),
    },
  ];

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
      toast.success('Step completed!');
    }
  };

  const resetDemo = () => {
    setCompletedSteps([]);
    setCurrentStep(0);
    toast.info('Demo reset');
  };

  const startGuidedTour = () => {
    setCurrentStep(0);
    toast.info('Starting guided tour...');
    // Navigate to first step
    demoSteps[0].action();
  };

  const progressPercentage = (completedSteps.length / demoSteps.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4A80F0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Demo</Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetDemo}
        >
          <Ionicons name="refresh" size={24} color="#4A80F0" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <Animated.View style={[styles.welcomeCard, { opacity: fadeAnim }]}>
          <View style={styles.welcomeHeader}>
            <Ionicons name="scan" size={32} color="#4A80F0" />
            <Text style={styles.welcomeTitle}>QR Code Scanning Demo</Text>
          </View>
          <Text style={styles.welcomeDescription}>
            Experience the complete QR code scanning and attendance check-in flow. 
            This interactive demo showcases all features including camera scanning, 
            verification methods, and the complete user journey.
          </Text>
        </Animated.View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Demo Progress</Text>
            <Text style={styles.progressText}>
              {completedSteps.length} of {demoSteps.length} completed
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
          </View>
        </View>

        {/* Demo Steps */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Demo Steps</Text>
          
          {demoSteps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepCard,
                step.completed && styles.completedStepCard,
                currentStep === index && styles.currentStepCard,
              ]}
              onPress={step.action}
            >
              <View style={styles.stepContent}>
                <View style={[styles.stepIcon, { backgroundColor: step.color }]}>
                  <Ionicons 
                    name={step.completed ? 'checkmark' : step.icon} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                
                <View style={styles.stepInfo}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    {step.completed && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                        <Text style={styles.completedText}>Done</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={step.completed ? '#34C759' : '#C7C7CC'} 
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#4A80F0' }]}
              onPress={startGuidedTour}
            >
              <Ionicons name="play-circle" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Guided Tour</Text>
              <Text style={styles.actionDescription}>Step-by-step walkthrough</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#34C759' }]}
              onPress={() => navigation.navigate('QRScanner', { demoMode: true })}
            >
              <Ionicons name="camera" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Quick Scan</Text>
              <Text style={styles.actionDescription}>Jump to scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#FF9500' }]}
              onPress={() => navigation.navigate('QRCodeDisplay')}
            >
              <Ionicons name="grid" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>View QR Codes</Text>
              <Text style={styles.actionDescription}>Browse all codes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: '#FF2D55' }]}
              onPress={() => navigation.navigate('Attendance')}
            >
              <Ionicons name="time" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Attendance</Text>
              <Text style={styles.actionDescription}>Check-in flow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Highlight */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Demo Features</Text>
          
          <View style={styles.featuresList}>
            {[
              { icon: 'camera', text: 'Live camera preview with scanning overlay' },
              { icon: 'qr-code', text: 'Multiple QR codes for different locations' },
              { icon: 'checkmark-circle', text: 'Multi-method verification (QR, GPS, WiFi)' },
              { icon: 'phone-portrait', text: 'Mobile and web platform support' },
              { icon: 'eye', text: 'Visual feedback and animations' },
              { icon: 'shield-checkmark', text: 'Error handling and validation' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name={feature.icon} size={20} color="#4A80F0" />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Demo Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#4A80F0" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Demo Mode</Text>
              <Text style={styles.infoText}>
                This demo simulates QR code scanning and verification. 
                In production, real camera scanning and server validation would be used.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  resetButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  welcomeCard: {
    margin: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  progressSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A80F0',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
    minWidth: 40,
    textAlign: 'right',
  },
  stepsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  completedStepCard: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  currentStepCard: {
    borderColor: '#4A80F0',
    backgroundColor: '#F0F4FF',
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  featuresSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1E7FF',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
