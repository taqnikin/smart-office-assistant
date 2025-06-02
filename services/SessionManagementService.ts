// Smart Office Assistant - Session Management Service
// Manages unique session IDs for chatbot webhook tracking

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configService } from './ConfigService';

export interface ChatbotSession {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  isActive: boolean;
}

class SessionManagementService {
  private static instance: SessionManagementService;
  private readonly CHATBOT_SESSION_KEY = 'chatbot_session';
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private currentSession: ChatbotSession | null = null;

  private constructor() {}

  static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService();
    }
    return SessionManagementService.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const userAgent = configService.appName.replace(/\s+/g, '').toLowerCase();
    return `${userAgent}_${timestamp}_${randomPart}`;
  }

  /**
   * Get or create a chatbot session for a user
   */
  async getOrCreateSession(userId: string): Promise<string> {
    try {
      // Check if we have a current session in memory
      if (this.currentSession && this.currentSession.userId === userId) {
        // Check if session is still valid
        if (this.isSessionValid(this.currentSession)) {
          // Update last activity
          this.currentSession.lastActivity = Date.now();
          await this.saveSession(this.currentSession);
          console.log('📱 SessionManagement: Using existing in-memory session:', this.currentSession.sessionId);
          return this.currentSession.sessionId;
        } else {
          // Session expired, clear it
          this.currentSession = null;
        }
      }

      // Try to load session from storage
      const storedSession = await this.loadSession(userId);
      if (storedSession && this.isSessionValid(storedSession)) {
        // Update last activity and use stored session
        storedSession.lastActivity = Date.now();
        this.currentSession = storedSession;
        await this.saveSession(storedSession);
        console.log('💾 SessionManagement: Using stored session:', storedSession.sessionId);
        return storedSession.sessionId;
      }

      // Create new session
      const newSession: ChatbotSession = {
        sessionId: this.generateSessionId(),
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true
      };

      this.currentSession = newSession;
      await this.saveSession(newSession);
      console.log('🆕 SessionManagement: Created new session:', newSession.sessionId);
      return newSession.sessionId;

    } catch (error) {
      console.error('❌ SessionManagement: Error getting/creating session:', error);
      // Fallback: generate a temporary session ID
      const fallbackSessionId = this.generateSessionId();
      console.log('🔄 SessionManagement: Using fallback session:', fallbackSessionId);
      return fallbackSessionId;
    }
  }

  /**
   * Check if a session is still valid
   */
  private isSessionValid(session: ChatbotSession): boolean {
    const now = Date.now();
    const isNotExpired = (now - session.createdAt) < this.SESSION_TIMEOUT;
    const isActive = session.isActive;
    
    return isNotExpired && isActive;
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: ChatbotSession): Promise<void> {
    try {
      const sessionKey = `${this.CHATBOT_SESSION_KEY}_${session.userId}`;
      await AsyncStorage.setItem(sessionKey, JSON.stringify(session));
    } catch (error) {
      console.error('❌ SessionManagement: Error saving session:', error);
    }
  }

  /**
   * Load session from storage
   */
  private async loadSession(userId: string): Promise<ChatbotSession | null> {
    try {
      const sessionKey = `${this.CHATBOT_SESSION_KEY}_${userId}`;
      const sessionData = await AsyncStorage.getItem(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as ChatbotSession;
    } catch (error) {
      console.error('❌ SessionManagement: Error loading session:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(userId: string): Promise<void> {
    try {
      if (this.currentSession && this.currentSession.userId === userId) {
        this.currentSession.lastActivity = Date.now();
        await this.saveSession(this.currentSession);
      } else {
        // Try to load and update stored session
        const storedSession = await this.loadSession(userId);
        if (storedSession && this.isSessionValid(storedSession)) {
          storedSession.lastActivity = Date.now();
          this.currentSession = storedSession;
          await this.saveSession(storedSession);
        }
      }
    } catch (error) {
      console.error('❌ SessionManagement: Error updating session activity:', error);
    }
  }

  /**
   * End current session
   */
  async endSession(userId: string): Promise<void> {
    try {
      console.log('🔚 SessionManagement: Ending session for user:', userId);
      
      // Mark current session as inactive
      if (this.currentSession && this.currentSession.userId === userId) {
        this.currentSession.isActive = false;
        await this.saveSession(this.currentSession);
        this.currentSession = null;
      }

      // Also mark stored session as inactive
      const storedSession = await this.loadSession(userId);
      if (storedSession) {
        storedSession.isActive = false;
        await this.saveSession(storedSession);
      }
    } catch (error) {
      console.error('❌ SessionManagement: Error ending session:', error);
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): ChatbotSession | null {
    return this.currentSession;
  }

  /**
   * Clear all sessions (for logout/cleanup)
   */
  async clearAllSessions(): Promise<void> {
    try {
      console.log('🧹 SessionManagement: Clearing all sessions');
      this.currentSession = null;
      
      // Get all keys and remove chatbot session keys
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith(this.CHATBOT_SESSION_KEY));
      
      if (sessionKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionKeys);
      }
    } catch (error) {
      console.error('❌ SessionManagement: Error clearing sessions:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith(this.CHATBOT_SESSION_KEY));
      
      for (const key of sessionKeys) {
        const sessionData = await AsyncStorage.getItem(key);
        if (sessionData) {
          const session: ChatbotSession = JSON.parse(sessionData);
          if (!this.isSessionValid(session)) {
            await AsyncStorage.removeItem(key);
            console.log('🗑️ SessionManagement: Cleaned up expired session:', session.sessionId);
          }
        }
      }
    } catch (error) {
      console.error('❌ SessionManagement: Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get session statistics for debugging
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith(this.CHATBOT_SESSION_KEY));
      
      let activeSessions = 0;
      let expiredSessions = 0;
      
      for (const key of sessionKeys) {
        const sessionData = await AsyncStorage.getItem(key);
        if (sessionData) {
          const session: ChatbotSession = JSON.parse(sessionData);
          if (this.isSessionValid(session)) {
            activeSessions++;
          } else {
            expiredSessions++;
          }
        }
      }
      
      return {
        totalSessions: sessionKeys.length,
        activeSessions,
        expiredSessions
      };
    } catch (error) {
      console.error('❌ SessionManagement: Error getting session stats:', error);
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }
  }
}

// Export singleton instance
export const sessionManagementService = SessionManagementService.getInstance();
