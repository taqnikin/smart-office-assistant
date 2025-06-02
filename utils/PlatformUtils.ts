// Smart Office Assistant - Platform Utilities
// Cross-platform utilities with automatic platform detection

import { Platform } from 'react-native';

// Re-export everything from the appropriate platform-specific module
if (Platform.OS === 'web') {
  // Web implementation
  export * from './PlatformUtils.web';
} else {
  // Native implementation (iOS/Android)
  export * from './PlatformUtils.native';
}
