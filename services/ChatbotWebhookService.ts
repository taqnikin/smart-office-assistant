// Smart Office Assistant - Chatbot Webhook Service
// Handles webhook integration for user onboarding and support

import { configService } from './ConfigService';
import { errorLogger, ErrorCategory } from './ErrorLoggingService';
import { sessionManagementService } from './SessionManagementService';
import type {
  ChatbotWebhookPayload,
  ChatbotWebhookResponse,
  ChatbotWebhookConfig,
  WebhookCallResult,
  InteractionType
} from '../types/ChatbotTypes';
import type { EmployeeDetails } from '../lib/supabase-api';

class ChatbotWebhookService {
  private config: ChatbotWebhookConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      url: configService.chatbotWebhookUrl,
      timeout: configService.apiTimeout || 30000, // 30 seconds
      maxRetryAttempts: configService.maxRetryAttempts || 3,
      retryDelay: 2000, // 2 seconds
    };
    this.isInitialized = configService.chatbotEnabled;
  }

  /**
   * Send webhook notification for user authentication (backward compatibility)
   */
  async notifyUserAuthentication(
    userId: string,
    isFirstTimeUser: boolean,
    employeeDetails?: EmployeeDetails & { wfh_eligibility?: boolean }
  ): Promise<WebhookCallResult> {
    // Use the new method with default values for backward compatibility
    return this.notifyUserInteraction(
      userId,
      isFirstTimeUser,
      employeeDetails,
      false, // isAudio: false for authentication
      'onboarding' // interaction_type: onboarding for authentication
    );
  }

  /**
   * Send webhook notification for user interaction with audio detection
   */
  async notifyUserInteraction(
    userId: string,
    isFirstTimeUser: boolean,
    employeeDetails?: EmployeeDetails & { wfh_eligibility?: boolean },
    isAudio: boolean = false,
    interactionType: InteractionType = 'onboarding',
    userInput?: string
  ): Promise<WebhookCallResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('ChatbotWebhookService not initialized');
      }

      // For first-time users, we may not have complete employee details yet
      // Create minimal employee details if not available
      if (!employeeDetails) {
        console.log('ChatbotWebhook: No employee details available, creating minimal details for first-time user');
        employeeDetails = {
          id: '',
          user_id: userId,
          full_name: 'New User',
          employee_id: 'PENDING',
          date_of_joining: new Date().toISOString().split('T')[0],
          work_hours: '9:00 AM - 5:00 PM',
          work_mode: 'hybrid',
          department: 'To be assigned',
          position: 'To be assigned',
          phone_number: '',
          location: 'To be assigned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          wfh_eligibility: true
        };
      }

      // Get or create session ID for this user
      const sessionId = await sessionManagementService.getOrCreateSession(userId);

      // Transform employee details to webhook payload format
      const payload = this.transformToWebhookPayload(
        isFirstTimeUser,
        employeeDetails,
        isAudio,
        interactionType,
        userInput,
        sessionId
      );

      // Make webhook call with retry logic
      const result = await this.makeWebhookCall(payload);

      // Log successful webhook call
      console.log('✅ ChatbotWebhook: Successfully notified chatbot system', {
        userId,
        isFirstTimeUser,
        attempts: result.attempts,
        duration: result.duration
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      await errorLogger.logError(
        error instanceof Error ? error : new Error(errorMessage),
        ErrorCategory.INTEGRATION,
        {
          service: 'ChatbotWebhookService',
          action: 'notifyUserAuthentication',
          userId,
          isFirstTimeUser,
          additionalData: { webhookUrl: this.config.url }
        }
      );

      return {
        success: false,
        error: errorMessage,
        attempts: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Transform employee details to webhook payload format
   */
  private transformToWebhookPayload(
    isFirstTimeUser: boolean,
    employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean },
    isAudio: boolean = false,
    interactionType: InteractionType = 'onboarding',
    userInput?: string,
    sessionId?: string
  ): ChatbotWebhookPayload {
    // Transform work_mode from database format to webhook format
    const workModeMap: Record<string, string> = {
      'in-office': 'On-site',
      'wfh': 'Remote',
      'hybrid': 'Hybrid'
    };

    return {
      first_time_user: isFirstTimeUser,
      isAudio,
      interaction_type: interactionType,
      sessionId: sessionId || 'fallback_session_' + Date.now(),
      user_input: userInput,
      employee_details: {
        full_name: employeeDetails.full_name || '',
        employee_id: employeeDetails.employee_id || '',
        date_of_joining: employeeDetails.date_of_joining || '',
        work_hours: employeeDetails.work_hours || '9:00 AM - 5:00 PM',
        work_mode: workModeMap[employeeDetails.work_mode] || 'Hybrid',
        department: employeeDetails.department || '',
        phone_number: employeeDetails.phone_number || '',
        location: employeeDetails.location || '',
        wfh_eligibility: this.determineWFHEligibility(employeeDetails)
      }
    };
  }

  /**
   * Determine WFH eligibility based on employee details
   */
  private determineWFHEligibility(employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean }): boolean {
    // Use explicit wfh_eligibility field if available, otherwise check work mode
    if (typeof employeeDetails.wfh_eligibility === 'boolean') {
      return employeeDetails.wfh_eligibility;
    }

    // Fallback: Check if work mode allows WFH
    const wfhCompatibleModes = ['wfh', 'hybrid'];
    return wfhCompatibleModes.includes(employeeDetails.work_mode);
  }

  /**
   * Make webhook call with retry logic
   */
  private async makeWebhookCall(payload: ChatbotWebhookPayload): Promise<WebhookCallResult> {
    const startTime = Date.now();
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        console.log(`🔄 ChatbotWebhook: Attempt ${attempt}/${this.config.maxRetryAttempts}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `${configService.appName}/${configService.appVersion}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let responseData: ChatbotWebhookResponse;
        try {
          responseData = await response.json();
        } catch {
          // If response is not JSON, create a success response
          responseData = {
            success: true,
            message: 'Webhook received successfully',
            timestamp: new Date().toISOString()
          };
        }

        return {
          success: true,
          response: responseData,
          attempts: attempt,
          duration: Date.now() - startTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ ChatbotWebhook: Attempt ${attempt} failed:`, lastError);

        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.maxRetryAttempts) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${this.config.maxRetryAttempts} attempts. Last error: ${lastError}`,
      attempts: this.config.maxRetryAttempts,
      duration: Date.now() - startTime
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test webhook connectivity
   */
  async testWebhookConnectivity(): Promise<boolean> {
    try {
      const testPayload: ChatbotWebhookPayload = {
        first_time_user: false,
        isAudio: false,
        interaction_type: 'text_response',
        sessionId: 'test_session_' + Date.now(),
        user_input: 'Test connectivity',
        employee_details: {
          full_name: 'Test User',
          employee_id: 'TEST001',
          date_of_joining: '2024-01-01',
          work_hours: '9:00 AM - 5:00 PM',
          work_mode: 'Hybrid',
          department: 'IT',
          phone_number: '+1234567890',
          location: 'Test Office',
          wfh_eligibility: true
        }
      };

      const result = await this.makeWebhookCall(testPayload);
      return result.success;
    } catch (error) {
      console.error('ChatbotWebhook: Connectivity test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const chatbotWebhookService = new ChatbotWebhookService();
