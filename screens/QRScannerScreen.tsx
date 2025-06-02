// Smart Office Assistant - Enhanced QR Scanner Screen
// Full-featured QR scanner with live camera preview, multiple scanning options, and demo mode

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { qrCodeService, type QRScanResult } from '../services/QRCodeService';
import { useQRNotifications } from '../hooks/useNotifications';
import { attendanceVerificationService } from '../services/AttendanceVerificationService';

const { width, height } = Dimensions.get('window');

interface ScanningState {
  isScanning: boolean;
  hasPermission: boolean;
  scanResult: QRScanResult | null;
  scanningMethod: 'camera' | 'gallery' | 'manual' | null;
  showManualEntry: boolean;
  manualCode: string;
}

interface RouteParams {
  fromDemo?: boolean;
  demoMode?: boolean;
  preselectedCode?: string;
}

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const { notifyQRScanSuccess, notifyQRScanError } = useQRNotifications();
  
  const [scanningState, setScanningState] = useState<ScanningState>({
    isScanning: false,
    hasPermission: false,
    scanResult: null,
    scanningMethod: null,
    showManualEntry: false,
    manualCode: '',
  });

  // Animation values
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkCameraPermissions();
    startAnimations();
    
    // If coming from demo with preselected code, simulate scanning it
    if (params?.demoMode && params?.preselectedCode) {
      setTimeout(() => {
        simulateQRScan(params.preselectedCode);
      }, 2000);
    }
  }, []);

  const checkCameraPermissions = async () => {
    try {
      const permissions = await qrCodeService.getPermissionStatus();
      setScanningState(prev => ({ ...prev, hasPermission: permissions.camera }));
      
      if (!permissions.camera) {
        const newPermissions = await qrCodeService.requestCameraPermissions();
        setScanningState(prev => ({ ...prev, hasPermission: newPermissions.camera }));
      }
    } catch (error) {
      notifyQRScanError('Failed to check camera permissions');
    }
  };

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scanning line animation
    const scanLineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse animation for scanning frame
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    scanLineLoop.start();
    pulseLoop.start();
  };

  const simulateQRScan = async (code?: string) => {
    setScanningState(prev => ({ ...prev, isScanning: true, scanningMethod: 'camera' }));
    
    try {
      let scanResult: QRScanResult;
      
      if (code) {
        // Use preselected code for demo
        scanResult = {
          success: true,
          data: code
        };
      } else {
        // Use the QR service simulation
        scanResult = await qrCodeService.scanQRCodeWithCamera();
      }
      
      setScanningState(prev => ({ ...prev, scanResult, isScanning: false }));
      
      if (scanResult.success && scanResult.data) {
        await handleSuccessfulScan(scanResult.data);
      } else {
        notifyQRScanError(scanResult.error || 'Failed to scan QR code');
      }
    } catch (error) {
      notifyQRScanError('QR scanning failed');
      setScanningState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleSuccessfulScan = async (qrData: string) => {
    try {
      // Verify the scanned QR code
      const verificationResult = await attendanceVerificationService.verifyQRCode(qrData);
      
      if (verificationResult.success) {
        notifyQRScanSuccess(verificationResult.data);

        // Navigate to check-in method selector or attendance screen
        if (params?.fromDemo) {
          Alert.alert(
            'QR Code Verified!',
            `Successfully scanned: ${qrData}\nLocation: ${verificationResult.data?.location_description || 'Office'}\n\nThis completes the QR scanning demo.`,
            [
              { text: 'Scan Another', onPress: () => resetScanner() },
              { text: 'Go to Attendance', onPress: () => navigation.navigate('Attendance' as never) },
            ]
          );
        } else {
          navigation.navigate('Attendance' as never);
        }
      } else {
        notifyQRScanError(verificationResult.error || 'QR code verification failed');

        Alert.alert(
          'Invalid QR Code',
          verificationResult.error || 'This QR code is not valid for office check-in.',
          [
            { text: 'Try Again', onPress: () => resetScanner() },
            { text: 'Cancel', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      notifyQRScanError('Failed to verify QR code');
    }
  };

  const resetScanner = () => {
    setScanningState(prev => ({
      ...prev,
      isScanning: false,
      scanResult: null,
      scanningMethod: null,
      showManualEntry: false,
      manualCode: '',
    }));
  };

  const handleCameraScan = () => {
    if (!scanningState.hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan QR codes.',
        [
          { text: 'Cancel' },
          { text: 'Grant Permission', onPress: checkCameraPermissions },
        ]
      );
      return;
    }
    
    simulateQRScan();
  };

  const handleGalleryScan = async () => {
    setScanningState(prev => ({ ...prev, isScanning: true, scanningMethod: 'gallery' }));
    
    try {
      const scanResult = await qrCodeService.scanQRCodeFromGallery();
      setScanningState(prev => ({ ...prev, scanResult, isScanning: false }));
      
      if (scanResult.success && scanResult.data) {
        await handleSuccessfulScan(scanResult.data);
      } else if (!scanResult.cancelled) {
        notifyQRScanError(scanResult.error || 'Failed to scan QR code from image');
      }
    } catch (error) {
      notifyQRScanError('Failed to scan from gallery');
      setScanningState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleManualEntry = () => {
    setScanningState(prev => ({ ...prev, showManualEntry: true }));
  };

  const submitManualCode = async () => {
    if (!scanningState.manualCode.trim()) {
      notifyQRScanError('Please enter a QR code');
      return;
    }

    setScanningState(prev => ({ ...prev, showManualEntry: false }));
    await handleSuccessfulScan(scanningState.manualCode.trim());
  };

  const scanLineTranslateY = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params?.demoMode ? 'QR Scanner Demo' : 'Scan QR Code'}
        </Text>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => navigation.navigate('QRCodeDisplay')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Preview Area */}
      <Animated.View 
        style={[
          styles.cameraContainer,
          { opacity: fadeAnimation }
        ]}
      >
        {/* Simulated Camera View */}
        <View style={styles.cameraView}>
          <View style={styles.cameraOverlay}>
            {/* Scanning Frame */}
            <Animated.View 
              style={[
                styles.scanningFrame,
                { transform: [{ scale: pulseAnimation }] }
              ]}
            >
              {/* Corner indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scanning line */}
              {scanningState.isScanning && (
                <Animated.View 
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslateY }] }
                  ]}
                />
              )}
            </Animated.View>
          </View>
          
          {/* Camera placeholder content */}
          <View style={styles.cameraPlaceholder}>
            <Ionicons 
              name="camera" 
              size={60} 
              color="rgba(255, 255, 255, 0.3)" 
            />
            <Text style={styles.cameraPlaceholderText}>
              {scanningState.hasPermission 
                ? 'Point camera at QR code' 
                : 'Camera permission required'
              }
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionTitle}>
          {scanningState.isScanning ? 'Scanning...' : 'Position QR code in the frame'}
        </Text>
        <Text style={styles.instructionText}>
          {params?.demoMode 
            ? 'Demo mode: Simulating QR code scanning'
            : 'Make sure the QR code is clearly visible and well-lit'
          }
        </Text>
      </View>

      {/* Scanning Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={[styles.optionButton, styles.primaryOption]}
          onPress={handleCameraScan}
          disabled={scanningState.isScanning}
        >
          <Ionicons name="camera" size={24} color="#FFFFFF" />
          <Text style={styles.optionButtonText}>
            {scanningState.isScanning && scanningState.scanningMethod === 'camera' 
              ? 'Scanning...' 
              : 'Camera Scan'
            }
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryOptions}>
          <TouchableOpacity 
            style={[styles.optionButton, styles.secondaryOption]}
            onPress={handleGalleryScan}
            disabled={scanningState.isScanning}
          >
            <Ionicons name="image" size={20} color="#4A80F0" />
            <Text style={styles.secondaryOptionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionButton, styles.secondaryOption]}
            onPress={handleManualEntry}
            disabled={scanningState.isScanning}
          >
            <Ionicons name="create" size={20} color="#4A80F0" />
            <Text style={styles.secondaryOptionText}>Manual</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Demo Mode Indicator */}
      {params?.demoMode && (
        <View style={styles.demoIndicator}>
          <Ionicons name="flask" size={16} color="#FF9500" />
          <Text style={styles.demoText}>Demo Mode Active</Text>
        </View>
      )}

      {/* Manual Entry Modal */}
      <Modal
        visible={scanningState.showManualEntry}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter QR Code Manually</Text>
            <TextInput
              style={styles.codeInput}
              value={scanningState.manualCode}
              onChangeText={(text) => 
                setScanningState(prev => ({ ...prev, manualCode: text }))
              }
              placeholder="SMARTOFFICE_MAIN_ENTRANCE_2024_Q4"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
              multiline={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setScanningState(prev => ({ ...prev, showManualEntry: false }))}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButton}
                onPress={submitManualCode}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    position: 'relative',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A80F0',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4A80F0',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryOption: {
    backgroundColor: '#4A80F0',
    gap: 8,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 128, 240, 0.5)',
    gap: 4,
  },
  secondaryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A80F0',
  },
  demoIndicator: {
    position: 'absolute',
    top: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  demoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A80F0',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
