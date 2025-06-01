// Smart Office Assistant - User Form Component
// Form for creating and editing users in the admin dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, User, EmployeeDetails } from '../lib/supabase-api';
import { validationService } from '../services/ValidationService';
import { errorLogger, ErrorCategory, ErrorSeverity } from '../services/ErrorLoggingService';

interface UserWithDetails extends User {
  employee_details?: EmployeeDetails[];
}

interface UserFormProps {
  visible: boolean;
  user?: UserWithDetails | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  email: string;
  password: string;
  role: 'user' | 'admin';
  fullName: string;
  employeeId: string;
  dateOfJoining: string;
  workHours: string;
  workMode: 'in-office' | 'wfh' | 'hybrid';
  department: string;
  position: string;
  phoneNumber: string;
  location: string;
}

interface FormErrors {
  [key: string]: string;
}

export const UserForm: React.FC<UserFormProps> = ({ visible, user, onClose, onSave }) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    role: 'user',
    fullName: '',
    employeeId: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    workHours: '9:00 AM - 5:00 PM',
    workMode: 'hybrid',
    department: '',
    position: '',
    phoneNumber: '',
    location: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      const employeeDetails = user.employee_details?.[0];
      setFormData({
        email: user.email,
        password: '', // Don't populate password for editing
        role: user.role,
        fullName: employeeDetails?.full_name || '',
        employeeId: employeeDetails?.employee_id || '',
        dateOfJoining: employeeDetails?.date_of_joining || new Date().toISOString().split('T')[0],
        workHours: employeeDetails?.work_hours || '9:00 AM - 5:00 PM',
        workMode: employeeDetails?.work_mode || 'hybrid',
        department: employeeDetails?.department || '',
        position: employeeDetails?.position || '',
        phoneNumber: employeeDetails?.phone_number || '',
        location: employeeDetails?.location || '',
      });
    } else {
      // Reset form for new user
      setFormData({
        email: '',
        password: '',
        role: 'user',
        fullName: '',
        employeeId: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        workHours: '9:00 AM - 5:00 PM',
        workMode: 'hybrid',
        department: '',
        position: '',
        phoneNumber: '',
        location: '',
      });
    }
    setErrors({});
  }, [user, visible]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailValidation = validationService.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.errors[0];
    }

    // Password validation (only for new users)
    if (!isEditing && formData.password) {
      const passwordValidation = validationService.validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    } else if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required for new users';
    }

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Employee ID validation
    const employeeIdValidation = validationService.validateEmployeeId(formData.employeeId);
    if (!employeeIdValidation.isValid) {
      newErrors.employeeId = employeeIdValidation.errors[0];
    }

    // Date validation
    if (!formData.dateOfJoining) {
      newErrors.dateOfJoining = 'Date of joining is required';
    } else {
      const joiningDate = new Date(formData.dateOfJoining);
      const today = new Date();
      if (joiningDate > today) {
        newErrors.dateOfJoining = 'Date of joining cannot be in the future';
      }
    }

    // Phone number validation (optional but must be valid if provided)
    if (formData.phoneNumber.trim()) {
      const phoneValidation = validationService.validatePhoneNumber(formData.phoneNumber);
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = phoneValidation.errors[0];
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form before saving.');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && user) {
        // Update existing user
        await adminAPI.updateUser(user.id, {
          email: formData.email !== user.email ? formData.email : undefined,
          role: formData.role !== user.role ? formData.role : undefined,
          employeeDetails: {
            full_name: formData.fullName,
            employee_id: formData.employeeId,
            date_of_joining: formData.dateOfJoining,
            work_hours: formData.workHours,
            work_mode: formData.workMode,
            department: formData.department || undefined,
            position: formData.position || undefined,
            phone_number: formData.phoneNumber || undefined,
            location: formData.location || undefined,
          }
        });
      } else {
        // Create new user
        await adminAPI.createUser({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          employeeDetails: {
            full_name: formData.fullName,
            employee_id: formData.employeeId,
            date_of_joining: formData.dateOfJoining,
            work_hours: formData.workHours,
            work_mode: formData.workMode,
            department: formData.department || undefined,
            position: formData.position || undefined,
            phone_number: formData.phoneNumber || undefined,
            location: formData.location || undefined,
          }
        });
      }

      Alert.alert(
        'Success',
        `User ${isEditing ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK', onPress: () => { onSave(); onClose(); } }]
      );
    } catch (error) {
      console.error('Failed to save user:', error);
      await errorLogger.logError(error as Error, {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.API,
        context: {
          screen: 'UserForm',
          action: isEditing ? 'updateUser' : 'createUser',
          additionalData: { userId: user?.id, email: formData.email }
        }
      });

      Alert.alert(
        'Error',
        `Failed to ${isEditing ? 'update' : 'create'} user. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    key: keyof FormData,
    label: string,
    placeholder: string,
    options?: {
      multiline?: boolean;
      secureTextEntry?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, errors[key] && styles.inputError, options?.multiline && styles.multilineInput]}
          placeholder={placeholder}
          value={formData[key]}
          onChangeText={(value) => {
            setFormData(prev => ({ ...prev, [key]: value }));
            if (errors[key]) {
              setErrors(prev => ({ ...prev, [key]: '' }));
            }
          }}
          multiline={options?.multiline}
          secureTextEntry={options?.secureTextEntry && !showPassword}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize}
          editable={!loading}
        />
        {key === 'password' && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  const renderPicker = (
    key: keyof FormData,
    label: string,
    options: { value: string; label: string }[]
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.pickerContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              formData[key] === option.value && styles.pickerOptionSelected
            ]}
            onPress={() => setFormData(prev => ({ ...prev, [key]: option.value }))}
            disabled={loading}
          >
            <Text style={[
              styles.pickerOptionText,
              formData[key] === option.value && styles.pickerOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={24} color="#222B45" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit User' : 'Add New User'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#4A80F0" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {renderInput('email', 'Email Address', 'user@company.com', {
              keyboardType: 'email-address',
              autoCapitalize: 'none'
            })}
            
            {!isEditing && renderInput('password', 'Password', 'Enter a secure password', {
              secureTextEntry: true
            })}

            {renderPicker('role', 'Role', [
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Administrator' }
            ])}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employee Details</Text>
            {renderInput('fullName', 'Full Name', 'John Doe', {
              autoCapitalize: 'words'
            })}
            
            {renderInput('employeeId', 'Employee ID', 'EMP-2024-001', {
              autoCapitalize: 'characters'
            })}
            
            {renderInput('dateOfJoining', 'Date of Joining', 'YYYY-MM-DD')}
            
            {renderInput('department', 'Department', 'Engineering', {
              autoCapitalize: 'words'
            })}
            
            {renderInput('position', 'Position', 'Software Developer', {
              autoCapitalize: 'words'
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Configuration</Text>
            {renderInput('workHours', 'Work Hours', '9:00 AM - 5:00 PM')}
            
            {renderPicker('workMode', 'Work Mode', [
              { value: 'in-office', label: 'In Office' },
              { value: 'wfh', label: 'Work From Home' },
              { value: 'hybrid', label: 'Hybrid' }
            ])}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {renderInput('phoneNumber', 'Phone Number', '+1 (555) 123-4567', {
              keyboardType: 'phone-pad'
            })}
            
            {renderInput('location', 'Location', 'New York, NY', {
              autoCapitalize: 'words'
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222B45',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222B45',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222B45',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: '#4A80F0',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
});

export default UserForm;
