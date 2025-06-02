// Smart Office Assistant - Responsive Design Hook
// Custom hook for responsive design with real-time screen dimension updates

import { useState, useEffect } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';
import {
  getDeviceType,
  isMobile,
  isTablet,
  isDesktop,
  responsiveFontSize,
  responsiveSpacing,
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
} from '../utils/responsive';

export interface ResponsiveConfig {
  width: number;
  height: number;
  deviceType: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallScreen: boolean;
  isLargeScreen: boolean;
}

export interface ResponsiveFunctions {
  fontSize: (size: number) => number;
  spacing: (size: number) => number;
  gridColumns: number;
  cardWidth: (padding?: number) => number;
  touchTargetSize: (size?: number) => number;
  tabConfig: ReturnType<typeof getTabConfig>;
  chartDimensions: ReturnType<typeof getChartDimensions>;
  modalDimensions: ReturnType<typeof getModalDimensions>;
  containerPadding: number;
  statCardConfig: ReturnType<typeof getStatCardConfig>;
  textSizes: ReturnType<typeof getTextSizes>;
}

export type ResponsiveHook = ResponsiveConfig & ResponsiveFunctions;

/**
 * Custom hook for responsive design
 * Provides real-time screen dimensions and responsive utilities
 */
export const useResponsive = (): ResponsiveHook => {
  const { width, height } = useWindowDimensions();
  
  // Memoized responsive configuration
  const config: ResponsiveConfig = {
    width,
    height,
    deviceType: getDeviceType(width),
    isMobile: isMobile(width),
    isTablet: isTablet(width),
    isDesktop: isDesktop(width),
    isSmallScreen: width < BREAKPOINTS.md,
    isLargeScreen: width >= BREAKPOINTS.lg,
  };

  // Responsive functions with current dimensions
  const functions: ResponsiveFunctions = {
    fontSize: (size: number) => responsiveFontSize(size, width),
    spacing: (size: number) => responsiveSpacing(size, width),
    gridColumns: getGridColumns(width),
    cardWidth: (padding = 16) => getCardWidth(width, padding),
    touchTargetSize: getTouchTargetSize,
    tabConfig: getTabConfig(width),
    chartDimensions: getChartDimensions(width),
    modalDimensions: getModalDimensions(width, height),
    containerPadding: getContainerPadding(width),
    statCardConfig: getStatCardConfig(width),
    textSizes: getTextSizes(width),
  };

  return { ...config, ...functions };
};

/**
 * Hook for responsive styles
 * Returns style objects based on screen size
 */
export const useResponsiveStyles = () => {
  const responsive = useResponsive();
  
  return {
    // Container styles
    container: {
      flex: 1,
      paddingHorizontal: responsive.containerPadding,
    },
    
    // Header styles
    header: {
      paddingHorizontal: responsive.containerPadding,
      paddingVertical: responsive.spacing(16),
      minHeight: responsive.touchTargetSize(60),
    },
    
    // Card styles
    card: {
      borderRadius: responsive.spacing(12),
      padding: responsive.spacing(16),
      marginBottom: responsive.spacing(12),
    },
    
    // Button styles
    button: {
      borderRadius: responsive.spacing(8),
      paddingVertical: responsive.spacing(12),
      paddingHorizontal: responsive.spacing(16),
      minHeight: responsive.touchTargetSize(),
    },
    
    // Text styles
    title: {
      fontSize: responsive.textSizes.title,
      fontWeight: '600',
    },
    
    subtitle: {
      fontSize: responsive.textSizes.subtitle,
      fontWeight: '500',
    },
    
    body: {
      fontSize: responsive.textSizes.body,
    },
    
    caption: {
      fontSize: responsive.textSizes.caption,
    },
    
    // Tab styles
    tab: {
      minHeight: responsive.touchTargetSize(responsive.tabConfig.tabHeight),
      paddingHorizontal: responsive.spacing(responsive.isMobile ? 8 : 16),
    },
    
    // Grid styles
    gridContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -responsive.spacing(8),
    },
    
    gridItem: {
      width: responsive.cardWidth(responsive.spacing(16)),
      marginHorizontal: responsive.spacing(8),
      marginBottom: responsive.spacing(16),
    },
  };
};

/**
 * Hook for responsive layout configurations
 */
export const useResponsiveLayout = () => {
  const responsive = useResponsive();
  
  return {
    // Admin dashboard layout
    adminDashboard: {
      tabsScrollable: responsive.tabConfig.scrollable,
      showTabLabels: responsive.tabConfig.showLabels,
      statsCardsPerRow: responsive.statCardConfig.cardsPerRow,
      chartHeight: responsive.chartDimensions.height,
      sidebarCollapsed: responsive.isMobile,
    },
    
    // Booking management layout
    bookingManagement: {
      listItemHeight: responsive.isMobile ? 80 : 100,
      showAvatars: !responsive.isSmallScreen,
      compactMode: responsive.isSmallScreen,
    },
    
    // AI insights layout
    aiInsights: {
      chartWidth: responsive.chartDimensions.width,
      chartHeight: responsive.chartDimensions.height,
      predictionCardsPerRow: responsive.isMobile ? 1 : 2,
      showDetailedMetrics: !responsive.isSmallScreen,
    },
    
    // Navigation layout
    navigation: {
      bottomTabBar: responsive.isMobile,
      sideNavigation: !responsive.isMobile,
      iconSize: responsive.tabConfig.iconSize,
      showLabels: responsive.tabConfig.showLabels,
    },
    
    // Modal layout
    modal: {
      fullScreen: responsive.isSmallScreen,
      width: responsive.modalDimensions.width,
      height: responsive.modalDimensions.height,
      maxHeight: responsive.modalDimensions.maxHeight,
    },
  };
};

/**
 * Hook for responsive breakpoint detection
 */
export const useBreakpoint = () => {
  const { width } = useWindowDimensions();
  
  return {
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS.xxl,
    isXxl: width >= BREAKPOINTS.xxl,
    
    // Utility functions
    up: (breakpoint: keyof typeof BREAKPOINTS) => width >= BREAKPOINTS[breakpoint],
    down: (breakpoint: keyof typeof BREAKPOINTS) => width < BREAKPOINTS[breakpoint],
    between: (min: keyof typeof BREAKPOINTS, max: keyof typeof BREAKPOINTS) => 
      width >= BREAKPOINTS[min] && width < BREAKPOINTS[max],
  };
};

/**
 * Hook for responsive orientation handling
 */
export const useOrientation = () => {
  const { width, height } = useWindowDimensions();
  
  return {
    isPortrait: height > width,
    isLandscape: width > height,
    aspectRatio: width / height,
  };
};

export default useResponsive;
