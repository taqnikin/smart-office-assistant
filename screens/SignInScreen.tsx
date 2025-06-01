import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { AuthContext } from '../AuthContext';
import { toast } from 'sonner-native';
import { Ionicons } from '@expo/vector-icons';
import { validationService } from '../services/ValidationService';

export default function SignInScreen() {
  const auth = useContext(AuthContext);
  const { loading: authLoading } = auth;
  const signIn = auth.signIn;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    // Reset any previous error
    setErrorMessage('');

    // Validate email
    const emailValidation = validationService.validateEmail(email);
    if (!emailValidation.isValid) {
      const errorMsg = emailValidation.errors[0];
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate password
    if (!password) {
      setErrorMessage('Password is required');
      toast.error('Password is required');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Validate signIn function exists
      if (typeof signIn !== 'function') {
        console.error('SignIn function is not available yet');
        setErrorMessage('Authentication is initializing. Please try again in a moment.');
        toast.error('Authentication is initializing. Please try again.');
        return;
      }
      
      const { error } = await signIn(email.trim(), password);
      
      if (error) {
        console.error('Sign in error:', error.message);
        setErrorMessage(error.message || 'Invalid login credentials');
        toast.error(error.message || 'Invalid login credentials');
      } else {
        setErrorMessage('');
        toast.success('Signed in successfully');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillTestCredentials = useCallback((type: 'user' | 'admin') => {
    // Clear any previous error when filling credentials
    setErrorMessage('');
    
    if (type === 'user') {
      setEmail('user1@example.com');
      setPassword('user123');
    } else {
      setEmail('admin1@example.com');
      setPassword('admin123');
    }
  }, []);

  const isLoading = isSubmitting || authLoading;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.title}>SmartOffice Sign In</Text>
            <Text style={styles.subtitle}>Use your ID and password to sign in</Text>
            
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  // Clear error when typing
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                editable={!isLoading}
                testID="email-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  // Clear error when typing
                  if (errorMessage) setErrorMessage('');
                }}
                editable={!isLoading}
                testID="password-input"
              />
            </View>

            <View style={styles.credentialsContainer}>
              <Text style={styles.noteTitle}>Test Credentials:</Text>
              <View style={styles.credentialButtons}>
                <TouchableOpacity 
                  style={styles.credentialButton} 
                  onPress={() => fillTestCredentials('user')}
                  disabled={isLoading}
                  testID="fill-user-button"
                >
                  <Text style={styles.credentialButtonText}>Fill User</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.credentialButton} 
                  onPress={() => fillTestCredentials('admin')}
                  disabled={isLoading}
                  testID="fill-admin-button"
                >
                  <Text style={styles.credentialButtonText}>Fill Admin</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.note}>User: user1@example.com / user123</Text>
              <Text style={styles.note}>Admin: admin1@example.com / admin123</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleSignIn} 
              disabled={isLoading}
              testID="sign-in-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* New Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle-outline" size={24} color="#4A80F0" />
              </View>
              <Text style={styles.infoTitle}>First time signing in?</Text>
              <Text style={styles.infoText}>
                You'll be guided through an interactive onboarding process with our virtual assistant.
                The assistant will help you verify your information and set up your preferences.
              </Text>
              
              <View style={styles.infoFeatures}>
                <View style={styles.infoFeatureRow}>
                  <Ionicons name="chatbubble-outline" size={16} color="#4A80F0" />
                  <Text style={styles.infoFeatureText}>Interactive chat assistant</Text>
                </View>
                <View style={styles.infoFeatureRow}>
                  <Ionicons name="briefcase-outline" size={16} color="#4A80F0" />
                  <Text style={styles.infoFeatureText}>Review your employee details</Text>
                </View>
                <View style={styles.infoFeatureRow}>
                  <Ionicons name="car-outline" size={16} color="#4A80F0" />
                  <Text style={styles.infoFeatureText}>Set up vehicle details for parking</Text>
                </View>
                <View style={styles.infoFeatureRow}>
                  <Ionicons name="notifications-outline" size={16} color="#4A80F0" />
                  <Text style={styles.infoFeatureText}>Configure reminder preferences</Text>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A80F0',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center'
  },
  errorContainer: {
    backgroundColor: '#FFECEB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center'
  },
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  credentialsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e9ff'
  },
  credentialButtons: {
    flexDirection: 'row',
    marginVertical: 12,
    gap: 12
  },
  credentialButton: {
    backgroundColor: '#e0e9ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  credentialButtonText: {
    color: '#4A80F0',
    fontWeight: '500',
    fontSize: 14
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#4A80F0'
  },
  note: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  button: {
    backgroundColor: '#4A80F0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  infoCard: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eaf6',
    alignItems: 'center'
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A80F0',
    marginBottom: 8,
    textAlign: 'center'
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20
  },
  infoFeatures: {
    width: '100%'
  },
  infoFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  infoFeatureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8
  }
});