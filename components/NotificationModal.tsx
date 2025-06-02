// Smart Office Assistant - Notification Modal Component
// Modal component for displaying confirmation dialogs and important notifications

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Components } from '../constants/DesignSystem';
import { getBlurViewComponent } from '../utils/PlatformUtils';
import { NotificationState, TypeIconMap } from '../types/NotificationTypes';

interface NotificationModalProps {
  notification: NotificationState;
  onDismiss: (id: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  onDismiss,
}) => {
  const { config } = notification;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (notification.isVisible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification.isVisible, fadeAnim, scaleAnim]);

  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  const handleBackdropPress = () => {
    if (config.variant === 'modal' && config.backdropDismiss !== false) {
      handleDismiss();
    }
  };

  const handleActionPress = (action: any) => {
    action.onPress();
    if (action.style !== 'cancel') {
      handleDismiss();
    }
  };

  const getModalSize = () => {
    if (config.variant === 'modal') {
      switch (config.size) {
        case 'small':
          return { width: Math.min(300, screenWidth - 40) };
        case 'large':
          return { width: Math.min(500, screenWidth - 40) };
        default:
          return { width: Math.min(400, screenWidth - 40) };
      }
    }
    return { width: Math.min(400, screenWidth - 40) };
  };

  const getTypeStyles = () => {
    return Components.notification.types[config.type] || Components.notification.types.info;
  };

  const getIcon = () => {
    if (config.customIcon) {
      return config.customIcon;
    }
    
    const iconName = config.icon || TypeIconMap[config.type];
    const typeStyles = getTypeStyles();
    
    return (
      <Ionicons 
        name={iconName as any} 
        size={24} 
        color={typeStyles.iconColor} 
      />
    );
  };

  return (
    <Modal
      visible={notification.isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          {config.variant === 'modal' && config.backdrop !== false && (() => {
            const BlurComponent = getBlurViewComponent();
            if (Platform.OS !== 'web') {
              return <BlurComponent intensity={20} style={StyleSheet.absoluteFill} />;
            } else {
              return <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />;
            }
          })()}
          
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.modalContainer,
                getModalSize(),
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={[styles.modal, getTypeStyles()]}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    {getIcon()}
                  </View>
                  
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{config.title}</Text>
                    {config.message && (
                      <Text style={styles.message}>{config.message}</Text>
                    )}
                  </View>
                  
                  {config.dismissible !== false && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleDismiss}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Actions */}
                {config.actions && config.actions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    {config.actions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionButton,
                          action.style === 'destructive' && styles.destructiveButton,
                          action.style === 'cancel' && styles.cancelButton,
                          index === config.actions!.length - 1 && styles.lastActionButton,
                        ]}
                        onPress={() => handleActionPress(action)}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            action.style === 'destructive' && styles.destructiveButtonText,
                            action.style === 'cancel' && styles.cancelButtonText,
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    maxHeight: screenHeight * 0.8,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.xl,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.lg,
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal as any,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  closeButton: {
    marginLeft: Spacing.md,
    padding: Spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  lastActionButton: {
    // No additional styles needed
  },
  cancelButton: {
    backgroundColor: Colors.gray200,
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.textInverse,
  },
  cancelButtonText: {
    color: Colors.textPrimary,
  },
  destructiveButtonText: {
    color: Colors.textInverse,
  },
});
