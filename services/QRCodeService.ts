// Smart Office Assistant - QR Code Service
// This service handles QR code scanning for attendance verification

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Conditional imports for camera functionality
let Camera: any = null;
let BarCodeScanner: any = null;

try {
  Camera = require('expo-camera').Camera;
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  // Camera dependencies not available, will use simulation mode
}

export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
  cancelled?: boolean;
}

export interface QRCodePermissions {
  camera: boolean;
  mediaLibrary: boolean;
}

export class QRCodeService {
  private static instance: QRCodeService;

  private constructor() {}

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  // Check and request camera permissions
  public async requestCameraPermissions(): Promise<QRCodePermissions> {
    try {
      let cameraPermission = { status: 'denied' };
      let mediaLibraryPermission = { status: 'denied' };

      // Request camera permission if BarCodeScanner is available
      if (BarCodeScanner && BarCodeScanner.requestPermissionsAsync) {
        cameraPermission = await BarCodeScanner.requestPermissionsAsync();
      } else {
        // BarCodeScanner not available, simulate granted permission for demo
        cameraPermission = { status: 'granted' };
      }

      // Request media library permission
      if (ImagePicker && ImagePicker.requestMediaLibraryPermissionsAsync) {
        mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      return {
        camera: cameraPermission.status === 'granted',
        mediaLibrary: mediaLibraryPermission.status === 'granted'
      };
    } catch (error) {
      return {
        camera: false,
        mediaLibrary: false
      };
    }
  }

  // Get current permission status
  public async getPermissionStatus(): Promise<QRCodePermissions> {
    try {
      let cameraPermission = { status: 'denied' };
      let mediaLibraryPermission = { status: 'denied' };

      // Get camera permission if BarCodeScanner is available
      if (BarCodeScanner && BarCodeScanner.getPermissionsAsync) {
        cameraPermission = await BarCodeScanner.getPermissionsAsync();
      } else {
        // BarCodeScanner not available, simulate granted permission for demo
        cameraPermission = { status: 'granted' };
      }

      // Get media library permission
      if (ImagePicker && ImagePicker.getMediaLibraryPermissionsAsync) {
        mediaLibraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      }

      return {
        camera: cameraPermission.status === 'granted',
        mediaLibrary: mediaLibraryPermission.status === 'granted'
      };
    } catch (error) {
      return {
        camera: false,
        mediaLibrary: false
      };
    }
  }

  // Scan QR code using camera
  public async scanQRCodeWithCamera(): Promise<QRScanResult> {
    try {
      // Check permissions first
      const permissions = await this.getPermissionStatus();
      if (!permissions.camera) {
        const newPermissions = await this.requestCameraPermissions();
        if (!newPermissions.camera) {
          return {
            success: false,
            error: 'Camera permission is required to scan QR codes'
          };
        }
      }

      // For web platform, we'll use a different approach
      if (Platform.OS === 'web') {
        return this.scanQRCodeWeb();
      }

      // For mobile platforms, we would typically use expo-barcode-scanner
      // Since it's not in dependencies yet, we'll simulate the scanning
      return this.simulateQRScan();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `QR code scanning failed: ${errorMessage}`
      };
    }
  }

