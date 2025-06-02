// Smart Office Assistant - Responsive Design Utilities
// Comprehensive utilities for mobile-first responsive design

import { Dimensions, PixelRatio } from 'react-native';

// Get current screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Screen size breakpoints
export const BREAKPOINTS = {
  xs: 320,   // iPhone SE
  sm: 375,   // iPhone 12 mini
  md: 414,   // iPhone 12 Pro
  lg: 768,   // iPad mini
  xl: 1024,  // iPad
  xxl: 1280, // Large tablets
};

// Device type detection
export const getDeviceType = (width: number = getScreenDimensions().width) => {
  if (width < BREAKPOINTS.sm) return 'xs';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS.xxl) return 'xl';
  return 'xxl';
};

// Check if device is mobile
export const isMobile = (width: number = getScreenDimensions().width) => {
  return width < BREAKPOINTS.lg;
};

// Check if device is tablet
export const isTablet = (width: number = getScreenDimensions().width) => {
  return width >= BREAKPOINTS.lg && width < BREAKPOINTS.xxl;
};

// Check if device is desktop/large screen
export const isDesktop = (width: number = getScreenDimensions().width) => {
  return width >= BREAKPOINTS.xxl;
};

// Responsive font scaling
export const responsiveFontSize = (size: number, width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  const scale = PixelRatio.getFontScale();
  
  let scaleFactor = 1;
  switch (deviceType) {
    case 'xs':
      scaleFactor = 0.85;
      break;
    case 'sm':
      scaleFactor = 0.9;
      break;
    case 'md':
      scaleFactor = 1;
      break;
    case 'lg':
      scaleFactor = 1.1;
      break;
    case 'xl':
      scaleFactor = 1.2;
      break;
    case 'xxl':
      scaleFactor = 1.3;
      break;
  }
  
  return Math.round(size * scaleFactor * scale);
};

// Responsive spacing
export const responsiveSpacing = (size: number, width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  
  let scaleFactor = 1;
  switch (deviceType) {
    case 'xs':
      scaleFactor = 0.8;
      break;
    case 'sm':
      scaleFactor = 0.9;
      break;
    case 'md':
      scaleFactor = 1;
      break;
    case 'lg':
      scaleFactor = 1.2;
      break;
    case 'xl':
      scaleFactor = 1.4;
      break;
    case 'xxl':
      scaleFactor = 1.6;
      break;
  }
  
  return Math.round(size * scaleFactor);
};

// Responsive width calculations
export const responsiveWidth = (percentage: number, width: number = getScreenDimensions().width) => {
  return (width * percentage) / 100;
};

// Responsive height calculations
export const responsiveHeight = (percentage: number, height: number = getScreenDimensions().height) => {
  return (height * percentage) / 100;
};

// Get number of columns for grid layouts
export const getGridColumns = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  
  switch (deviceType) {
    case 'xs':
    case 'sm':
      return 1; // Single column on small phones
    case 'md':
      return 2; // Two columns on larger phones
    case 'lg':
      return 3; // Three columns on tablets
    case 'xl':
    case 'xxl':
      return 4; // Four columns on large screens
    default:
      return 2;
  }
};

// Get card width for responsive grids
export const getCardWidth = (width: number = getScreenDimensions().width, padding: number = 16) => {
  const columns = getGridColumns(width);
  const totalPadding = padding * (columns + 1);
  return (width - totalPadding) / columns;
};

// Touch target size (minimum 44px for accessibility)
export const getTouchTargetSize = (size: number = 44) => {
  return Math.max(size, 44);
};

// Responsive tab configuration
export const getTabConfig = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  
  if (deviceType === 'xs' || deviceType === 'sm') {
    return {
      showLabels: false,
      iconSize: 20,
      tabHeight: 50,
      maxTabs: 4, // Show only 4 tabs on small screens
      scrollable: true,
    };
  } else if (deviceType === 'md') {
    return {
      showLabels: true,
      iconSize: 22,
      tabHeight: 60,
      maxTabs: 5,
      scrollable: false,
    };
  } else {
    return {
      showLabels: true,
      iconSize: 24,
      tabHeight: 70,
      maxTabs: 6,
      scrollable: false,
    };
  }
};

