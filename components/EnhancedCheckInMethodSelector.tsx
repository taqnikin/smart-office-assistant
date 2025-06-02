// Smart Office Assistant - Enhanced Check-in Method Selector Component
// Advanced component showing multiple verification methods with confidence levels and real-time feedback

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
import { attendanceVerificationService, type VerificationResult } from '../services/AttendanceVerificationService';
import { qrCodeService, type QRScanResult } from '../services/QRCodeService';

const { width } = Dimensions.get('window');

interface VerificationMethod {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  status: 'available' | 'testing' | 'success' | 'failed' | 'unavailable';
  confidence: number;
  result?: VerificationResult;
  error?: string;
  isPrimary?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onMethodSelected: (method: string, result: VerificationResult) => void;
  demoMode?: boolean;
}

export default function EnhancedCheckInMethodSelector({ 
  visible, 
  onClose, 
  onMethodSelected,
  demoMode = false 
}: Props) {
  const [methods, setMethods] = useState<VerificationMethod[]>([
    {
      id: 'qr_code',
      name: 'QR Code Scan',
      description: 'Scan office QR code for instant verification',
      icon: 'qr-code',
      color: '#4A80F0',
      status: 'available',
      confidence: 0,
      isPrimary: true,
    },
    {
      id: 'gps_location',
      name: 'GPS Location',
      description: 'Verify your location using GPS coordinates',
      icon: 'location',
      color: '#34C759',
      status: 'available',
      confidence: 0,
    },
    {
      id: 'wifi_network',
      name: 'WiFi Network',
      description: 'Detect office WiFi networks',
      icon: 'wifi',
      color: '#FF9500',
      status: 'available',
      confidence: 0,
    },
    {
      id: 'manual_approval',
      name: 'Manual Approval',
      description: 'Request admin approval for check-in',
      icon: 'person-circle',
      color: '#FF2D55',
      status: 'available',
      confidence: 0,
    },
  ]);

  const [isScanning, setIsScanning] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(300);

  useEffect(() => {
    if (visible) {
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-test methods in demo mode
      if (demoMode) {
        const timer = setTimeout(() => testAllMethods(), 1000);
        return () => clearTimeout(timer);
      }
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible, demoMode, fadeAnim, slideAnim, methods]);

  const testAllMethods = async () => {
    for (const method of methods) {
      await testMethod(method.id);
      await new Promise(resolve => setTimeout(resolve, 800)); // Delay between tests
    }
  };

  const testMethod = async (methodId: string) => {
    setMethods(prev => prev.map(m => 
      m.id === methodId 
        ? { ...m, status: 'testing', confidence: 0 }
        : m
    ));

    try {
      let result: VerificationResult;

      switch (methodId) {
        case 'qr_code':
          result = await simulateQRVerification();
          break;
        case 'gps_location':
          result = await simulateGPSVerification();
          break;
        case 'wifi_network':
          result = await simulateWiFiVerification();
          break;
        case 'manual_approval':
          result = await simulateManualApproval();
          break;
        default:
          throw new Error('Unknown verification method');
      }

      setMethods(prev => prev.map(m => 
        m.id === methodId 
          ? { 
              ...m, 
              status: result.success ? 'success' : 'failed',
              confidence: result.confidence,
              result,
              error: result.error
            }
          : m
      ));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setMethods(prev => prev.map(m =>
        m.id === methodId
          ? {
              ...m,
              status: 'failed',
              confidence: 0,
              error: errorMessage
            }
          : m
      ));
    }
  };

  const simulateQRVerification = async (): Promise<VerificationResult> => {
    // Simulate realistic QR code scanning with camera interface
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 85% success rate for demo
    const isSuccess = Math.random() > 0.15;

    if (isSuccess) {
      const qrLocations = [
        { code: 'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4', location: 'Main Entrance Lobby', confidence: 1.0 },
        { code: 'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4', location: 'Floor 2 Reception', confidence: 0.95 },
        { code: 'SMARTOFFICE_CAFETERIA_2024_Q4', location: 'Employee Cafeteria', confidence: 0.9 },
        { code: 'SMARTOFFICE_CONFERENCE_ROOM_A_2024_Q4', location: 'Conference Room A', confidence: 0.85 }
      ];

      const randomLocation = qrLocations[Math.floor(Math.random() * qrLocations.length)];

      return {
        success: true,
        method: 'qr_code',
        confidence: randomLocation.confidence,
        data: {
          code_value: randomLocation.code,
          location_description: randomLocation.location,
          qr_code_id: `qr-${Date.now()}`,
          office_location_id: 'demo-office-1',
          scan_count: Math.floor(Math.random() * 100) + 1,
          scan_timestamp: new Date().toISOString(),
          verification_time: '2.1s'
        }
      };
    } else {
      return {
        success: false,
        method: 'qr_code',
        confidence: 0,
        data: {
          error_type: 'scan_failed',
          attempted_scans: 3
        },
        error: 'QR code not detected. Please ensure the code is clearly visible and try again.'
      };
    }
  };

  const simulateGPSVerification = async (): Promise<VerificationResult> => {
    // Simulate GPS location checking with realistic timing
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 75% success rate for GPS (can fail due to poor signal, etc.)
    const isSuccess = Math.random() > 0.25;

    if (isSuccess) {
      const accuracy = Math.random() * 15 + 3; // 3-18 meters accuracy
      const distance = Math.random() * 45 + 5; // 5-50 meters from office center
      const confidence = Math.max(0.5, 1 - (distance / 100) - (accuracy / 50));

      return {
        success: true,
        method: 'gps_location',
        confidence: Math.round(confidence * 100) / 100,
        data: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.001,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.001,
          accuracy: Math.round(accuracy * 10) / 10,
          distance_from_office: Math.round(distance * 10) / 10,
          office_geofence_radius: 50,
          location_timestamp: new Date().toISOString(),
          verification_time: '2.5s'
        }
      };
    } else {
      const errorTypes = [
        'GPS signal weak - please move to an open area',
        'Location services disabled - please enable GPS',
        'Too far from office - you are outside the geofence area',
        'GPS accuracy too low - please wait for better signal'
      ];

      return {
        success: false,
        method: 'gps_location',
        confidence: 0,
        data: {
          error_type: 'location_failed',
          attempted_fixes: 3
        },
        error: errorTypes[Math.floor(Math.random() * errorTypes.length)]
      };
    }
  };

  const simulateWiFiVerification = async (): Promise<VerificationResult> => {
    // Simulate WiFi network detection
    await new Promise(resolve => setTimeout(resolve, 1800));

    // 80% success rate for WiFi
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      const officeNetworks = [
        { ssid: 'SmartOffice-Main', signal: -45, confidence: 0.95 },
        { ssid: 'SmartOffice-Guest', signal: -52, confidence: 0.85 },
        { ssid: 'SmartOffice-5G', signal: -38, confidence: 0.98 },
        { ssid: 'SmartOffice-IoT', signal: -48, confidence: 0.9 }
      ];

      const detectedNetwork = officeNetworks[Math.floor(Math.random() * officeNetworks.length)];

      return {
        success: true,
        method: 'wifi_network',
        confidence: detectedNetwork.confidence,
        data: {
          detected_ssid: detectedNetwork.ssid,
          signal_strength: detectedNetwork.signal,
          network_security: 'WPA2-Enterprise',
          mac_address: `aa:bb:cc:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`,
          connection_timestamp: new Date().toISOString(),
          verification_time: '1.8s'
        }
      };
    } else {
      const errorTypes = [
        'No office WiFi networks detected - please move closer to the office',
        'WiFi is disabled - please enable WiFi and try again',
        'Connected to unknown network - please connect to office WiFi',
        'WiFi signal too weak - please move closer to the access point'
      ];

      return {
        success: false,
        method: 'wifi_network',
        confidence: 0,
        data: {
          error_type: 'wifi_failed',
          available_networks: ['HomeNetwork', 'CoffeeShop-WiFi', 'PublicWiFi']
        },
        error: errorTypes[Math.floor(Math.random() * errorTypes.length)]
      };
    }
  };

  const simulateManualApproval = async (): Promise<VerificationResult> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 95% success rate for manual approval (admin usually approves)
    const isApproved = Math.random() > 0.05;

    if (isApproved) {
      const admins = ['Sarah Johnson (HR)', 'Mike Chen (IT Manager)', 'Lisa Rodriguez (Operations)'];
      const randomAdmin = admins[Math.floor(Math.random() * admins.length)];

      return {
        success: true,
        method: 'manual_approval',
        confidence: 0.85,
        data: {
          approval_required: true,
          estimated_approval_time: '3-8 minutes',
          admin_notified: true,
          notified_admin: randomAdmin,
          request_id: `REQ-${Date.now()}`,
          notification_sent: new Date().toISOString(),
          approval_reason: 'Standard office check-in request'
        }
      };
    } else {
      return {
        success: false,
        method: 'manual_approval',
        confidence: 0,
        data: {
          approval_required: true,
          admin_notified: false,
          error_type: 'notification_failed'
        },
        error: 'Unable to notify admin for approval. Please try again or contact IT support.'
      };
    }
  };

  const handleMethodPress = async (method: VerificationMethod) => {
    if (method.status === 'testing') return;

    setSelectedMethod(method.id);

    if (method.id === 'qr_code') {
      await handleQRCodeScan();
    } else if (method.status === 'success' && method.result) {
      onMethodSelected(method.id, method.result);
      onClose();
    } else {
      await testMethod(method.id);
    }
  };

  const handleQRCodeScan = async () => {
    setIsScanning(true);

    try {
      // In demo mode, use our enhanced simulation
      if (demoMode) {
        const verificationResult = await simulateQRVerification();

        setMethods(prev => prev.map(m =>
          m.id === 'qr_code'
            ? {
                ...m,
                status: verificationResult.success ? 'success' : 'failed',
                confidence: verificationResult.confidence,
                result: verificationResult,
                error: verificationResult.error
              }
            : m
        ));

        if (verificationResult.success) {
          toast.success(`QR Code scanned successfully at ${verificationResult.data?.location_description}`);
          onMethodSelected('qr_code', verificationResult);
          onClose();
        } else {
          toast.error(verificationResult.error || 'QR code verification failed');
        }
      } else {
        // Production mode - use actual QR scanning service
        const scanResult: QRScanResult = await qrCodeService.scanQRCodeWithCamera();

        if (scanResult.success && scanResult.data) {
          const verificationResult = await attendanceVerificationService.verifyQRCode(scanResult.data);

          setMethods(prev => prev.map(m =>
            m.id === 'qr_code'
              ? {
                  ...m,
                  status: verificationResult.success ? 'success' : 'failed',
                  confidence: verificationResult.confidence,
                  result: verificationResult,
                  error: verificationResult.error
                }
              : m
          ));

          if (verificationResult.success) {
            onMethodSelected('qr_code', verificationResult);
            onClose();
          } else {
            toast.error(verificationResult.error || 'QR code verification failed');
          }
        } else {
          toast.error(scanResult.error || 'Failed to scan QR code');
        }
      }
    } catch (error) {
      toast.error('QR scanning failed');
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing': return 'hourglass';
      case 'success': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      case 'unavailable': return 'ban';
      default: return 'ellipse';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'testing': return '#FF9500';
      case 'success': return '#34C759';
      case 'failed': return '#FF3B30';
      case 'unavailable': return '#8E8E93';
      default: return '#C7C7CC';
    }
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.5) return 'Fair';
    if (confidence > 0) return 'Poor';
    return 'Not tested';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#34C759';
    if (confidence >= 0.7) return '#4A80F0';
    if (confidence >= 0.5) return '#FF9500';
    if (confidence > 0) return '#FF3B30';
    return '#8E8E93';
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
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Verification Method</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Demo Mode Indicator */}
          {demoMode && (
            <View style={styles.demoIndicator}>
              <Ionicons name="flask" size={16} color="#FF9500" />
              <Text style={styles.demoText}>Demo Mode - Simulated Results</Text>
            </View>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Methods List */}
            <View style={styles.methodsList}>
              {methods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    method.isPrimary && styles.primaryMethodCard,
                    selectedMethod === method.id && styles.selectedMethodCard,
                    method.status === 'success' && styles.successMethodCard,
                  ]}
                  onPress={() => handleMethodPress(method)}
                  disabled={method.status === 'testing'}
                >
                  <View style={styles.methodContent}>
                    <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                      <Ionicons name={method.icon} size={24} color="#FFFFFF" />
                    </View>

                    <View style={styles.methodInfo}>
                      <View style={styles.methodHeader}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        {method.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryText}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.methodDescription}>{method.description}</Text>
                      
                      {/* Confidence Level */}
                      {method.confidence > 0 && (
                        <View style={styles.confidenceContainer}>
                          <Text style={styles.confidenceLabel}>Confidence: </Text>
                          <Text style={[
                            styles.confidenceValue,
                            { color: getConfidenceColor(method.confidence) }
                          ]}>
                            {getConfidenceText(method.confidence)} ({Math.round(method.confidence * 100)}%)
                          </Text>
                        </View>
                      )}

                      {/* Success Details */}
                      {method.status === 'success' && method.result?.data && (
                        <View style={styles.successDetails}>
                          {method.id === 'qr_code' && (
                            <Text style={styles.successText}>
                              ✓ Scanned at {method.result.data.location_description}
                            </Text>
                          )}
                          {method.id === 'gps_location' && (
                            <Text style={styles.successText}>
                              ✓ Location verified ({method.result.data.distance_from_office}m from office)
                            </Text>
                          )}
                          {method.id === 'wifi_network' && (
                            <Text style={styles.successText}>
                              ✓ Connected to {method.result.data.detected_ssid}
                            </Text>
                          )}
                          {method.id === 'manual_approval' && (
                            <Text style={styles.successText}>
                              ✓ Admin notified: {method.result.data.notified_admin}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Error Message */}
                      {method.error && (
                        <Text style={styles.errorText}>{method.error}</Text>
                      )}
                    </View>

                    <View style={styles.methodStatus}>
                      {method.status === 'testing' ? (
                        <ActivityIndicator size="small" color={method.color} />
                      ) : (
                        <Ionicons 
                          name={getStatusIcon(method.status)} 
                          size={24} 
                          color={getStatusColor(method.status)} 
                        />
                      )}
                    </View>
                  </View>

                  {/* Confidence Bar */}
                  {method.confidence > 0 && (
                    <View style={styles.confidenceBar}>
                      <View 
                        style={[
                          styles.confidenceBarFill,
                          { 
                            width: `${method.confidence * 100}%`,
                            backgroundColor: getConfidenceColor(method.confidence)
                          }
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={testAllMethods}
              >
                <Ionicons name="refresh" size={20} color="#4A80F0" />
                <Text style={styles.retryButtonText}>Test All Methods</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => {
                  toast.info('Demo mode simulates real verification methods with realistic success rates and timing.');
                }}
              >
                <Ionicons name="help-circle" size={20} color="#666" />
                <Text style={styles.helpButtonText}>How it works</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* QR Scanning Overlay */}
          {isScanning && (
            <View style={styles.scanningOverlay}>
              <View style={styles.scanningContent}>
                {/* Camera Preview Simulation */}
                <View style={styles.cameraPreview}>
                  <View style={styles.scanningFrame}>
                    <View style={styles.scanningCorner} />
                    <View style={[styles.scanningCorner, styles.topRight]} />
                    <View style={[styles.scanningCorner, styles.bottomLeft]} />
                    <View style={[styles.scanningCorner, styles.bottomRight]} />

                    {/* Scanning Line Animation */}
                    <Animated.View style={[styles.scanningLine]} />
                  </View>

                  <View style={styles.scanningInstructions}>
                    <Ionicons name="qr-code" size={32} color="#FFFFFF" />
                    <Text style={styles.scanningInstructionText}>
                      Position QR code within the frame
                    </Text>
                    <Text style={styles.scanningSubText}>
                      {demoMode ? 'Demo: Simulating camera scan...' : 'Camera is scanning...'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cancelScanButton}
                  onPress={() => setIsScanning(false)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.cancelScanText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>


    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
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
  demoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    gap: 6,
  },
  demoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9500',
  },
  scrollView: {
    flex: 1,
  },
  methodsList: {
    padding: 20,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  primaryMethodCard: {
    borderColor: '#4A80F0',
    backgroundColor: '#F0F4FF',
  },
  selectedMethodCard: {
    borderColor: '#4A80F0',
    borderWidth: 2,
  },
  successMethodCard: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  primaryBadge: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  successDetails: {
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  methodStatus: {
    marginLeft: 12,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A80F0',
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A80F0',
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    gap: 6,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPreview: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  scanningFrame: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A80F0',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  scanningLine: {
    position: 'absolute',
    width: 180,
    height: 2,
    backgroundColor: '#4A80F0',
    opacity: 0.8,
  },
  scanningInstructions: {
    position: 'absolute',
    bottom: -80,
    alignItems: 'center',
  },
  scanningInstructionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  scanningSubText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  cancelScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  cancelScanText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

});
