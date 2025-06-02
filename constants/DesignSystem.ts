// Smart Office Assistant - Design System
// Centralized design tokens for consistent UI/UX across the app

export const Colors = {
  // Primary Colors
  primary: '#4A80F0',
  primaryLight: '#E6EFFE',
  primaryDark: '#3366CC',
  
  // Secondary Colors
  secondary: '#34C759',
  secondaryLight: '#E8F5E8',
  
  // Accent Colors
  accent: '#FF9500',
  accentLight: '#FFF8F0',
  
  // Status Colors
  success: '#34C759',
  successLight: '#E8F5E8',
  warning: '#FF9500',
  warningLight: '#FFF8F0',
  error: '#FF3B30',
  errorLight: '#FFE8E8',
  info: '#007AFF',
  infoLight: '#E6F3FF',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray Scale
  gray50: '#F8F9FD',
  gray100: '#F0F7FF',
  gray200: '#EDF1F7',
  gray300: '#E5E5E5',
  gray400: '#CCCCCC',
  gray500: '#8F9BB3',
  gray600: '#666666',
  gray700: '#555555',
  gray800: '#333333',
  gray900: '#222B45',
  
  // Background Colors
  background: '#F8F9FD',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Text Colors
  textPrimary: '#222B45',
  textSecondary: '#8F9BB3',
  textTertiary: '#CCCCCC',
  textInverse: '#FFFFFF',
  
  // Border Colors
  border: '#EDF1F7',
  borderLight: '#F0F7FF',
  borderDark: '#E5E5E5',
};

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const Layout = {
  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Header heights
  header: {
    default: 60,
    large: 80,
  },
  
  // Button heights
  button: {
    sm: 36,
    base: 44,
    lg: 52,
  },
  
  // Input heights
  input: {
    sm: 36,
    base: 44,
    lg: 52,
  },
};

export const Animation = {
  // Duration
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Easing
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Component-specific design tokens
export const Components = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Shadows.base,
  },

  button: {
    primary: {
      backgroundColor: Colors.primary,
      color: Colors.textInverse,
      borderRadius: BorderRadius.base,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    secondary: {
      backgroundColor: Colors.primaryLight,
      color: Colors.primary,
      borderRadius: BorderRadius.base,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    outline: {
      backgroundColor: 'transparent',
      color: Colors.primary,
      borderColor: Colors.primary,
      borderWidth: 1,
      borderRadius: BorderRadius.base,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
  },

  notification: {
    toast: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.base,
      marginHorizontal: Spacing.base,
      marginVertical: Spacing.xs,
      ...Shadows.lg,
      borderLeftWidth: 4,
    },
    modal: {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      margin: Spacing.lg,
      ...Shadows.xl,
      maxWidth: 400,
    },
    types: {
      success: {
        borderLeftColor: Colors.success,
        iconColor: Colors.success,
        backgroundColor: Colors.successLight,
      },
      error: {
        borderLeftColor: Colors.error,
        iconColor: Colors.error,
        backgroundColor: Colors.errorLight,
      },
      warning: {
        borderLeftColor: Colors.warning,
        iconColor: Colors.warning,
        backgroundColor: Colors.warningLight,
      },
      info: {
        borderLeftColor: Colors.info,
        iconColor: Colors.info,
        backgroundColor: Colors.infoLight,
      },
      confirmation: {
        borderLeftColor: Colors.primary,
        iconColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
      },
    },
  },
  
  input: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    height: Layout.header.default,
  },
};

// Utility functions for consistent styling
export const createStyles = {
  // Create consistent card styles
  card: (customStyles = {}) => ({
    ...Components.card,
    ...customStyles,
  }),
  
  // Create consistent button styles
  button: (variant: 'primary' | 'secondary' | 'outline' = 'primary', customStyles = {}) => ({
    ...Components.button[variant],
    ...customStyles,
  }),
  
  // Create consistent input styles
  input: (customStyles = {}) => ({
    ...Components.input,
    ...customStyles,
  }),
  
  // Create consistent header styles
  header: (customStyles = {}) => ({
    ...Components.header,
    ...customStyles,
  }),
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  Components,
  createStyles,
};
