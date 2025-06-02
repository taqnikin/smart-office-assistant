// Smart Office Assistant - QR Code Display Screen
// This screen displays demo QR codes for testing the scanning functionality

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

interface QRCodeLocation {
  id: string;
  name: string;
  description: string;
  code: string;
  location: string;
  floor?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  status: 'active' | 'expired' | 'maintenance';
}

const DEMO_QR_CODES: QRCodeLocation[] = [
  {
    id: '1',
    name: 'Main Entrance',
    description: 'Primary office entrance lobby',
    code: 'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4',
    location: 'Ground Floor Lobby',
    icon: 'business',
    color: '#4A80F0',
    status: 'active'
  },
  {
    id: '2',
    name: 'Floor 2 Reception',
    description: 'Second floor reception desk',
    code: 'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4',
    location: 'Floor 2 Reception',
    floor: '2nd Floor',
    icon: 'people',
    color: '#34C759',
    status: 'active'
  },
  {
    id: '3',
    name: 'Floor 3 Reception',
    description: 'Third floor reception desk',
    code: 'SMARTOFFICE_FLOOR3_RECEPTION_2024_Q4',
    location: 'Floor 3 Reception',
    floor: '3rd Floor',
    icon: 'people-circle',
    color: '#FF9500',
    status: 'active'
  },
  {
    id: '4',
    name: 'Cafeteria',
    description: 'Employee cafeteria entrance',
    code: 'SMARTOFFICE_CAFETERIA_2024_Q4',
    location: 'Ground Floor Cafeteria',
    icon: 'restaurant',
    color: '#FF2D55',
    status: 'active'
  },
  {
    id: '5',
    name: 'Parking Area',
    description: 'Main parking lot entrance',
    code: 'SMARTOFFICE_PARKING_2024_Q4',
    location: 'Parking Lot A',
    icon: 'car',
    color: '#5856D6',
    status: 'active'
  },
  {
    id: '6',
    name: 'Expired Code',
    description: 'Example of expired QR code',
    code: 'SMARTOFFICE_OLD_ENTRANCE_2023_Q4',
    location: 'Old Location',
    icon: 'warning',
    color: '#8E8E93',
    status: 'expired'
  }
];

export default function QRCodeDisplayScreen() {
  const navigation = useNavigation();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Generate QR code images for each location
    generateQRCodeImages();
  }, []);

  const generateQRCodeImages = async () => {
    for (const qrCode of DEMO_QR_CODES) {
      setLoadingImages(prev => ({ ...prev, [qrCode.id]: true }));

      try {
        // Generate QR code image using a simple QR code API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode.code)}&format=png&margin=10&color=000000&bgcolor=FFFFFF`;

        setQrImages(prev => ({ ...prev, [qrCode.id]: qrCodeUrl }));
      } catch (error) {
        console.error(`Failed to generate QR code for ${qrCode.name}:`, error);
        // Use a placeholder or text representation
        setQrImages(prev => ({ ...prev, [qrCode.id]: 'placeholder' }));
      } finally {
        setLoadingImages(prev => ({ ...prev, [qrCode.id]: false }));
      }
    }
  };

  const handleQRCodePress = (qrCode: QRCodeLocation) => {
    if (qrCode.status === 'expired') {
      Alert.alert(
        'Expired QR Code',
        'This QR code has expired and cannot be used for check-in. This is for demonstration purposes.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedCode(qrCode.code);
    Alert.alert(
      'QR Code Selected',
      `You selected: ${qrCode.name}\nCode: ${qrCode.code}\n\nWould you like to test scanning this code?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Test Scan', 
          onPress: () => {
            navigation.navigate('QRScanner', { 
              fromDemo: true, 
              demoMode: true,
              preselectedCode: qrCode.code 
            });
          }
        }
      ]
    );
  };

  const handleStartDemo = () => {
    navigation.navigate('QRScanner', { 
      fromDemo: true, 
      demoMode: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'expired': return '#FF3B30';
      case 'maintenance': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  };

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
          style={styles.scanButton}
          onPress={handleStartDemo}
        >
          <Ionicons name="qr-code-outline" size={24} color="#4A80F0" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <View style={styles.instructionHeader}>
          <Ionicons name="information-circle" size={24} color="#4A80F0" />
          <Text style={styles.instructionTitle}>How to Use</Text>
        </View>
        <Text style={styles.instructionText}>
          1. Tap any QR code below to select it{'\n'}
          2. Choose "Test Scan" to simulate scanning{'\n'}
          3. Or tap the scan button to open the camera scanner{'\n'}
          4. Experience the complete check-in flow
        </Text>
      </View>

      {/* QR Codes Grid */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available QR Codes</Text>
        
        <View style={styles.qrGrid}>
          {DEMO_QR_CODES.map((qrCode) => (
            <TouchableOpacity
              key={qrCode.id}
              style={[
                styles.qrCard,
                selectedCode === qrCode.code && styles.selectedCard,
                qrCode.status === 'expired' && styles.expiredCard
              ]}
              onPress={() => handleQRCodePress(qrCode)}
            >
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(qrCode.status) }]}>
                <Text style={styles.statusText}>{getStatusText(qrCode.status)}</Text>
              </View>

              {/* QR Code Image Placeholder */}
              <View style={[styles.qrImageContainer, { borderColor: qrCode.color }]}>
                {loadingImages[qrCode.id] ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Generating...</Text>
                  </View>
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={60} color={qrCode.color} />
                    <Text style={[styles.qrCodeText, { color: qrCode.color }]}>
                      {qrCode.code}
                    </Text>
                  </View>
                )}
              </View>

              {/* Location Info */}
              <View style={styles.locationInfo}>
                <View style={styles.locationHeader}>
                  <Ionicons name={qrCode.icon} size={20} color={qrCode.color} />
                  <Text style={styles.locationName}>{qrCode.name}</Text>
                </View>
                <Text style={styles.locationDescription}>{qrCode.description}</Text>
                <Text style={styles.locationAddress}>{qrCode.location}</Text>
                {qrCode.floor && (
                  <Text style={styles.floorText}>{qrCode.floor}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Demo Actions */}
        <View style={styles.demoActions}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleStartDemo}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Start Camera Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Attendance')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#4A80F0" />
            <Text style={styles.secondaryButtonText}>Go to Attendance</Text>
          </TouchableOpacity>
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
  scanButton: {
    padding: 8,
  },
  instructionsCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  qrGrid: {
    paddingHorizontal: 20,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5E7',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#4A80F0',
    backgroundColor: '#F0F4FF',
  },
  expiredCard: {
    opacity: 0.6,
    backgroundColor: '#F8F8F8',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  qrCodeText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  locationInfo: {
    alignItems: 'center',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  floorText: {
    fontSize: 12,
    color: '#4A80F0',
    fontWeight: '500',
    marginTop: 4,
  },
  demoActions: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A80F0',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A80F0',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
});
