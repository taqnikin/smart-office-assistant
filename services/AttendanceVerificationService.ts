// Smart Office Assistant - Attendance Verification Service
// This service handles multiple check-in verification methods

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { officeAPI, wfhAPI, type OfficeLocation, type WFHApproval } from '../lib/supabase-api';

export interface VerificationResult {
  success: boolean;
  method: 'gps' | 'wifi' | 'qr_code' | 'manual' | 'gps_location' | 'wifi_network' | 'manual_approval';
  confidence: number;
  data: any;
  error?: string;
}

export interface CheckInOptions {
  userId: string;
  status: 'office' | 'wfh' | 'leave';
  transportMode?: string;
  leaveReason?: string;
  preferredMethods?: ('gps' | 'wifi' | 'qr_code')[];
  officeLocationId?: string;
}

export class AttendanceVerificationService {
  private static instance: AttendanceVerificationService;
  private officeLocations: OfficeLocation[] = [];
  private wifiNetworks: string[] = [];

  private constructor() {
    this.loadOfficeConfiguration();
  }

  public static getInstance(): AttendanceVerificationService {
    if (!AttendanceVerificationService.instance) {
      AttendanceVerificationService.instance = new AttendanceVerificationService();
    }
    return AttendanceVerificationService.instance;
  }

  private async loadOfficeConfiguration(): Promise<void> {
    try {
      this.officeLocations = await officeAPI.getOfficeLocations();
      const networks = await officeAPI.getOfficeWiFiNetworks();
      this.wifiNetworks = networks.map(n => n.ssid);
    } catch (error) {
      // Silently fail and use empty arrays - this is handled gracefully in verification methods
    }
  }

