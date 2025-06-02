// Smart Office Assistant - Webhook-Based Onboarding Service
// Handles onboarding flow using webhook responses instead of mock data

import { chatbotWebhookService } from './ChatbotWebhookService';
import { voiceInteractionService } from './VoiceInteractionService';
import type { ChatbotWebhookResponse } from '../types/ChatbotTypes';

export interface OnboardingMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export interface OnboardingState {
  messages: OnboardingMessage[];
  isCompleted: boolean;
  quickActions: string[];
  nextSteps: string[];
  currentStep: number;
}

class WebhookOnboardingService {
  private onboardingState: OnboardingState = {
    messages: [],
    isCompleted: false,
    quickActions: [],
    nextSteps: [],
    currentStep: 0
  };

  private listeners: ((state: OnboardingState) => void)[] = [];

  /**
   * Initialize onboarding for a first-time user using webhook response
   */
  async initializeOnboarding(
    userId: string,
    employeeDetails?: any
  ): Promise<OnboardingState> {
    try {
      console.log('🚀 WebhookOnboarding: Initializing onboarding for user:', userId);

      // Reset state
      this.onboardingState = {
        messages: [],
        isCompleted: false,
        quickActions: [],
        nextSteps: [],
        currentStep: 0
      };

      // Call webhook to get onboarding content with audio detection
      const isAudio = voiceInteractionService.detectAudioInteraction();
      const webhookResult = await chatbotWebhookService.notifyUserInteraction(
        userId,
        true, // isFirstTimeUser
        employeeDetails,
        isAudio,
        'onboarding'
      );

      if (webhookResult.success && webhookResult.response) {
        await this.processWebhookResponse(webhookResult.response);
      } else {
        // Fallback to basic onboarding if webhook fails
        console.warn('WebhookOnboarding: Webhook failed, using fallback onboarding');
        await this.initializeFallbackOnboarding();
      }

      this.notifyListeners();
      return this.onboardingState;

    } catch (error) {
      console.error('WebhookOnboarding: Error initializing onboarding:', error);
      await this.initializeFallbackOnboarding();
      this.notifyListeners();
      return this.onboardingState;
    }
  }

  /**
   * Process webhook response and update onboarding state
   */
  private async processWebhookResponse(response: ChatbotWebhookResponse): Promise<void> {
    console.log('📝 WebhookOnboarding: Processing webhook response:', response);

    // Add onboarding messages from webhook
    if (response.onboarding_messages && response.onboarding_messages.length > 0) {
      for (const messageText of response.onboarding_messages) {
        this.addMessage(messageText, true);
        // Add delay between messages for better UX
        await this.delay(1000);
      }
    } else if (response.message) {
      // Single message fallback
      this.addMessage(response.message, true);
    }

    // Set quick actions from webhook
    if (response.quick_actions) {
      this.onboardingState.quickActions = response.quick_actions;
    }

    // Set next steps from webhook
    if (response.next_steps) {
      this.onboardingState.nextSteps = response.next_steps;
    }

    // Mark as completed if we have content
    if (this.onboardingState.messages.length > 0) {
      this.onboardingState.isCompleted = true;
    }
  }

  /**
   * Fallback onboarding when webhook is not available
   */
  private async initializeFallbackOnboarding(): Promise<void> {
    console.log('🔄 WebhookOnboarding: Using fallback onboarding');

    this.addMessage("Welcome to Smart Office! 👋", true);
    await this.delay(1000);
    
    this.addMessage("I'm your virtual assistant and I'll help you get started with the app.", true);
    await this.delay(1000);
    
    this.addMessage("You can use this app to book meeting rooms, manage parking, track attendance, and much more!", true);
    await this.delay(1000);
    
    this.addMessage("Ready to explore the app?", true);

    this.onboardingState.quickActions = ["Yes, let's start!", "Tell me more"];
    this.onboardingState.nextSteps = ["Explore the home screen", "Set up your profile"];
    this.onboardingState.isCompleted = true;
  }

  /**
   * Add a message to the onboarding conversation
   */
  private addMessage(text: string, isBot: boolean): void {
    const message: OnboardingMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      isBot,
      timestamp: new Date()
    };

    this.onboardingState.messages.push(message);
    this.onboardingState.currentStep++;
  }

  /**
   * Handle user response during onboarding with webhook integration
   */
  async handleUserResponse(response: string, userId?: string, employeeDetails?: any): Promise<void> {
    // Add user message
    this.addMessage(response, false);

    try {
      // If we have user details, send response to webhook
      if (userId) {
        const isAudio = voiceInteractionService.detectAudioInteraction();
        const webhookResult = await chatbotWebhookService.notifyUserInteraction(
          userId,
          true, // isFirstTimeUser (onboarding context)
          employeeDetails,
          isAudio,
          isAudio ? 'voice_command' : 'text_response',
          response
        );

        if (webhookResult.success && webhookResult.response?.message) {
          this.addMessage(webhookResult.response.message, true);

          // Update quick actions if provided
          if (webhookResult.response.quick_actions) {
            this.onboardingState.quickActions = webhookResult.response.quick_actions;
          }
        } else {
          // Fallback to local response
          this.handleLocalResponse(response);
        }
      } else {
        // No user details, use local response
        this.handleLocalResponse(response);
      }
    } catch (error) {
      console.error('WebhookOnboarding: Error handling user response:', error);
      this.handleLocalResponse(response);
    }

    this.notifyListeners();
  }

  /**
   * Handle local response (fallback)
   */
  private handleLocalResponse(response: string): void {
    if (response.toLowerCase().includes('yes') || response.toLowerCase().includes('start')) {
      this.addMessage("Great! You're all set to start using Smart Office. Enjoy exploring!", true);
    } else if (response.toLowerCase().includes('more')) {
      this.addMessage("Smart Office helps you manage your daily office activities efficiently. You'll find everything you need on the home screen.", true);
    } else {
      this.addMessage("Thanks for your response! You can always ask me questions using the Voice Assistant.", true);
    }
  }

  /**
   * Get current onboarding state
   */
  getOnboardingState(): OnboardingState {
    return { ...this.onboardingState };
  }

  /**
   * Subscribe to onboarding state changes
   */
  subscribe(listener: (state: OnboardingState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getOnboardingState());
      } catch (error) {
        console.error('WebhookOnboarding: Error notifying listener:', error);
      }
    });
  }

  /**
   * Reset onboarding state
   */
  reset(): void {
    this.onboardingState = {
      messages: [],
      isCompleted: false,
      quickActions: [],
      nextSteps: [],
      currentStep: 0
    };
    this.notifyListeners();
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const webhookOnboardingService = new WebhookOnboardingService();
