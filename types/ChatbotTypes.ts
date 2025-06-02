// Smart Office Assistant - Chatbot Integration Types
// TypeScript types for chatbot webhook integration

export type InteractionType = 'onboarding' | 'voice_command' | 'text_response' | 'quick_action';

export interface ChatbotWebhookPayload {
  first_time_user: boolean;
  isAudio: boolean;
  interaction_type: InteractionType;
  sessionId: string; // Unique session identifier for tracking conversations
  user_input?: string; // The actual user input/command (for voice_command and text_response)
  employee_details: {
    full_name: string;
    employee_id: string;
    date_of_joining: string; // ISO date format (YYYY-MM-DD)
    work_hours: string; // e.g., "9:00 AM - 5:00 PM" or "40 hours/week"
    work_mode: string; // e.g., "Remote", "Hybrid", "On-site"
    department: string;
    phone_number: string;
    location: string; // office location or home address
    wfh_eligibility: boolean; // true if eligible for work from home
  };
}

export interface ChatbotWebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  onboarding_messages?: string[];
  quick_actions?: string[];
  next_steps?: string[];
}

export interface ChatbotWebhookConfig {
  url: string;
  timeout: number;
  maxRetryAttempts: number;
  retryDelay: number;
}

export interface WebhookCallResult {
  success: boolean;
  response?: ChatbotWebhookResponse;
  error?: string;
  attempts: number;
  duration: number;
}
