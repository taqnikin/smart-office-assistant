// Smart Office Assistant - Check-in Method Selector Component
// This component allows users to choose their preferred check-in verification method

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { attendanceVerificationService, type VerificationResult } from '../services/AttendanceVerificationService';
import { qrCodeService, type QRScanResult } from '../services/QRCodeService';

interface CheckInMethodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMethodSelected: (method: 'gps' | 'wifi' | 'qr_code', result: VerificationResult) => void;
  officeLocationId?: string;
  preferredMethods?: ('gps' | 'wifi' | 'qr_code')[];
}

interface MethodStatus {
  available: boolean;
  testing: boolean;
  result?: VerificationResult;
  error?: string;
}

export default function CheckInMethodSelector({
  visible,
  onClose,
  onMethodSelected,
  officeLocationId,
  preferredMethods = ['gps', 'wifi', 'qr_code']
}: CheckInMethodSelectorProps) {
  const [methodStatuses, setMethodStatuses] = useState<{
    gps: MethodStatus;
    wifi: MethodStatus;
    qr_code: MethodStatus;
  }>({
    gps: { available: true, testing: false },
    wifi: { available: true, testing: false },
    qr_code: { available: true, testing: false }
  });

  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (visible) {
      // Auto-test GPS and WiFi when modal opens
      testGPSMethod();
      testWiFiMethod();
    }
  }, [visible]);

  const testGPSMethod = async () => {
    setMethodStatuses(prev => ({
      ...prev,
      gps: { ...prev.gps, testing: true, result: undefined, error: undefined }
    }));

    try {
      const result = await attendanceVerificationService.verifyGPSLocation(officeLocationId);
      setMethodStatuses(prev => ({
        ...prev,
        gps: { available: true, testing: false, result }
      }));
    } catch (error) {
      setMethodStatuses(prev => ({
        ...prev,
        gps: { available: false, testing: false, error: error.message }
      }));
    }
  };

  const testWiFiMethod = async () => {
    setMethodStatuses(prev => ({
      ...prev,
      wifi: { ...prev.wifi, testing: true, result: undefined, error: undefined }
    }));

    try {
      const result = await attendanceVerificationService.verifyWiFiNetwork(officeLocationId);
      setMethodStatuses(prev => ({
        ...prev,
        wifi: { available: true, testing: false, result }
      }));
    } catch (error) {
      setMethodStatuses(prev => ({
        ...prev,
        wifi: { available: false, testing: false, error: error.message }
      }));
    }
  };

  const handleQRCodeScan = async () => {
    setIsScanning(true);
    
    try {
      // Request camera permissions
      const permissions = await qrCodeService.requestCameraPermissions();
      if (!permissions.camera) {
        toast.error('Camera permission is required for QR code scanning');
        setIsScanning(false);
        return;
      }

      // Scan QR code
      const scanResult: QRScanResult = await qrCodeService.scanQRCodeWithCamera();
      
      if (scanResult.cancelled) {
        setIsScanning(false);
        return;
      }

      if (!scanResult.success || !scanResult.data) {
        toast.error(scanResult.error || 'Failed to scan QR code');
        setIsScanning(false);
        return;
      }

      // Verify the scanned QR code
      const verificationResult = await attendanceVerificationService.verifyQRCode(scanResult.data);
      
      setMethodStatuses(prev => ({
        ...prev,
        qr_code: { available: true, testing: false, result: verificationResult }
      }));

      if (verificationResult.success) {
        onMethodSelected('qr_code', verificationResult);
        onClose();
      } else {
        toast.error(verificationResult.error || 'QR code verification failed');
      }

    } catch (error) {
      console.error('QR code scanning error:', error);
      toast.error('QR code scanning failed');
      setMethodStatuses(prev => ({
        ...prev,
        qr_code: { available: false, testing: false, error: error.message }
      }));
    } finally {
      setIsScanning(false);
    }
  };

  const handleMethodSelect = (method: 'gps' | 'wifi' | 'qr_code') => {
    const status = methodStatuses[method];
    
    if (method === 'qr_code') {
      handleQRCodeScan();
      return;
    }

    if (!status.result) {
      toast.error('Please wait for verification to complete');
      return;
    }

    if (!status.result.success) {
      toast.error(status.result.error || 'Verification failed');
      return;
    }

    onMethodSelected(method, status.result);
    onClose();
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'gps': return 'location';
      case 'wifi': return 'wifi';
      case 'qr_code': return 'qr-code';
      default: return 'checkmark';
    }
  };

  const getMethodTitle = (method: string) => {
    switch (method) {
      case 'gps': return 'GPS Location';
      case 'wifi': return 'Office WiFi';
      case 'qr_code': return 'QR Code Scan';
      default: return 'Unknown';
    }
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'gps': return 'Verify your location using GPS coordinates';
      case 'wifi': return 'Verify connection to office WiFi network';
      case 'qr_code': return 'Scan office QR code for verification';
      default: return '';
    }
  };

  const getStatusColor = (status: MethodStatus) => {
    if (status.testing) return '#FF9500';
    if (status.result?.success) return '#34C759';
    if (status.result && !status.result.success) return '#FF3B30';
    return '#8F9BB3';
  };

  const getStatusText = (method: string, status: MethodStatus) => {
    if (method === 'qr_code' && !status.result) {
      return 'Tap to scan QR code';
    }
    
    if (status.testing) return 'Testing...';
    if (status.result?.success) return `Verified (${Math.round(status.result.confidence * 100)}% confidence)`;
    if (status.result && !status.result.success) return status.result.error || 'Verification failed';
    if (status.error) return status.error;
    return 'Ready to test';
  };

  const renderMethodOption = (method: 'gps' | 'wifi' | 'qr_code') => {
    if (!preferredMethods.includes(method)) return null;

    const status = methodStatuses[method];
    const isSelectable = (method === 'qr_code') || (status.result?.success);

    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.methodOption,
          isSelectable && styles.selectableMethod,
          status.result?.success && styles.successMethod
        ]}
        onPress={() => handleMethodSelect(method)}
        disabled={status.testing || (!isSelectable && method !== 'qr_code')}
      >
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: getStatusColor(status) + '20' }]}>
            {status.testing ? (
              <ActivityIndicator size="small" color={getStatusColor(status)} />
            ) : (
              <Ionicons 
                name={getMethodIcon(method)} 
                size={24} 
                color={getStatusColor(status)} 
              />
            )}
          </View>
          
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>{getMethodTitle(method)}</Text>
            <Text style={styles.methodDescription}>{getMethodDescription(method)}</Text>
          </View>

          {status.result?.success && (
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          )}
        </View>

        <View style={styles.methodStatus}>
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {getStatusText(method, status)}
          </Text>
          
          {status.result?.success && (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handleMethodSelect(method)}
            >
              <Text style={styles.selectButtonText}>Use This Method</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Check-in Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#222B45" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select your preferred method to verify your office presence
          </Text>

          <ScrollView style={styles.methodsList} showsVerticalScrollIndicator={false}>
            {renderMethodOption('gps')}
            {renderMethodOption('wifi')}
            {renderMethodOption('qr_code')}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              testGPSMethod();
              testWiFiMethod();
            }}>
              <Ionicons name="refresh" size={20} color="#4A80F0" />
              <Text style={styles.retryButtonText}>Retry All Methods</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* QR Code Scanning Overlay */}
      {isScanning && (
        <Modal visible={true} transparent={true}>
          <View style={styles.scanningOverlay}>
            <View style={styles.scanningContent}>
              <ActivityIndicator size="large" color="#4A80F0" />
              <Text style={styles.scanningText}>Scanning QR Code...</Text>
              <TouchableOpacity 
                style={styles.cancelScanButton}
                onPress={() => setIsScanning(false)}
              >
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 20,
  },
  methodsList: {
    flex: 1,
  },
  methodOption: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  selectableMethod: {
    borderColor: '#4A80F0',
  },
  successMethod: {
    backgroundColor: '#F0F9FF',
    borderColor: '#34C759',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  methodStatus: {
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  selectButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#4A80F0',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  scanningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 16,
    color: '#222B45',
    marginTop: 16,
    marginBottom: 20,
  },
  cancelScanButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelScanText: {
    color: '#4A80F0',
    fontSize: 16,
    fontWeight: '500',
  },
});
