// Smart Office Assistant - React Error Boundary Component
// Catches and handles React component crashes gracefully

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorLogger, ErrorSeverity, ErrorCategory } from '../services/ErrorLoggingService';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to our error logging service
    this.logErrorToBoundary(error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logErrorToBoundary(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await errorLogger.logError(error, {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.UI,
        context: {
          screen: 'ErrorBoundary',
          action: 'componentDidCatch',
          additionalData: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
            errorId: this.state.errorId
          }
        }
      });
    } catch (loggingError) {
      console.error('Failed to log error boundary error:', loggingError);
      console.error('Original error:', error);
      console.error('Error info:', errorInfo);
    }
  }

  private handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleReportError = async () => {
    if (this.state.error && this.state.errorId) {
      try {
        // Force report to remote service
        await errorLogger.logError(this.state.error, {
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.UI,
          context: {
            screen: 'ErrorBoundary',
            action: 'userReportedError',
            additionalData: {
              componentStack: this.state.errorInfo?.componentStack,
              errorBoundary: true,
              errorId: this.state.errorId,
              userReported: true
            }
          },
          reportToRemote: true
        });
        
        // Show success feedback (you might want to use a toast here)
        console.log('Error reported successfully');
      } catch (error) {
        console.error('Failed to report error:', error);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback component is provided, use it
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            </View>
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              We encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'Unknown error occurred'}
              </Text>
              
              {this.state.errorId && (
                <Text style={styles.errorId}>
                  Error ID: {this.state.errorId}
                </Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.reportButton]} 
                onPress={this.handleReportError}
              >
                <Ionicons name="bug-outline" size={20} color="#4A80F0" />
                <Text style={[styles.buttonText, styles.reportButtonText]}>
                  Report Error
                </Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <ScrollView style={styles.debugScroll}>
                  <Text style={styles.debugText}>
                    {this.state.error?.stack}
                  </Text>
                  <Text style={styles.debugText}>
                    Component Stack:
                    {this.state.errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackComponent?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary 
      fallbackComponent={fallbackComponent}
      onError={onError}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

// Specialized error boundary for screens
export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `screen_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.logScreenError(error, errorInfo);
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logScreenError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await errorLogger.logError(error, {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.UI,
        context: {
          screen: 'ScreenErrorBoundary',
          action: 'screenCrash',
          additionalData: {
            componentStack: errorInfo.componentStack,
            screenError: true,
            errorId: this.state.errorId
          }
        }
      });
    } catch (loggingError) {
      console.error('Failed to log screen error:', loggingError);
    }
  }

  private handleGoHome = () => {
    // This would typically navigate to home screen
    // You might want to inject navigation prop or use a navigation service
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="home-outline" size={64} color="#4A80F0" />
          </View>
          
          <Text style={styles.title}>Screen Error</Text>
          <Text style={styles.subtitle}>
            This screen encountered an error. Let's get you back to safety.
          </Text>

          <TouchableOpacity 
            style={[styles.button, styles.retryButton]} 
            onPress={this.handleGoHome}
          >
            <Ionicons name="home-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222B45',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  errorId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#4A80F0',
  },
  reportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportButtonText: {
    color: '#4A80F0',
  },
  debugInfo: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default ErrorBoundary;
