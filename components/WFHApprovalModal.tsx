// Smart Office Assistant - WFH Approval Request Modal
// This component handles work from home approval requests

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { AuthContext } from '../AuthContext';
import { wfhAPI } from '../lib/supabase-api';

interface WFHApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  onApprovalRequested: (approvalId: string) => void;
  requestedDate: string;
  eligibility?: {
    eligible: boolean;
    reason?: string;
    maxDaysPerMonth?: number;
    usedDaysThisMonth?: number;
  };
}

export default function WFHApprovalModal({
  visible,
  onClose,
  onApprovalRequested,
  requestedDate,
  eligibility
}: WFHApprovalModalProps) {
  const { user } = useContext(AuthContext);
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRequest = async () => {
    if (!user) {
      toast.error('Please log in to submit WFH request');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for your WFH request');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get manager ID from user data
      const managerId = user.employeeDetails?.manager_id || user.manager_id;

      const approval = await wfhAPI.createWFHRequest({
        employee_id: user.id,
        manager_id: managerId,
        requested_for_date: requestedDate,
        reason: reason.trim(),
        urgency,
        is_recurring: false
      });

      toast.success('WFH approval request submitted successfully!');
      onApprovalRequested(approval.id);
      
      // Reset form
      setReason('');
      setUrgency('normal');
      onClose();

    } catch (error) {
      console.error('Failed to submit WFH request:', error);
      toast.error('Failed to submit WFH request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    
    setReason('');
    setUrgency('normal');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'urgent': return '#FF9500';
      case 'emergency': return '#FF3B30';
      default: return '#4A80F0';
    }
  };

  const getUrgencyDescription = (level: string) => {
    switch (level) {
      case 'urgent': return 'Requires approval within 2-4 hours';
      case 'emergency': return 'Auto-approved with post-approval review';
      default: return 'Standard approval process (24-48 hours)';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Request WFH Approval</Text>
              <TouchableOpacity 
                onPress={handleCancel}
                disabled={isSubmitting}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#222B45" />
              </TouchableOpacity>
            </View>

            {/* Date Info */}
            <View style={styles.dateSection}>
              <Ionicons name="calendar" size={20} color="#4A80F0" />
              <Text style={styles.dateText}>{formatDate(requestedDate)}</Text>
            </View>

            {/* Eligibility Status */}
            {eligibility && (
              <View style={[
                styles.eligibilitySection,
                { backgroundColor: eligibility.eligible ? '#F0F9FF' : '#FFF5F5' }
              ]}>
                <View style={styles.eligibilityHeader}>
                  <Ionicons 
                    name={eligibility.eligible ? "checkmark-circle" : "alert-circle"} 
                    size={20} 
                    color={eligibility.eligible ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.eligibilityTitle,
                    { color: eligibility.eligible ? "#34C759" : "#FF3B30" }
                  ]}>
                    {eligibility.eligible ? "WFH Eligible" : "WFH Restricted"}
                  </Text>
                </View>
                
                {eligibility.maxDaysPerMonth && eligibility.usedDaysThisMonth !== undefined && (
                  <Text style={styles.eligibilityText}>
                    Monthly Usage: {eligibility.usedDaysThisMonth}/{eligibility.maxDaysPerMonth} days
                  </Text>
                )}
                
                {eligibility.reason && (
                  <Text style={styles.eligibilityReason}>{eligibility.reason}</Text>
                )}
              </View>
            )}

            {/* Reason Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Reason for WFH Request *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Please provide a detailed reason for your work from home request..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!isSubmitting}
              />
              <Text style={styles.characterCount}>{reason.length}/500</Text>
            </View>

            {/* Urgency Selection */}
            <View style={styles.urgencySection}>
              <Text style={styles.inputLabel}>Request Urgency</Text>
              
              <TouchableOpacity
                style={[
                  styles.urgencyOption,
                  urgency === 'normal' && styles.selectedUrgencyOption,
                  { borderColor: urgency === 'normal' ? getUrgencyColor('normal') : '#EDF1F7' }
                ]}
                onPress={() => setUrgency('normal')}
                disabled={isSubmitting}
              >
                <View style={styles.urgencyHeader}>
                  <Ionicons 
                    name="time" 
                    size={20} 
                    color={urgency === 'normal' ? getUrgencyColor('normal') : '#8F9BB3'} 
                  />
                  <Text style={[
                    styles.urgencyTitle,
                    { color: urgency === 'normal' ? getUrgencyColor('normal') : '#222B45' }
                  ]}>
                    Normal
                  </Text>
                </View>
                <Text style={styles.urgencyDescription}>
                  {getUrgencyDescription('normal')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgencyOption,
                  urgency === 'urgent' && styles.selectedUrgencyOption,
                  { borderColor: urgency === 'urgent' ? getUrgencyColor('urgent') : '#EDF1F7' }
                ]}
                onPress={() => setUrgency('urgent')}
                disabled={isSubmitting}
              >
                <View style={styles.urgencyHeader}>
                  <Ionicons 
                    name="flash" 
                    size={20} 
                    color={urgency === 'urgent' ? getUrgencyColor('urgent') : '#8F9BB3'} 
                  />
                  <Text style={[
                    styles.urgencyTitle,
                    { color: urgency === 'urgent' ? getUrgencyColor('urgent') : '#222B45' }
                  ]}>
                    Urgent
                  </Text>
                </View>
                <Text style={styles.urgencyDescription}>
                  {getUrgencyDescription('urgent')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgencyOption,
                  urgency === 'emergency' && styles.selectedUrgencyOption,
                  { borderColor: urgency === 'emergency' ? getUrgencyColor('emergency') : '#EDF1F7' }
                ]}
                onPress={() => setUrgency('emergency')}
                disabled={isSubmitting}
              >
                <View style={styles.urgencyHeader}>
                  <Ionicons 
                    name="warning" 
                    size={20} 
                    color={urgency === 'emergency' ? getUrgencyColor('emergency') : '#8F9BB3'} 
                  />
                  <Text style={[
                    styles.urgencyTitle,
                    { color: urgency === 'emergency' ? getUrgencyColor('emergency') : '#222B45' }
                  ]}>
                    Emergency
                  </Text>
                </View>
                <Text style={styles.urgencyDescription}>
                  {getUrgencyDescription('emergency')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.submitButton,
                  (!reason.trim() || isSubmitting) && styles.disabledButton
                ]}
                onPress={handleSubmitRequest}
                disabled={!reason.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222B45',
  },
  closeButton: {
    padding: 4,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222B45',
    marginLeft: 12,
  },
  eligibilitySection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  eligibilityText: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 4,
  },
  eligibilityReason: {
    fontSize: 14,
    color: '#8F9BB3',
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222B45',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#EDF1F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#222B45',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#8F9BB3',
    textAlign: 'right',
    marginTop: 4,
  },
  urgencySection: {
    marginBottom: 30,
  },
  urgencyOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedUrgencyOption: {
    backgroundColor: '#F7F9FC',
  },
  urgencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  urgencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  urgencyDescription: {
    fontSize: 14,
    color: '#8F9BB3',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8F9BB3',
  },
  submitButton: {
    backgroundColor: '#4A80F0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#EDF1F7',
  },
});
