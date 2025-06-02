// Smart Office Assistant - Chatbot Webhook Test Component
// Test component for verifying webhook integration

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { chatbotWebhookService } from '../services/ChatbotWebhookService';
import { configService } from '../services/ConfigService';

interface ChatbotWebhookTestProps {
  visible?: boolean;
}

export const ChatbotWebhookTest: React.FC<ChatbotWebhookTestProps> = ({ visible = false }) => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  if (!visible) return null;

  const testWebhookConnectivity = async () => {
    setTesting(true);
    setLastResult('Testing webhook connectivity...');

    try {
      const isConnected = await chatbotWebhookService.testWebhookConnectivity();
      
      if (isConnected) {
        setLastResult('✅ Webhook connectivity test passed');
        Alert.alert('Success', 'Webhook connectivity test passed!');
      } else {
        setLastResult('❌ Webhook connectivity test failed');
        Alert.alert('Failed', 'Webhook connectivity test failed. Check network and webhook URL.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Test error: ${errorMessage}`);
      Alert.alert('Error', `Test failed: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const testSampleWebhook = async () => {
    setTesting(true);
    setLastResult('Sending sample webhook...');

    try {
      const result = await chatbotWebhookService.notifyUserInteraction(
        'test-user-id',
        true,
        {
          id: 'test-id',
          user_id: 'test-user-id',
          full_name: 'Test User',
          employee_id: 'TEST001',
          date_of_joining: '2024-01-01',
          work_hours: '9:00 AM - 5:00 PM',
          work_mode: 'hybrid',
          department: 'IT',
          position: 'Developer',
          phone_number: '+1234567890',
          location: 'Test Office',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          wfh_eligibility: true
        },
        false, // isAudio
        'text_response', // interaction_type
        'Test webhook with new payload structure'
      );

      if (result.success) {
        setLastResult(`✅ Sample webhook sent successfully (${result.attempts} attempts, ${result.duration}ms)`);
        Alert.alert('Success', 'Sample webhook sent successfully!');
      } else {
        setLastResult(`❌ Sample webhook failed: ${result.error}`);
        Alert.alert('Failed', `Sample webhook failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Sample webhook error: ${errorMessage}`);
      Alert.alert('Error', `Sample webhook failed: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const testAudioWebhook = async () => {
    setTesting(true);
    setLastResult('Sending audio webhook test...');

    try {
      const result = await chatbotWebhookService.notifyUserInteraction(
        'test-user-id',
        false,
        {
          id: 'test-id',
          user_id: 'test-user-id',
          full_name: 'Test User',
          employee_id: 'TEST001',
          date_of_joining: '2024-01-01',
          work_hours: '9:00 AM - 5:00 PM',
          work_mode: 'hybrid',
          department: 'IT',
          position: 'Developer',
          phone_number: '+1234567890',
          location: 'Test Office',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          wfh_eligibility: true
        },
        true, // isAudio = true
        'voice_command', // interaction_type
        'Book a meeting room for tomorrow at 2 PM'
      );

      if (result.success) {
        setLastResult(`✅ Audio webhook sent successfully (${result.attempts} attempts, ${result.duration}ms)`);
        Alert.alert('Success', 'Audio webhook sent successfully!');
      } else {
        setLastResult(`❌ Audio webhook failed: ${result.error}`);
        Alert.alert('Failed', `Audio webhook failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Audio webhook error: ${errorMessage}`);
      Alert.alert('Error', `Audio webhook failed: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chatbot Webhook Test</Text>
      
      <View style={styles.configInfo}>
        <Text style={styles.configLabel}>Webhook URL:</Text>
        <Text style={styles.configValue}>{configService.chatbotWebhookUrl}</Text>
        <Text style={styles.configLabel}>Enabled:</Text>
        <Text style={styles.configValue}>{configService.chatbotEnabled ? 'Yes' : 'No'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={testWebhookConnectivity}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Test Connectivity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={testSampleWebhook}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Send Sample Webhook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={testAudioWebhook}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Test Audio Webhook</Text>
        </TouchableOpacity>
      </View>

      {lastResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Last Result:</Text>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  configInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
  },
  configValue: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
});