  // GPS-based verification
  public async verifyGPSLocation(officeLocationId?: string): Promise<VerificationResult> {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          method: 'gps',
          confidence: 0,
          data: { error: 'Location permission denied' },
          error: 'Location permission is required for GPS verification'
        };
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1
      });

      const userLat = location.coords.latitude;
      const userLng = location.coords.longitude;
      const accuracy = location.coords.accuracy || 10;

      // Find closest office or use specified office
      let targetOffice: OfficeLocation | undefined;
      if (officeLocationId) {
        targetOffice = this.officeLocations.find(o => o.id === officeLocationId);
      } else {
        // Find closest office
        let minDistance = Infinity;
        for (const office of this.officeLocations) {
          const distance = this.calculateDistance(userLat, userLng, office.latitude, office.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            targetOffice = office;
          }
        }
      }

      if (!targetOffice) {
        return {
          success: false,
          method: 'gps',
          confidence: 0,
          data: { error: 'No office location found' },
          error: 'No office location configured'
        };
      }

      // Calculate distance and verify
      const distance = this.calculateDistance(userLat, userLng, targetOffice.latitude, targetOffice.longitude);
      const withinRadius = distance <= targetOffice.geofence_radius;
      
      // Calculate confidence based on accuracy and distance
      let confidence = 1.0;
      if (accuracy > 10) confidence -= 0.2; // Reduce confidence for poor GPS accuracy
      if (distance > targetOffice.geofence_radius * 0.5) confidence -= 0.3; // Reduce confidence if far from center
      confidence = Math.max(0, Math.min(1, confidence));

      return {
        success: withinRadius,
        method: 'gps',
        confidence,
        data: {
          latitude: userLat,
          longitude: userLng,
          accuracy,
          distance,
          office_location_id: targetOffice.id,
          office_name: targetOffice.name,
          geofence_radius: targetOffice.geofence_radius
        },
        error: withinRadius ? undefined : `You are ${Math.round(distance)}m from the office (max: ${targetOffice.geofence_radius}m)`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        method: 'gps',
        confidence: 0,
        data: { error: errorMessage },
        error: `GPS verification failed: ${errorMessage}`
      };
    }
  }

  // WiFi-based verification
  public async verifyWiFiNetwork(officeLocationId?: string): Promise<VerificationResult> {
    try {
      // Note: WiFi SSID detection is limited on mobile platforms
      // This is a simplified implementation - in production, you might need native modules
      
      if (Platform.OS === 'web') {
        return {
          success: false,
          method: 'wifi',
          confidence: 0,
          data: { error: 'WiFi detection not supported on web' },
          error: 'WiFi verification is not available on web platform'
        };
      }

      // For now, we'll simulate WiFi detection
      // In a real implementation, you would use a native module to get the current SSID
      const simulatedSSID = await this.getCurrentWiFiSSID();
      
      if (!simulatedSSID) {
        return {
          success: false,
          method: 'wifi',
          confidence: 0,
          data: { error: 'No WiFi connection detected' },
          error: 'Please connect to office WiFi network'
        };
      }

      // Check if SSID is in office networks
      const isValidNetwork = await officeAPI.isWiFiNetworkValid(simulatedSSID, officeLocationId);
      
      return {
        success: isValidNetwork,
        method: 'wifi',
        confidence: isValidNetwork ? 0.9 : 0,
        data: {
          ssid: simulatedSSID,
          office_location_id: officeLocationId,
          valid_network: isValidNetwork
        },
        error: isValidNetwork ? undefined : `WiFi network "${simulatedSSID}" is not recognized as an office network`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        method: 'wifi',
        confidence: 0,
        data: { error: errorMessage },
        error: `WiFi verification failed: ${errorMessage}`
      };
    }
  }

  // QR Code verification
  public async verifyQRCode(qrCodeValue: string): Promise<VerificationResult> {
    try {
      const qrCode = await officeAPI.validateQRCode(qrCodeValue);
      
      if (!qrCode) {
        return {
          success: false,
          method: 'qr_code',
          confidence: 0,
          data: { code_value: qrCodeValue, valid: false },
          error: 'QR code is not valid for office check-in'
        };
      }

      // Check if QR code is expired
      if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
        return {
          success: false,
          method: 'qr_code',
          confidence: 0,
          data: { code_value: qrCodeValue, expired: true },
          error: 'QR code has expired. Please find a current office QR code'
        };
      }

      return {
        success: true,
        method: 'qr_code',
        confidence: 1.0,
        data: {
          code_value: qrCodeValue,
          qr_code_id: qrCode.id,
          office_location_id: qrCode.office_location_id,
          location_description: qrCode.location_description,
          scan_count: qrCode.scan_count
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        method: 'qr_code',
        confidence: 0,
        data: { error: errorMessage },
        error: `QR code verification failed: ${errorMessage}`
      };
    }
  }

  // WFH verification
  public async verifyWFHApproval(userId: string, date: string): Promise<{
    hasApproval: boolean;
    approval?: WFHApproval;
    needsApproval: boolean;
    eligibility?: any;
  }> {
    try {
      // Check for existing approval
      const approval = await wfhAPI.getWFHApprovalForDate(userId, date);
      
      if (approval) {
        return {
          hasApproval: true,
          approval,
          needsApproval: false
        };
      }

      // Check eligibility for WFH
      const eligibility = await wfhAPI.checkWFHEligibility(userId, date);
      
      return {
        hasApproval: false,
        needsApproval: true,
        eligibility
      };

    } catch (error) {
      return {
        hasApproval: false,
        needsApproval: true,
        eligibility: { eligible: false, reason: 'Verification failed' }
      };
    }
  }

  // Multi-method verification
  public async performMultiMethodVerification(
    options: CheckInOptions
  ): Promise<{
    results: VerificationResult[];
    overallSuccess: boolean;
    primaryMethod: string;
    confidence: number;
  }> {
    const results: VerificationResult[] = [];
    const methods = options.preferredMethods || ['gps', 'wifi', 'qr_code'];

    // For office check-in, try multiple verification methods
    if (options.status === 'office') {
      for (const method of methods) {
        try {
          let result: VerificationResult;
          
          switch (method) {
            case 'gps':
              result = await this.verifyGPSLocation(options.officeLocationId);
              break;
            case 'wifi':
              result = await this.verifyWiFiNetwork(options.officeLocationId);
              break;
            case 'qr_code':
              // QR code verification would be triggered separately by scanning
              continue;
            default:
              continue;
          }
          
          results.push(result);
          
          // If we get a successful verification, we can stop
          if (result.success) {
            break;
          }
        } catch (error) {
          // Silently continue to next verification method
        }
      }
    }

    // Determine overall success and primary method
    const successfulResults = results.filter(r => r.success);
    const overallSuccess = successfulResults.length > 0;
    const primaryMethod = overallSuccess ? successfulResults[0].method : (results[0]?.method || 'gps');
    const confidence = overallSuccess ? Math.max(...successfulResults.map(r => r.confidence)) : 0;

    return {
      results,
      overallSuccess,
      primaryMethod,
      confidence
    };
  }

  // Helper methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  private async getCurrentWiFiSSID(): Promise<string | null> {
    // This is a placeholder implementation
    // In a real app, you would use a native module to get the current WiFi SSID
    // For now, we'll simulate based on platform
    
    if (Platform.OS === 'web') {
      return null;
    }

    // Simulate office WiFi detection for demo purposes
    const officeNetworks = ['SmartOffice-5G', 'SmartOffice-2.4G', 'SmartOffice-Guest'];
    const randomNetwork = officeNetworks[Math.floor(Math.random() * officeNetworks.length)];
    
    // 70% chance of being connected to office WiFi for demo
    return Math.random() > 0.3 ? randomNetwork : 'HomeWiFi-Network';
  }
}

// Export singleton instance
export const attendanceVerificationService = AttendanceVerificationService.getInstance();
