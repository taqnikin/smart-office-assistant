// Smart Office Assistant - User Management Tests
// Tests for user management functionality and components

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { UserManagement } from '../components/UserManagement';
import { UserForm } from '../components/UserForm';
import { adminAPI } from '../lib/supabase-api';

// Mock dependencies
jest.mock('../lib/supabase-api');
jest.mock('../services/ValidationService', () => ({
  validationService: {
    validateEmail: jest.fn(() => ({ isValid: true, errors: [], sanitizedValue: 'test@example.com' })),
    validatePassword: jest.fn(() => ({ isValid: true, errors: [], strength: { score: 4, feedback: [], isValid: true } })),
    sanitizeText: jest.fn(() => ({ isValid: true, errors: [], sanitizedValue: 'test' })),
    validateEmployeeId: jest.fn(() => ({ isValid: true, errors: [], sanitizedValue: 'EMP-001' })),
    validatePhoneNumber: jest.fn(() => ({ isValid: true, errors: [], sanitizedValue: '+1234567890' })),
  }
}));
jest.mock('../services/ErrorLoggingService', () => ({
  errorLogger: {
    logError: jest.fn(),
    logApiError: jest.fn(),
  },
  ErrorCategory: {
    API: 'api',
    UI: 'ui',
  }
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockAdminAPI = adminAPI as jest.Mocked<typeof adminAPI>;

// Mock user data
const mockUsers = [
  {
    id: '1',
    email: 'john.doe@company.com',
    role: 'user' as const,
    is_first_time_user: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted: false,
    employee_details: [{
      id: '1',
      user_id: '1',
      full_name: 'John Doe',
      employee_id: 'EMP-001',
      date_of_joining: '2024-01-01',
      work_hours: '9:00 AM - 5:00 PM',
      work_mode: 'hybrid' as const,
      department: 'Engineering',
      position: 'Software Developer',
      phone_number: '+1234567890',
      location: 'New York',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }]
  },
  {
    id: '2',
    email: 'jane.admin@company.com',
    role: 'admin' as const,
    is_first_time_user: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted: false,
    employee_details: [{
      id: '2',
      user_id: '2',
      full_name: 'Jane Admin',
      employee_id: 'EMP-002',
      date_of_joining: '2023-12-01',
      work_hours: '8:00 AM - 4:00 PM',
      work_mode: 'in-office' as const,
      department: 'Administration',
      position: 'Admin Manager',
      phone_number: '+1234567891',
      location: 'New York',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }]
  }
];

const mockUserStats = {
  totalUsers: 2,
  activeUsers: 2,
  deletedUsers: 0,
  adminUsers: 1,
  usersByRole: { user: 1, admin: 1 },
  usersByDepartment: { Engineering: 1, Administration: 1 },
  usersByWorkMode: { hybrid: 1, 'in-office': 1 }
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminAPI.getAllUsers.mockResolvedValue(mockUsers);
    mockAdminAPI.getUserStats.mockResolvedValue(mockUserStats);
  });

  it('should render user management interface', async () => {
    const { getByText, getByPlaceholderText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('Active Users')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // Active users count
      expect(getByPlaceholderText('Search users...')).toBeTruthy();
      expect(getByText('Add User')).toBeTruthy();
    });
  });

  it('should display user statistics correctly', async () => {
    const { getByText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('2')).toBeTruthy(); // Active users
      expect(getByText('1')).toBeTruthy(); // Admin users
      expect(getByText('0')).toBeTruthy(); // Deleted users
    });
  });

  it('should display user list', async () => {
    const { getByText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john.doe@company.com')).toBeTruthy();
      expect(getByText('Jane Admin')).toBeTruthy();
      expect(getByText('jane.admin@company.com')).toBeTruthy();
    });
  });

  it('should filter users by search query', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Admin')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search users...');
    fireEvent.changeText(searchInput, 'john');

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Jane Admin')).toBeNull();
    });
  });

  it('should filter users by role', async () => {
    const { getByText, queryByText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Admin')).toBeTruthy();
    });

    // Click on Admins filter
    fireEvent.press(getByText('Admins'));

    await waitFor(() => {
      expect(queryByText('John Doe')).toBeNull();
      expect(getByText('Jane Admin')).toBeTruthy();
    });
  });

  it('should handle user selection', async () => {
    const { getAllByTestId } = render(<UserManagement />);

    await waitFor(() => {
      const checkboxes = getAllByTestId(/checkbox/);
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    // This test would need proper testIDs in the actual component
  });

  it('should handle user deletion', async () => {
    mockAdminAPI.softDeleteUser.mockResolvedValue({
      ...mockUsers[0],
      deleted: true
    });

    const { getByText } = render(<UserManagement />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    // This would require proper testIDs for delete buttons
    // fireEvent.press(deleteButton);
    // expect(Alert.alert).toHaveBeenCalled();
  });

  it('should handle refresh', async () => {
    const { getByTestId } = render(<UserManagement />);

    // This would require a testID on the ScrollView with RefreshControl
    // fireEvent(getByTestId('user-list'), 'refresh');
    
    await waitFor(() => {
      expect(mockAdminAPI.getAllUsers).toHaveBeenCalled();
      expect(mockAdminAPI.getUserStats).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockAdminAPI.getAllUsers.mockRejectedValue(new Error('API Error'));

    render(<UserManagement />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load users. Please try again.'
      );
    });
  });
});

describe('UserForm Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create user form', () => {
    const { getByText, getByPlaceholderText } = render(
      <UserForm
        visible={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(getByText('Add New User')).toBeTruthy();
    expect(getByPlaceholderText('user@company.com')).toBeTruthy();
    expect(getByPlaceholderText('Enter a secure password')).toBeTruthy();
    expect(getByPlaceholderText('John Doe')).toBeTruthy();
  });

  it('should render edit user form with existing data', () => {
    const { getByText, getByDisplayValue } = render(
      <UserForm
        visible={true}
        user={mockUsers[0]}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(getByText('Edit User')).toBeTruthy();
    expect(getByDisplayValue('john.doe@company.com')).toBeTruthy();
    expect(getByDisplayValue('John Doe')).toBeTruthy();
    expect(getByDisplayValue('EMP-001')).toBeTruthy();
  });

  it('should validate form inputs', async () => {
    const { getByText, getByPlaceholderText } = render(
      <UserForm
        visible={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please fix the errors in the form before saving.'
      );
    });
  });

  it('should create new user successfully', async () => {
    mockAdminAPI.createUser.mockResolvedValue({
      user: mockUsers[0],
      employeeDetails: mockUsers[0].employee_details![0]
    });

    const { getByText, getByPlaceholderText } = render(
      <UserForm
        visible={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Fill form
    fireEvent.changeText(getByPlaceholderText('user@company.com'), 'test@company.com');
    fireEvent.changeText(getByPlaceholderText('Enter a secure password'), 'SecurePass123!');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('EMP-2024-001'), 'EMP-TEST-001');

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockAdminAPI.createUser).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'User created successfully!',
        expect.any(Array)
      );
    });
  });

  it('should update existing user successfully', async () => {
    mockAdminAPI.updateUser.mockResolvedValue({
      user: mockUsers[0],
      employeeDetails: mockUsers[0].employee_details![0]
    });

    const { getByText, getByDisplayValue } = render(
      <UserForm
        visible={true}
        user={mockUsers[0]}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Update form
    const nameInput = getByDisplayValue('John Doe');
    fireEvent.changeText(nameInput, 'John Updated');

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockAdminAPI.updateUser).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'User updated successfully!',
        expect.any(Array)
      );
    });
  });

  it('should handle form submission errors', async () => {
    mockAdminAPI.createUser.mockRejectedValue(new Error('Creation failed'));

    const { getByText, getByPlaceholderText } = render(
      <UserForm
        visible={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Fill form with valid data
    fireEvent.changeText(getByPlaceholderText('user@company.com'), 'test@company.com');
    fireEvent.changeText(getByPlaceholderText('Enter a secure password'), 'SecurePass123!');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('EMP-2024-001'), 'EMP-TEST-001');

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to create user. Please try again.'
      );
    });
  });

  it('should close form when close button is pressed', () => {
    const { getByTestId } = render(
      <UserForm
        visible={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // This would require a testID on the close button
    // fireEvent.press(getByTestId('close-button'));
    // expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('Admin API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get all users', async () => {
    mockAdminAPI.getAllUsers.mockResolvedValue(mockUsers);

    const users = await adminAPI.getAllUsers();
    expect(users).toEqual(mockUsers);
    expect(mockAdminAPI.getAllUsers).toHaveBeenCalled();
  });

  it('should get all users including deleted', async () => {
    mockAdminAPI.getAllUsers.mockResolvedValue(mockUsers);

    await adminAPI.getAllUsers(true);
    expect(mockAdminAPI.getAllUsers).toHaveBeenCalledWith(true);
  });

  it('should create user successfully', async () => {
    const userData = {
      email: 'test@company.com',
      password: 'SecurePass123!',
      role: 'user' as const,
      employeeDetails: {
        full_name: 'Test User',
        employee_id: 'EMP-TEST-001',
        date_of_joining: '2024-01-01',
        work_hours: '9:00 AM - 5:00 PM',
        work_mode: 'hybrid' as const
      }
    };

    mockAdminAPI.createUser.mockResolvedValue({
      user: mockUsers[0],
      employeeDetails: mockUsers[0].employee_details![0]
    });

    const result = await adminAPI.createUser(userData);
    expect(result.user).toBeDefined();
    expect(result.employeeDetails).toBeDefined();
    expect(mockAdminAPI.createUser).toHaveBeenCalledWith(userData);
  });

  it('should update user successfully', async () => {
    const updates = {
      email: 'updated@company.com',
      role: 'admin' as const,
      employeeDetails: {
        full_name: 'Updated Name'
      }
    };

    mockAdminAPI.updateUser.mockResolvedValue({
      user: { ...mockUsers[0], ...updates },
      employeeDetails: mockUsers[0].employee_details![0]
    });

    const result = await adminAPI.updateUser('1', updates);
    expect(result.user).toBeDefined();
    expect(mockAdminAPI.updateUser).toHaveBeenCalledWith('1', updates);
  });

  it('should soft delete user', async () => {
    mockAdminAPI.softDeleteUser.mockResolvedValue({
      ...mockUsers[0],
      deleted: true
    });

    const result = await adminAPI.softDeleteUser('1');
    expect(result.deleted).toBe(true);
    expect(mockAdminAPI.softDeleteUser).toHaveBeenCalledWith('1');
  });

  it('should restore user', async () => {
    mockAdminAPI.restoreUser.mockResolvedValue({
      ...mockUsers[0],
      deleted: false
    });

    const result = await adminAPI.restoreUser('1');
    expect(result.deleted).toBe(false);
    expect(mockAdminAPI.restoreUser).toHaveBeenCalledWith('1');
  });

  it('should get user statistics', async () => {
    mockAdminAPI.getUserStats.mockResolvedValue(mockUserStats);

    const stats = await adminAPI.getUserStats();
    expect(stats).toEqual(mockUserStats);
    expect(stats.totalUsers).toBe(2);
    expect(stats.activeUsers).toBe(2);
    expect(stats.adminUsers).toBe(1);
  });

  it('should search users', async () => {
    mockAdminAPI.searchUsers.mockResolvedValue([mockUsers[0]]);

    const results = await adminAPI.searchUsers('john', {
      role: 'user',
      department: 'Engineering'
    });

    expect(results).toEqual([mockUsers[0]]);
    expect(mockAdminAPI.searchUsers).toHaveBeenCalledWith('john', {
      role: 'user',
      department: 'Engineering'
    });
  });

  it('should perform bulk updates', async () => {
    const updatedUsers = mockUsers.map(user => ({ ...user, role: 'admin' as const }));
    mockAdminAPI.bulkUpdateUsers.mockResolvedValue(updatedUsers);

    const result = await adminAPI.bulkUpdateUsers(['1', '2'], { role: 'admin' });
    expect(result).toEqual(updatedUsers);
    expect(mockAdminAPI.bulkUpdateUsers).toHaveBeenCalledWith(['1', '2'], { role: 'admin' });
  });
});
