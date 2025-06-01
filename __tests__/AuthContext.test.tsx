import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, AuthContext } from '../AuthContext';
import { supabase } from '../supabase';

// Mock the supabase module
jest.mock('../supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test component to access context
const TestComponent = () => {
  const { user, loading, signIn, signOut } = React.useContext(AuthContext);
  
  return (
    <>
      <div testID="user-status">{user ? 'logged-in' : 'logged-out'}</div>
      <div testID="loading-status">{loading ? 'loading' : 'ready'}</div>
      <div testID="user-email">{user?.email || 'no-email'}</div>
      <div testID="user-role">{user?.role || 'no-role'}</div>
    </>
  );
};

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with loading state', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      expect(getByTestId('loading-status')).toHaveTextContent('loading');
      expect(getByTestId('user-status')).toHaveTextContent('logged-out');
    });

    it('should finish loading and show logged-out state when no stored session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      });

      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
        expect(getByTestId('user-status')).toHaveTextContent('logged-out');
      });
    });
  });

  describe('Mock User Authentication', () => {
    it('should sign in with demo user credentials', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      const authContext = React.createContext(AuthContext);
      
      // Test signing in with mock demo user
      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        const result = await signIn('demo@smartoffice.com', 'demo123');
        expect(result.error).toBeNull();
      });
    });

    it('should sign in with admin user credentials', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      // Test signing in with mock admin user
      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        const result = await signIn('admin@smartoffice.com', 'admin123');
        expect(result.error).toBeNull();
      });
    });

    it('should reject invalid credentials', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        const result = await signIn('invalid@email.com', 'wrongpassword');
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('Invalid login credentials');
      });
    });
  });

  describe('Supabase Authentication', () => {
    it('should handle successful Supabase authentication', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { role: 'user' }
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null
      });

      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        const result = await signIn('test@example.com', 'password123');
        expect(result.error).toBeNull();
      });
    });

    it('should handle Supabase authentication errors', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        const result = await signIn('test@example.com', 'wrongpassword');
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toBe('Invalid credentials');
      });
    });
  });

  describe('Session Management', () => {
    it('should persist mock user sessions', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      // Sign in with mock user
      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        await signIn('demo@smartoffice.com', 'demo123');
      });

      // Check if session was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'mockUser',
        expect.stringContaining('demo@smartoffice.com')
      );
    });

    it('should sign out and clear session', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      // Sign in first
      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        await signIn('demo@smartoffice.com', 'demo123');
      });

      // Then sign out
      await act(async () => {
        const { signOut } = React.useContext(AuthContext);
        await signOut();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('mockUser');
      expect(getByTestId('user-status')).toHaveTextContent('logged-out');
    });
  });

  describe('User Roles', () => {
    it('should correctly identify admin users', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        await signIn('admin@smartoffice.com', 'admin123');
      });

      await waitFor(() => {
        expect(getByTestId('user-role')).toHaveTextContent('admin');
      });
    });

    it('should correctly identify regular users', async () => {
      const { getByTestId } = renderWithAuthProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading-status')).toHaveTextContent('ready');
      });

      await act(async () => {
        const { signIn } = React.useContext(AuthContext);
        await signIn('demo@smartoffice.com', 'demo123');
      });

      await waitFor(() => {
        expect(getByTestId('user-role')).toHaveTextContent('user');
      });
    });
  });
});
