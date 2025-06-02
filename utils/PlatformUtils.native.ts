// Smart Office Assistant - Platform Utilities (Native)
// Native implementation with expo-haptics and expo-blur support

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

// Cache for loaded modules
let hapticsModule: HapticsModule | null = null;
let blurViewModule: BlurViewModule | null = null;
let hapticsLoadAttempted = false;
let blurViewLoadAttempted = false;

/**
 * Native implementation - loads expo-haptics
 */
export const getHapticsModule = (): HapticsModule | null => {
  // Return cached module if already loaded
  if (hapticsModule) return hapticsModule;
  
  // Don't retry if we already attempted and failed
  if (hapticsLoadAttempted) return null;
  
  try {
    hapticsLoadAttempted = true;
    hapticsModule = require('expo-haptics');
    return hapticsModule;
  } catch (error) {
    console.debug('Haptics module not available:', error);
    return null;
  }
};

/**
 * Native implementation - loads expo-blur
 */
export const getBlurViewModule = (): BlurViewModule | null => {
  // Return cached module if already loaded
  if (blurViewModule) return blurViewModule;
  
  // Don't retry if we already attempted and failed
  if (blurViewLoadAttempted) return null;
  
  try {
    blurViewLoadAttempted = true;
    blurViewModule = require('expo-blur');
    return blurViewModule;
  } catch (error) {
    console.debug('BlurView module not available:', error);
    return null;
  }
};

/**
 * Native implementation - triggers haptic feedback
 */
export const triggerHapticFeedback = async (type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): Promise<void> => {
  const haptics = getHapticsModule();
  if (!haptics) return;
  
  try {
    switch (type) {
      case 'success':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Warning);
        break;
      case 'light':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy);
        break;
      default:
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch (error) {
    console.debug('Haptic feedback failed:', error);
  }
};

/**
 * Native implementation - gets BlurView component
 */
export const getBlurViewComponent = (): React.ComponentType<any> => {
  const blurModule = getBlurViewModule();
  if (blurModule && blurModule.BlurView) {
    return blurModule.BlurView;
  }
  
  // Fallback to regular View
  const { View } = require('react-native');
  return View;
};

/**
 * Native implementation - checks haptics availability
 */
export const isHapticsAvailable = (): boolean => {
  return getHapticsModule() !== null;
};

/**
 * Native implementation - checks blur availability
 */
export const isBlurAvailable = (): boolean => {
  return getBlurViewModule() !== null;
};

/**
 * Platform-specific feature detection for native
 */
export const PlatformFeatures = {
  haptics: isHapticsAvailable(),
  blur: isBlurAvailable(),
  web: false,
  ios: Platform.OS === 'ios',
  android: Platform.OS === 'android',
} as const;