  // Scan QR code from image gallery
  public async scanQRCodeFromGallery(): Promise<QRScanResult> {
    try {
      // Check permissions
      const permissions = await this.getPermissionStatus();
      if (!permissions.mediaLibrary) {
        const newPermissions = await this.requestCameraPermissions();
        if (!newPermissions.mediaLibrary) {
          return {
            success: false,
            error: 'Media library permission is required to select images'
          };
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) {
        return {
          success: false,
          cancelled: true
        };
      }

      // In a real implementation, you would process the image to extract QR code
      // For now, we'll simulate QR code detection
      const qrData = this.simulateQRCodeFromImage(result.assets[0].uri);
      
      if (qrData) {
        return {
          success: true,
          data: qrData
        };
      } else {
        return {
          success: false,
          error: 'No QR code found in the selected image'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Image QR scanning failed: ${errorMessage}`
      };
    }
  }

  // Web-specific QR code scanning
  private async scanQRCodeWeb(): Promise<QRScanResult> {
    // For web, we would typically use a library like qr-scanner
    // This is a placeholder implementation
    return new Promise((resolve) => {
      // Simulate web QR scanning
      setTimeout(() => {
        const officeQRCodes = [
          'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4',
          'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4',
          'SMARTOFFICE_FLOOR3_RECEPTION_2024_Q4',
          'SMARTOFFICE_CAFETERIA_2024_Q4'
        ];
        
        // 80% chance of successful scan for demo
        if (Math.random() > 0.2) {
          const randomCode = officeQRCodes[Math.floor(Math.random() * officeQRCodes.length)];
          resolve({
            success: true,
            data: randomCode
          });
        } else {
          resolve({
            success: false,
            error: 'Could not detect QR code. Please ensure the code is clearly visible.'
          });
        }
      }, 2000); // Simulate scanning time
    });
  }

  // Simulate QR code scanning for demo purposes
  private simulateQRScan(): Promise<QRScanResult> {
    return new Promise((resolve) => {
      // Simulate scanning delay
      setTimeout(() => {
        const officeQRCodes = [
          'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4',
          'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4',
          'SMARTOFFICE_FLOOR3_RECEPTION_2024_Q4',
          'SMARTOFFICE_CAFETERIA_2024_Q4',
          'SMARTOFFICE_PARKING_2024_Q4'
        ];
        
        const invalidCodes = [
          'RANDOM_QR_CODE_123',
          'EXPIRED_OFFICE_CODE_2023',
          'EXTERNAL_QR_CODE'
        ];

        // 70% chance of scanning valid office QR code
        // 20% chance of scanning invalid QR code
        // 10% chance of scan failure
        const random = Math.random();
        
        if (random < 0.7) {
          // Valid office QR code
          const randomCode = officeQRCodes[Math.floor(Math.random() * officeQRCodes.length)];
          resolve({
            success: true,
            data: randomCode
          });
        } else if (random < 0.9) {
          // Invalid QR code
          const randomCode = invalidCodes[Math.floor(Math.random() * invalidCodes.length)];
          resolve({
            success: true,
            data: randomCode
          });
        } else {
          // Scan failure
          resolve({
            success: false,
            error: 'Could not detect QR code. Please try again.'
          });
        }
      }, 1500); // Simulate scanning time
    });
  }

  // Simulate QR code detection from image
  private simulateQRCodeFromImage(imageUri: string): string | null {
    // In a real implementation, you would use image processing to detect QR codes
    // For demo purposes, we'll randomly return a QR code
    const officeQRCodes = [
      'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4',
      'SMARTOFFICE_FLOOR2_RECEPTION_2024_Q4',
      'SMARTOFFICE_FLOOR3_RECEPTION_2024_Q4'
    ];
    
    // 60% chance of finding QR code in image
    if (Math.random() > 0.4) {
      return officeQRCodes[Math.floor(Math.random() * officeQRCodes.length)];
    }
    
    return null;
  }

  // Validate QR code format
  public isValidOfficeQRCode(qrData: string): boolean {
    // Office QR codes should follow a specific pattern
    const officeQRPattern = /^SMARTOFFICE_[A-Z0-9_]+_\d{4}_Q[1-4]$/;
    return officeQRPattern.test(qrData);
  }

  // Generate QR code data (for admin use)
  public generateOfficeQRCode(location: string, year: number, quarter: number): string {
    const locationCode = location.toUpperCase().replace(/\s+/g, '_');
    return `SMARTOFFICE_${locationCode}_${year}_Q${quarter}`;
  }

  // Parse QR code data
  public parseOfficeQRCode(qrData: string): {
    isValid: boolean;
    location?: string;
    year?: number;
    quarter?: number;
  } {
    if (!this.isValidOfficeQRCode(qrData)) {
      return { isValid: false };
    }

    const parts = qrData.split('_');
    if (parts.length < 4) {
      return { isValid: false };
    }

    const location = parts.slice(1, -2).join('_').replace(/_/g, ' ');
    const year = parseInt(parts[parts.length - 2]);
    const quarter = parseInt(parts[parts.length - 1].replace('Q', ''));

    return {
      isValid: true,
      location,
      year,
      quarter
    };
  }

  // Check if QR code is expired based on current date
  public isQRCodeExpired(qrData: string): boolean {
    const parsed = this.parseOfficeQRCode(qrData);
    if (!parsed.isValid || !parsed.year || !parsed.quarter) {
      return true;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor((now.getMonth() + 3) / 3);

    // QR code is expired if it's from a previous quarter
    if (parsed.year < currentYear) {
      return true;
    }
    
    if (parsed.year === currentYear && parsed.quarter < currentQuarter) {
      return true;
    }

    return false;
  }

  // Get user-friendly location name from QR code
  public getLocationFromQRCode(qrData: string): string {
    const parsed = this.parseOfficeQRCode(qrData);
    if (!parsed.isValid || !parsed.location) {
      return 'Unknown Location';
    }

    // Convert location code back to readable format
    return parsed.location
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

// Export singleton instance
export const qrCodeService = QRCodeService.getInstance();