// Chart dimensions for mobile
export const getChartDimensions = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  const padding = responsiveSpacing(16, width);
  
  const chartWidth = width - (padding * 2);
  
  let chartHeight;
  switch (deviceType) {
    case 'xs':
    case 'sm':
      chartHeight = 200;
      break;
    case 'md':
      chartHeight = 250;
      break;
    case 'lg':
      chartHeight = 300;
      break;
    default:
      chartHeight = 350;
  }
  
  return { width: chartWidth, height: chartHeight };
};

// Responsive modal dimensions
export const getModalDimensions = (width: number = getScreenDimensions().width, height: number = getScreenDimensions().height) => {
  const deviceType = getDeviceType(width);
  
  if (deviceType === 'xs' || deviceType === 'sm') {
    return {
      width: width - 32,
      height: height * 0.8,
      maxHeight: height - 100,
    };
  } else if (deviceType === 'md') {
    return {
      width: width - 48,
      height: height * 0.7,
      maxHeight: height - 120,
    };
  } else {
    return {
      width: Math.min(600, width - 64),
      height: height * 0.6,
      maxHeight: height - 140,
    };
  }
};

// Responsive padding for containers
export const getContainerPadding = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  
  switch (deviceType) {
    case 'xs':
      return 12;
    case 'sm':
      return 16;
    case 'md':
      return 20;
    case 'lg':
      return 24;
    case 'xl':
    case 'xxl':
      return 32;
    default:
      return 16;
  }
};

// Responsive stat card configuration
export const getStatCardConfig = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  const padding = getContainerPadding(width);
  
  if (deviceType === 'xs') {
    return {
      cardsPerRow: 1,
      cardWidth: width - (padding * 2),
      cardHeight: 100,
      spacing: 12,
    };
  } else if (deviceType === 'sm') {
    return {
      cardsPerRow: 2,
      cardWidth: (width - (padding * 2) - 12) / 2,
      cardHeight: 110,
      spacing: 12,
    };
  } else if (deviceType === 'md') {
    return {
      cardsPerRow: 2,
      cardWidth: (width - (padding * 2) - 16) / 2,
      cardHeight: 120,
      spacing: 16,
    };
  } else {
    return {
      cardsPerRow: 4,
      cardWidth: (width - (padding * 2) - 48) / 4,
      cardHeight: 140,
      spacing: 16,
    };
  }
};

// Responsive text scaling for different content types
export const getTextSizes = (width: number = getScreenDimensions().width) => {
  const deviceType = getDeviceType(width);
  
  const baseSizes = {
    xs: { title: 18, subtitle: 14, body: 12, caption: 10 },
    sm: { title: 20, subtitle: 16, body: 14, caption: 12 },
    md: { title: 22, subtitle: 18, body: 16, caption: 14 },
    lg: { title: 26, subtitle: 20, body: 18, caption: 16 },
    xl: { title: 30, subtitle: 24, body: 20, caption: 18 },
    xxl: { title: 34, subtitle: 28, body: 22, caption: 20 },
  };
  
  return baseSizes[deviceType] || baseSizes.md;
};

// Export all utilities
export default {
  getScreenDimensions,
  getDeviceType,
  isMobile,
  isTablet,
  isDesktop,
  responsiveFontSize,
  responsiveSpacing,
  responsiveWidth,
  responsiveHeight,
  getGridColumns,
  getCardWidth,
  getTouchTargetSize,
  getTabConfig,
  getChartDimensions,
  getModalDimensions,
  getContainerPadding,
  getStatCardConfig,
  getTextSizes,
  BREAKPOINTS,
};
