// Smart Office Assistant - Image Generation Service
// Service for generating QR code images and other visual assets

interface ImageGenerationOptions {
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
}

interface ImageGenerationParams {
  prompt: string;
  options?: ImageGenerationOptions;
}

/**
 * Generate an image URL from a text prompt
 * This is a placeholder implementation for QR code generation
 */
export async function generateImageUrlFromTool(params: ImageGenerationParams): Promise<string> {
  const { prompt, options = {} } = params;
  
  // For demo purposes, we'll return a placeholder QR code image
  // In a real implementation, this would call an actual image generation API
  
  // Extract QR code text from prompt
  const qrCodeMatch = prompt.match(/"([^"]+)"/);
  const qrCodeText = qrCodeMatch ? qrCodeMatch[1] : 'DEMO_QR_CODE';
  
  // Generate a simple QR code placeholder URL
  // Using a QR code generation service like qr-server.com
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${options.width || 300}x${options.height || 300}&data=${encodeURIComponent(qrCodeText)}&format=png&margin=10`;
  
  return qrCodeUrl;
}

/**
 * Generate QR code image specifically for office locations
 */
export function generateOfficeQRCode(
  locationCode: string, 
  locationName: string,
  size: number = 300
): string {
  const qrData = `SMARTOFFICE_${locationCode.toUpperCase().replace(/\s+/g, '_')}_2024_Q4`;
  
  // Generate QR code with custom styling
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrData)}&format=png&margin=10&color=000000&bgcolor=FFFFFF`;
  
  return qrCodeUrl;
}

/**
 * Generate QR code with custom colors and branding
 */
export function generateBrandedQRCode(
  data: string,
  options: {
    size?: number;
    foregroundColor?: string;
    backgroundColor?: string;
    margin?: number;
  } = {}
): string {
  const {
    size = 300,
    foregroundColor = '000000',
    backgroundColor = 'FFFFFF',
    margin = 10
  } = options;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=${margin}&color=${foregroundColor}&bgcolor=${backgroundColor}`;
  
  return qrCodeUrl;
}

/**
 * Validate QR code data format
 */
export function validateQRCodeData(data: string): boolean {
  // Check if it matches the office QR code pattern
  const officeQRPattern = /^SMARTOFFICE_[A-Z0-9_]+_\d{4}_Q[1-4]$/;
  return officeQRPattern.test(data);
}

/**
 * Parse QR code data to extract location information
 */
export function parseQRCodeData(data: string): {
  isValid: boolean;
  location?: string;
  year?: number;
  quarter?: number;
} {
  const officeQRPattern = /^SMARTOFFICE_([A-Z0-9_]+)_(\d{4})_Q([1-4])$/;
  const match = data.match(officeQRPattern);
  
  if (!match) {
    return { isValid: false };
  }
  
  return {
    isValid: true,
    location: match[1],
    year: parseInt(match[2]),
    quarter: parseInt(match[3])
  };
}

/**
 * Get user-friendly location name from QR code data
 */
export function getLocationNameFromQRCode(data: string): string {
  const parsed = parseQRCodeData(data);
  
  if (!parsed.isValid || !parsed.location) {
    return 'Unknown Location';
  }
  
  // Convert location code back to readable format
  return parsed.location
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate demo QR codes for different office locations
 */
export function generateDemoQRCodes(): Array<{
  id: string;
  name: string;
  code: string;
  imageUrl: string;
  location: string;
  color: string;
}> {
  const locations = [
    { id: 'main', name: 'Main Entrance', location: 'Ground Floor Lobby', color: '#4A80F0' },
    { id: 'floor2', name: 'Floor 2 Reception', location: 'Second Floor', color: '#34C759' },
    { id: 'floor3', name: 'Floor 3 Reception', location: 'Third Floor', color: '#FF9500' },
    { id: 'cafeteria', name: 'Cafeteria', location: 'Ground Floor', color: '#FF2D55' },
    { id: 'parking', name: 'Parking Area', location: 'Parking Lot A', color: '#5856D6' },
  ];
  
  return locations.map(location => {
    const code = generateOfficeQRCode(location.name, location.name);
    const qrData = `SMARTOFFICE_${location.name.toUpperCase().replace(/\s+/g, '_')}_2024_Q4`;
    
    return {
      id: location.id,
      name: location.name,
      code: qrData,
      imageUrl: generateBrandedQRCode(qrData, { 
        size: 300,
        foregroundColor: location.color.replace('#', ''),
        backgroundColor: 'FFFFFF'
      }),
      location: location.location,
      color: location.color
    };
  });
}

/**
 * Create QR code with embedded logo (placeholder implementation)
 */
export function generateQRCodeWithLogo(
  data: string,
  logoUrl?: string,
  size: number = 300
): string {
  // For demo purposes, return a standard QR code
  // In a real implementation, this would embed a logo in the center
  return generateBrandedQRCode(data, { size });
}

/**
 * Generate QR code for specific office scenarios
 */
export function generateScenarioQRCode(scenario: 'valid' | 'expired' | 'invalid'): {
  code: string;
  imageUrl: string;
  description: string;
} {
  switch (scenario) {
    case 'valid':
      const validCode = 'SMARTOFFICE_MAIN_ENTRANCE_2024_Q4';
      return {
        code: validCode,
        imageUrl: generateBrandedQRCode(validCode),
        description: 'Valid office QR code for current quarter'
      };
      
    case 'expired':
      const expiredCode = 'SMARTOFFICE_OLD_ENTRANCE_2023_Q4';
      return {
        code: expiredCode,
        imageUrl: generateBrandedQRCode(expiredCode, { 
          foregroundColor: '8E8E93',
          backgroundColor: 'F8F8F8'
        }),
        description: 'Expired QR code from previous quarter'
      };
      
    case 'invalid':
      const invalidCode = 'RANDOM_QR_CODE_123';
      return {
        code: invalidCode,
        imageUrl: generateBrandedQRCode(invalidCode, { 
          foregroundColor: 'FF3B30',
          backgroundColor: 'FFF0F0'
        }),
        description: 'Invalid QR code not recognized by system'
      };
      
    default:
      return generateScenarioQRCode('valid');
  }
}

/**
 * Export all QR code generation functions
 */
export const QRCodeGenerator = {
  generateImageUrl: generateImageUrlFromTool,
  generateOfficeQRCode,
  generateBrandedQRCode,
  generateDemoQRCodes,
  generateQRCodeWithLogo,
  generateScenarioQRCode,
  validateQRCodeData,
  parseQRCodeData,
  getLocationNameFromQRCode,
};

export default QRCodeGenerator;
