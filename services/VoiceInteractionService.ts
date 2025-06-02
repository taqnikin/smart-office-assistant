// Smart Office Assistant - Voice Interaction Service
// Handles voice/audio detection and integration with chatbot webhook

import { chatbotWebhookService } from './ChatbotWebhookService';
import type { InteractionType } from '../types/ChatbotTypes';
import type { EmployeeDetails } from '../lib/supabase-api';

export interface VoiceInteractionOptions {
  userId: string;
  isFirstTimeUser: boolean;
  employeeDetails?: EmployeeDetails & { wfh_eligibility?: boolean };
  userInput?: string;
  interactionType: InteractionType;
  isAudio: boolean;
}

export interface VoiceInteractionResult {
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
}

class VoiceInteractionService {
  private isListening: boolean = false;
  private isProcessing: boolean = false;

  /**
   * Send voice/audio interaction to webhook
   */
  async sendVoiceInteraction(options: VoiceInteractionOptions): Promise<VoiceInteractionResult> {
    const startTime = Date.now();

    try {
      console.log('🎤 VoiceInteraction: Sending interaction to webhook', {
        userId: options.userId,
        isAudio: options.isAudio,
        interactionType: options.interactionType,
        hasUserInput: !!options.userInput
      });

      const result = await chatbotWebhookService.notifyUserInteraction(
        options.userId,
        options.isFirstTimeUser,
        options.employeeDetails,
        options.isAudio,
        options.interactionType,
        options.userInput
      );

      return {
        success: result.success,
        response: result.response,
        error: result.error,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ VoiceInteraction: Error sending interaction:', error);

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Handle voice command from ChatbotScreen
   */
  async handleVoiceCommand(
    userId: string,
    isFirstTimeUser: boolean,
    employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean } | undefined,
    voiceCommand: string
  ): Promise<VoiceInteractionResult> {
    return this.sendVoiceInteraction({
      userId,
      isFirstTimeUser,
      employeeDetails,
      userInput: voiceCommand,
      interactionType: 'voice_command',
      isAudio: true
    });
  }

  /**
   * Handle text response (quick actions, typed messages)
   */
  async handleTextResponse(
    userId: string,
    isFirstTimeUser: boolean,
    employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean } | undefined,
    textResponse: string,
    isQuickAction: boolean = false
  ): Promise<VoiceInteractionResult> {
    return this.sendVoiceInteraction({
      userId,
      isFirstTimeUser,
      employeeDetails,
      userInput: textResponse,
      interactionType: isQuickAction ? 'quick_action' : 'text_response',
      isAudio: false
    });
  }

  /**
   * Handle onboarding interaction
   */
  async handleOnboardingInteraction(
    userId: string,
    employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean } | undefined,
    isAudio: boolean = false,
    userInput?: string
  ): Promise<VoiceInteractionResult> {
    return this.sendVoiceInteraction({
      userId,
      isFirstTimeUser: true,
      employeeDetails,
      userInput,
      interactionType: 'onboarding',
      isAudio
    });
  }

  /**
   * Detect if current interaction is audio-based
   * This can be enhanced with actual audio detection logic
   */
  detectAudioInteraction(): boolean {
    // For now, return the current listening state
    // In a real implementation, this could check:
    // - Microphone permissions
    // - Audio input levels
    // - Speech recognition state
    return this.isListening;
  }

  /**
   * Set listening state (called from UI components)
   */
  setListeningState(isListening: boolean): void {
    this.isListening = isListening;
    console.log('🎤 VoiceInteraction: Listening state changed:', isListening);
  }

  /**
   * Set processing state (called from UI components)
   */
  setProcessingState(isProcessing: boolean): void {
    this.isProcessing = isProcessing;
    console.log('🎤 VoiceInteraction: Processing state changed:', isProcessing);
  }

  /**
   * Get current voice interaction state
   */
  getVoiceState(): { isListening: boolean; isProcessing: boolean } {
    return {
      isListening: this.isListening,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Simulate voice recognition (for demo purposes)
   * In a real implementation, this would integrate with actual speech recognition
   */
  async simulateVoiceRecognition(
    userId: string,
    isFirstTimeUser: boolean,
    employeeDetails: EmployeeDetails & { wfh_eligibility?: boolean } | undefined,
    duration: number = 3000
  ): Promise<VoiceInteractionResult> {
    this.setListeningState(true);

    return new Promise((resolve) => {
      setTimeout(async () => {
        this.setListeningState(false);
        this.setProcessingState(true);

        // Simulate random voice commands
        const voiceCommands = [
          "Book a meeting room for tomorrow at 2 PM",
          "Check parking availability",
          "Mark my attendance as in-office today",
          "I want to work from home today",
          "Show me available rooms on floor 3",
          "Help me with onboarding",
          "What can I do with this app?"
        ];

        const randomCommand = voiceCommands[Math.floor(Math.random() * voiceCommands.length)];

        try {
          const result = await this.handleVoiceCommand(
            userId,
            isFirstTimeUser,
            employeeDetails,
            randomCommand
          );

          this.setProcessingState(false);
          resolve(result);
        } catch (error) {
          this.setProcessingState(false);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Voice recognition failed',
            duration: Date.now() - Date.now()
          });
        }
      }, duration);
    });
  }

  /**
   * Reset voice interaction state
   */
  reset(): void {
    this.isListening = false;
    this.isProcessing = false;
    console.log('🎤 VoiceInteraction: State reset');
  }
}

// Export singleton instance
export const voiceInteractionService = new VoiceInteractionService();
