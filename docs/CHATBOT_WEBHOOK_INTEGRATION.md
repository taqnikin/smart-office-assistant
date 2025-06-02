# Chatbot Webhook Integration

## Overview
This document describes the chatbot webhook integration implemented in the Smart Office Assistant application. The integration automatically triggers webhook notifications to the chatbot system when users authenticate, enabling personalized onboarding and ongoing support.

## Webhook URL
```
https://n8n.taqnik.in/webhook/a2e1a26e-d2bc-4e1c-b94a-cfb56f63489e
```

## Integration Points

### 1. Authentication Flow Integration
The webhook is triggered automatically in the following scenarios:
- **New user sign-in**: When a user signs in for the first time
- **Returning user sign-in**: When an existing user signs in
- **Session restoration**: When the app restores a user session on startup
- **Auth state changes**: When authentication state changes

### 2. Enhanced Payload Structure
The webhook sends a POST request with the following JSON payload:

```json
{
  "first_time_user": boolean,
  "isAudio": boolean,
  "interaction_type": "onboarding" | "voice_command" | "text_response" | "quick_action",
  "sessionId": string, // Unique session identifier for tracking conversations
  "user_input": string, // Optional: The actual user input/command
  "employee_details": {
    "full_name": string,
    "employee_id": string,
    "date_of_joining": string,
    "work_hours": string,
    "work_mode": string,
    "department": string,
    "phone_number": string,
    "location": string,
    "wfh_eligibility": boolean
  }
}
```

#### New Fields:
- **`isAudio`**: Boolean indicating if the interaction was via voice/audio input
- **`interaction_type`**: Type of interaction (onboarding, voice command, text response, quick action)
- **`sessionId`**: Unique session identifier for tracking conversations across multiple interactions
- **`user_input`**: The actual user input or command (for voice commands and text responses)

### 3. First-Time User Detection
The system determines first-time user status by:
- Checking the `is_first_time_user` field in the database
- Verifying if onboarding has been completed
- Fallback to `true` for users without complete profile data

### 4. Employee Data Mapping
The system maps database fields to webhook payload:
- `full_name` ← `employee_details.full_name`
- `employee_id` ← `employee_details.employee_id`
- `date_of_joining` ← `employee_details.date_of_joining`
- `work_hours` ← `employee_details.work_hours`
- `work_mode` ← Transformed from database values:
  - `'in-office'` → `'On-site'`
  - `'wfh'` → `'Remote'`
  - `'hybrid'` → `'Hybrid'`
- `department` ← `employee_details.department`
- `phone_number` ← `employee_details.phone_number`
- `location` ← `employee_details.location`
- `wfh_eligibility` ← `employee_details.wfh_eligibility` or derived from work_mode

## Implementation Files

### Core Services
- **`services/ChatbotWebhookService.ts`**: Main webhook service with retry logic and audio detection
- **`services/VoiceInteractionService.ts`**: Voice/audio interaction handling
- **`services/WebhookOnboardingService.ts`**: Webhook-based onboarding flow
- **`types/ChatbotTypes.ts`**: TypeScript type definitions with new interaction types

### Integration Points
- **`AuthContext.tsx`**: Webhook triggers in authentication flow
- **`screens/ChatbotScreen.tsx`**: Voice Assistant with webhook integration
- **`screens/OnboardingScreen.tsx`**: Webhook-based onboarding
- **`services/ConfigService.ts`**: Configuration management
- **`lib/supabase-api.ts`**: Database API extensions

### Testing
- **`components/ChatbotWebhookTest.tsx`**: Test component for webhook verification with audio testing

## Voice/Audio Integration

### Audio Detection
The system automatically detects when interactions are audio-based:
- **Voice Commands**: When users speak to the Voice Assistant
- **Text Responses**: When users type or click quick action buttons
- **Onboarding Interactions**: During the onboarding flow

### Interaction Types
- **`onboarding`**: Initial user onboarding flow
- **`voice_command`**: Voice-based commands via Voice Assistant
- **`text_response`**: Text-based responses and typed messages
- **`quick_action`**: Quick action button clicks

### Voice Assistant Integration
The ChatbotScreen Voice Assistant now:
- Sends voice commands to webhook with `isAudio: true`
- Includes the recognized speech text in `user_input`
- Processes webhook responses for dynamic conversations
- Falls back to local processing if webhook fails

## Session Management

### Session ID Generation
- **Unique per user session**: Each user gets one sessionId per authentication session
- **Persistent across interactions**: Same sessionId used for all webhook calls during a session
- **Format**: `{appname}_{timestamp}_{random}` (e.g., `smartoffice_1k2j3h4g5f_abc123def456`)
- **Automatic cleanup**: Sessions are cleaned up on logout or expiration

### Session Lifecycle
1. **Session Creation**: Generated when user authenticates successfully
2. **Session Persistence**: Stored locally and reused for all webhook calls
3. **Session Updates**: Activity timestamp updated on each interaction
4. **Session Cleanup**: Cleared on logout, sign-out, or expiration (24 hours)

### Session Benefits
- **Conversation Continuity**: Webhook can track conversation history across interactions
- **Context Preservation**: Maintain context between voice commands and text responses
- **Analytics**: Track user engagement and interaction patterns
- **Debugging**: Easier to trace issues across multiple webhook calls

## Configuration

### Environment Variables
```bash
EXPO_PUBLIC_CHATBOT_WEBHOOK_URL=https://n8n.taqnik.in/webhook/a2e1a26e-d2bc-4e1c-b94a-cfb56f63489e
EXPO_PUBLIC_CHATBOT_ENABLED=true
```

### Default Configuration
- **Timeout**: 30 seconds
- **Max Retry Attempts**: 3
- **Retry Delay**: 2 seconds (with exponential backoff)

## Error Handling

### Graceful Failure
- Webhook failures do not block user authentication
- Errors are logged but do not affect user experience
- Retry logic with exponential backoff for transient failures

### Logging
- Successful webhook calls are logged with timing information
- Failed attempts are logged with error details
- Network timeouts and connectivity issues are handled gracefully

## Testing

### Manual Testing
Use the `ChatbotWebhookTest` component to:
1. Test webhook connectivity
2. Send sample webhook payloads
3. Verify configuration settings

### Integration Testing
The webhook is automatically triggered during:
- User sign-in flow
- Session restoration
- Authentication state changes

## Security Considerations

### Data Privacy
- Only necessary employee information is sent to the webhook
- Sensitive data like passwords are never included
- User consent should be obtained for data sharing

### Network Security
- HTTPS-only webhook URL
- Request timeout to prevent hanging connections
- Retry limits to prevent excessive requests

## Monitoring

### Success Metrics
- Webhook success rate
- Response times
- Retry attempt frequency

### Error Monitoring
- Failed webhook attempts
- Network connectivity issues
- Configuration errors

## Troubleshooting

### Common Issues
1. **Webhook not triggered**: Check if `EXPO_PUBLIC_CHATBOT_ENABLED=true`
2. **Network timeouts**: Verify webhook URL accessibility
3. **Missing employee data**: Ensure user profile is complete
4. **Configuration errors**: Verify environment variables

### Debug Logging
Enable debug logging to see detailed webhook execution:
```bash
EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=true
```

## Future Enhancements

### Potential Improvements
- Webhook authentication/signing
- Batch webhook processing
- Webhook event types (login, logout, profile update)
- User preference for webhook notifications
- Webhook delivery confirmation
