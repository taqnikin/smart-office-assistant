// Smart Office Assistant - Platform Utilities (Web)
// Web-specific implementation with no native dependencies

import { Platform } from 'react-native';

// Type definitions for platform-specific modules
interface HapticsModule {
  notificationAsync: (type: any) => Promise<void>;
  impactAsync: (style: any) => Promise<void>;
  NotificationFeedbackType: {
    Success: any;
    Error: any;
    Warning: any;
  };
  ImpactFeedbackStyle: {
    Light: any;
    Medium: any;
    Heavy: any;
  };
}

interface BlurViewModule {
  BlurView: React.ComponentType<any>;
}

/**
 * Web implementation - always returns null for haptics
 */
export const getHapticsModule = (): HapticsModule | null => {
  return null;
};

/**
 * Web implementation - always returns null for blur
 */
export const getBlurViewModule = (): BlurViewModule | null => {
  return null;
};

/**
 * Web implementation - no haptic feedback
 */
export const triggerHapticFeedback = async (type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): Promise<void> => {
  // No haptic feedback on web
  return;
};

/**
 * Web implementation - returns regular View component
 */
export const getBlurViewComponent = (): React.ComponentType<any> => {
  const { View } = require('react-native');
  return View;
};

/**
 * Web implementation - haptics not available
 */
export const isHapticsAvailable = (): boolean => {
  return false;
};

/**
 * Web implementation - blur not available
 */
export const isBlurAvailable = (): boolean => {
  return false;
};

/**
 * Platform-specific feature detection for web
 */
export const PlatformFeatures = {
  haptics: false,
  blur: false,
  web: true,
  ios: false,
  android: false,
} as const;
