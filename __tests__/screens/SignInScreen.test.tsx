import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignInScreen from '../../screens/SignInScreen';
import { AuthContext } from '../../AuthContext';
import { toast } from 'sonner-native';

// Mock the toast
jest.mock('sonner-native');
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignInScreen', () => {
  const mockSignIn = jest.fn();
  const mockAuthContext = {
    user: null,
    loading: false,
    signIn: mockSignIn,
    signOut: jest.fn(),
    updateEmployeeDetails: jest.fn(),
    updateUserPreferences: jest.fn(),
    completeOnboarding: jest.fn(),
  };

  const renderSignInScreen = (authContextOverrides = {}) => {
    const contextValue = { ...mockAuthContext, ...authContextOverrides };
    
    return render(
      <AuthContext.Provider value={contextValue}>
        <SignInScreen />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sign in form', () => {
      const { getByTestId, getByText } = renderSignInScreen();
      
      expect(getByText('SmartOffice Sign In')).toBeTruthy();
      expect(getByText('Use your ID and password to sign in')).toBeTruthy();
      expect(getByTestId('email-input')).toBeTruthy();
      expect(getByTestId('password-input')).toBeTruthy();
      expect(getByTestId('sign-in-button')).toBeTruthy();
    });

    it('should render demo credentials section', () => {
      const { getByText } = renderSignInScreen();
      
      expect(getByText('Demo Credentials')).toBeTruthy();
      expect(getByText('demo@smartoffice.com')).toBeTruthy();
      expect(getByText('admin@smartoffice.com')).toBeTruthy();
    });

    it('should render onboarding info card', () => {
      const { getByText } = renderSignInScreen();
      
      expect(getByText('First time signing in?')).toBeTruthy();
      expect(getByText(/You'll be guided through an interactive onboarding/)).toBeTruthy();
    });
  });

  describe('Form Interaction', () => {
    it('should update email input', () => {
      const { getByTestId } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update password input', () => {
      const { getByTestId } = renderSignInScreen();
      const passwordInput = getByTestId('password-input');
      
      fireEvent.changeText(passwordInput, 'password123');
      
      expect(passwordInput.props.value).toBe('password123');
    });

    it('should toggle password visibility', () => {
      const { getByTestId } = renderSignInScreen();
      const toggleButton = getByTestId('toggle-password');
      const passwordInput = getByTestId('password-input');
      
      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      
      // Toggle to show password
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);
      
      // Toggle back to hide password
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      const { getByTestId, getByText } = renderSignInScreen();
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(getByText('Please enter your email')).toBeTruthy();
      });
    });

    it('should show error for empty password', async () => {
      const { getByTestId, getByText } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(getByText('Please enter your password')).toBeTruthy();
      });
    });

    it('should show error for invalid email format', async () => {
      const { getByTestId, getByText } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });
  });

  describe('Authentication', () => {
    it('should call signIn with correct credentials', async () => {
      mockSignIn.mockResolvedValue({ error: null });
      
      const { getByTestId } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'demo@smartoffice.com');
      fireEvent.changeText(passwordInput, 'demo123');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('demo@smartoffice.com', 'demo123');
      });
    });

    it('should show success toast on successful sign in', async () => {
      mockSignIn.mockResolvedValue({ error: null });
      
      const { getByTestId } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'demo@smartoffice.com');
      fireEvent.changeText(passwordInput, 'demo123');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Signed in successfully');
      });
    });

    it('should show error toast on failed sign in', async () => {
      const errorMessage = 'Invalid login credentials';
      mockSignIn.mockResolvedValue({ error: new Error(errorMessage) });
      
      const { getByTestId } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should show loading state during sign in', async () => {
      // Mock a delayed response
      mockSignIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );
      
      const { getByTestId } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'demo@smartoffice.com');
      fireEvent.changeText(passwordInput, 'demo123');
      fireEvent.press(signInButton);
      
      // Button should be disabled during loading
      expect(signInButton.props.accessibilityState.disabled).toBe(true);
      
      await waitFor(() => {
        expect(signInButton.props.accessibilityState.disabled).toBe(false);
      });
    });
  });

  describe('Demo Credentials', () => {
    it('should fill demo user credentials when demo button is pressed', () => {
      const { getByTestId, getByText } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const demoButton = getByText('demo@smartoffice.com').parent;
      
      fireEvent.press(demoButton);
      
      expect(emailInput.props.value).toBe('demo@smartoffice.com');
      expect(passwordInput.props.value).toBe('demo123');
    });

    it('should fill admin credentials when admin button is pressed', () => {
      const { getByTestId, getByText } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const adminButton = getByText('admin@smartoffice.com').parent;
      
      fireEvent.press(adminButton);
      
      expect(emailInput.props.value).toBe('admin@smartoffice.com');
      expect(passwordInput.props.value).toBe('admin123');
    });
  });

  describe('Error Handling', () => {
    it('should handle auth context not initialized', async () => {
      const { getByTestId } = renderSignInScreen({ signIn: undefined });
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Authentication is initializing. Please try again.'
        );
      });
    });

    it('should clear error message on successful sign in', async () => {
      // First, trigger an error
      mockSignIn.mockResolvedValueOnce({ error: new Error('Invalid credentials') });
      
      const { getByTestId, getByText, queryByText } = renderSignInScreen();
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const signInButton = getByTestId('sign-in-button');
      
      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(getByText('Invalid credentials')).toBeTruthy();
      });
      
      // Then, successful sign in
      mockSignIn.mockResolvedValueOnce({ error: null });
      
      fireEvent.changeText(emailInput, 'demo@smartoffice.com');
      fireEvent.changeText(passwordInput, 'demo123');
      fireEvent.press(signInButton);
      
      await waitFor(() => {
        expect(queryByText('Invalid credentials')).toBeNull();
      });
    });
  });
});
