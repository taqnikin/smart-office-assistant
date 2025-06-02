// Smart Office Assistant - Attendance Verification Demo Component
// Comprehensive demo showcasing all verification methods with realistic scenarios

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  methods: string[];
  expectedOutcome: 'success' | 'mixed' | 'failure';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onScenarioSelected: (scenario: DemoScenario) => void;
}

export default function AttendanceVerificationDemo({ 
  visible, 
  onClose, 
  onScenarioSelected 
}: Props) {
  const [scenarios] = useState<DemoScenario[]>([
    {
      id: 'perfect_conditions',
      title: 'Perfect Office Conditions',
      description: 'All verification methods work optimally - strong GPS, office WiFi, QR codes available',
      icon: 'checkmark-circle',
      color: '#34C759',
      methods: ['qr_code', 'gps_location', 'wifi_network', 'manual_approval'],
      expectedOutcome: 'success'
    },
    {
      id: 'poor_gps_signal',
      title: 'Poor GPS Signal',
      description: 'Indoor location with weak GPS signal - WiFi and QR codes work as backup',
      icon: 'location-outline',
      color: '#FF9500',
      methods: ['qr_code', 'wifi_network', 'manual_approval'],
      expectedOutcome: 'mixed'
    },
    {
      id: 'no_qr_available',
      title: 'No QR Code Available',
      description: 'QR codes are damaged or not accessible - rely on GPS and WiFi verification',
      icon: 'qr-code-outline',
      color: '#FF9500',
      methods: ['gps_location', 'wifi_network', 'manual_approval'],
      expectedOutcome: 'mixed'
    },
    {
      id: 'guest_wifi_only',
      title: 'Guest WiFi Only',
      description: 'Connected to guest network instead of office WiFi - manual approval needed',
      icon: 'wifi-outline',
      color: '#FF9500',
      methods: ['gps_location', 'manual_approval'],
      expectedOutcome: 'mixed'
    },
    {
      id: 'emergency_checkin',
      title: 'Emergency Check-in',
      description: 'All automated methods fail - manual approval is the only option',
      icon: 'alert-circle',
      color: '#FF3B30',
      methods: ['manual_approval'],
      expectedOutcome: 'failure'
    },
    {
      id: 'new_employee',
      title: 'New Employee First Day',
      description: 'First-time setup with guided verification process',
      icon: 'person-add',
      color: '#4A80F0',
      methods: ['qr_code', 'manual_approval'],
      expectedOutcome: 'success'
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleScenarioPress = (scenario: DemoScenario) => {
    setSelectedScenario(scenario.id);
    toast.success(`Starting demo: ${scenario.title}`);
    onScenarioSelected(scenario);
    onClose();
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'checkmark-circle';
      case 'mixed': return 'warning';
      case 'failure': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return '#34C759';
      case 'mixed': return '#FF9500';
      case 'failure': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'qr_code': return 'qr-code';
      case 'gps_location': return 'location';
      case 'wifi_network': return 'wifi';
      case 'manual_approval': return 'person-circle';
      default: return 'help-circle';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Verification Demo Scenarios</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Choose a scenario to test different verification methods and see how the system handles various real-world conditions.
            </Text>

            {/* Scenarios List */}
            <View style={styles.scenariosList}>
              {scenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario.id}
                  style={[
                    styles.scenarioCard,
                    selectedScenario === scenario.id && styles.selectedScenarioCard
                  ]}
                  onPress={() => handleScenarioPress(scenario)}
                >
                  <View style={styles.scenarioContent}>
                    <View style={[styles.scenarioIcon, { backgroundColor: scenario.color }]}>
                      <Ionicons name={scenario.icon} size={24} color="#FFFFFF" />
                    </View>

                    <View style={styles.scenarioInfo}>
                      <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                      <Text style={styles.scenarioDescription}>{scenario.description}</Text>
                      
                      {/* Available Methods */}
                      <View style={styles.methodsContainer}>
                        <Text style={styles.methodsLabel}>Available methods:</Text>
                        <View style={styles.methodsList}>
                          {scenario.methods.map((method, index) => (
                            <View key={method} style={styles.methodChip}>
                              <Ionicons 
                                name={getMethodIcon(method)} 
                                size={12} 
                                color="#4A80F0" 
                              />
                              <Text style={styles.methodChipText}>
                                {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={styles.outcomeIndicator}>
                      <Ionicons 
                        name={getOutcomeIcon(scenario.expectedOutcome)} 
                        size={20} 
                        color={getOutcomeColor(scenario.expectedOutcome)} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Demo Instructions */}
            <View style={styles.instructionsCard}>
              <View style={styles.instructionsHeader}>
                <Ionicons name="information-circle" size={20} color="#4A80F0" />
                <Text style={styles.instructionsTitle}>How Demo Works</Text>
              </View>
              <Text style={styles.instructionsText}>
                • Each scenario simulates real-world conditions{'\n'}
                • Verification methods will show realistic success/failure rates{'\n'}
                • Timing and feedback match actual usage patterns{'\n'}
                • Success details and error messages are contextual
              </Text>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: 'center',
  },
  scenariosList: {
    paddingHorizontal: 20,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  selectedScenarioCard: {
    borderColor: '#4A80F0',
    backgroundColor: '#F0F4FF',
  },
  scenarioContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scenarioIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  methodsContainer: {
    marginTop: 8,
  },
  methodsLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  methodsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  methodChipText: {
    fontSize: 10,
    color: '#4A80F0',
    fontWeight: '500',
  },
  outcomeIndicator: {
    marginLeft: 8,
  },
  instructionsCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
