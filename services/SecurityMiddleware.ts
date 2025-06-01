// Smart Office Assistant - Security Middleware
// Provides security checks and rate limiting for API calls

import { configService } from './ConfigService';
import { errorLogger, ErrorSeverity, ErrorCategory } from './ErrorLoggingService';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly MAX_AUTH_ATTEMPTS_PER_MINUTE = 5;
  private readonly BLOCK_DURATION = 300000; // 5 minutes

  private constructor() {
    // Clean up rate limit entries periodically
    setInterval(() => {
      this.cleanupRateLimitEntries();
    }, 60000); // Every minute
  }

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  // Rate limiting for general API calls
  async checkRateLimit(identifier: string, endpoint: string): Promise<SecurityCheckResult> {
    const key = `${identifier}:${endpoint}`;
    const now = Date.now();
    
    let entry = this.rateLimitMap.get(key);
    
    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        blocked: false
      };
      this.rateLimitMap.set(key, entry);
      return { allowed: true };
    }

    // Check if we're in a new time window
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.RATE_LIMIT_WINDOW;
      entry.blocked = false;
      return { allowed: true };
    }

    // Check if currently blocked
    if (entry.blocked) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded. Please try again later.',
        retryAfter 
      };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    const limit = endpoint.includes('auth') ? this.MAX_AUTH_ATTEMPTS_PER_MINUTE : this.MAX_REQUESTS_PER_MINUTE;
    
    if (entry.count > limit) {
      entry.blocked = true;
      entry.resetTime = now + this.BLOCK_DURATION; // Extend block time
      
      // Log security event
      await errorLogger.logError(`Rate limit exceeded for ${endpoint}`, {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.AUTHENTICATION,
        context: {
          screen: 'SecurityMiddleware',
          action: 'rateLimitExceeded',
          additionalData: { identifier, endpoint, count: entry.count }
        }
      });

      const retryAfter = Math.ceil(this.BLOCK_DURATION / 1000);
      return { 
        allowed: false, 
        reason: 'Too many requests. Account temporarily blocked.',
        retryAfter 
      };
    }

    return { allowed: true };
  }

  // Enhanced security checks for authentication
  async checkAuthSecurity(email: string, userAgent?: string, ipAddress?: string): Promise<SecurityCheckResult> {
    const checks: Promise<SecurityCheckResult>[] = [
      this.checkRateLimit(email, 'auth/signin'),
      this.checkSuspiciousActivity(email, userAgent, ipAddress),
      this.checkEmailSecurity(email)
    ];

    const results = await Promise.all(checks);
    
    // If any check fails, deny access
    for (const result of results) {
      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  }

  // Check for suspicious authentication activity
  private async checkSuspiciousActivity(email: string, userAgent?: string, ipAddress?: string): Promise<SecurityCheckResult> {
    // Check for rapid login attempts from different user agents
    if (userAgent) {
      const userAgentKey = `ua:${email}`;
      const entry = this.rateLimitMap.get(userAgentKey);
      
      if (entry && entry.count > 3) {
        return {
          allowed: false,
          reason: 'Suspicious activity detected. Please try again later.'
        };
      }
    }

    // Check for known malicious patterns
    if (this.containsMaliciousPatterns(email)) {
      await errorLogger.logError(`Malicious pattern detected in email: ${email}`, {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.AUTHENTICATION,
        context: {
          screen: 'SecurityMiddleware',
          action: 'maliciousPatternDetected',
          additionalData: { email, userAgent, ipAddress }
        }
      });

      return {
        allowed: false,
        reason: 'Invalid request format.'
      };
    }

    return { allowed: true };
  }

  // Email-specific security checks
  private async checkEmailSecurity(email: string): Promise<SecurityCheckResult> {
    // Check for disposable email domains
    if (this.isDisposableEmail(email)) {
      return {
        allowed: false,
        reason: 'Disposable email addresses are not allowed.'
      };
    }

    // Check for suspicious email patterns
    if (this.hasSuspiciousEmailPattern(email)) {
      return {
        allowed: false,
        reason: 'Invalid email format.'
      };
    }

    return { allowed: true };
  }

  // Input validation security
  validateInput(input: string, type: 'text' | 'email' | 'phone' | 'id'): SecurityCheckResult {
    // Check for common injection patterns
    if (this.containsInjectionPatterns(input)) {
      return {
        allowed: false,
        reason: 'Invalid characters detected.'
      };
    }

    // Check input length
    const maxLengths = {
      text: 1000,
      email: 254,
      phone: 20,
      id: 50
    };

    if (input.length > maxLengths[type]) {
      return {
        allowed: false,
        reason: `Input too long. Maximum ${maxLengths[type]} characters allowed.`
      };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(input)) {
      return {
        allowed: false,
        reason: 'Invalid input format.'
      };
    }

    return { allowed: true };
  }

  // File upload security
  validateFileUpload(fileName: string, fileSize: number, mimeType: string): SecurityCheckResult {
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(extension)) {
      return {
        allowed: false,
        reason: 'File type not allowed.'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return {
        allowed: false,
        reason: 'File size too large. Maximum 10MB allowed.'
      };
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        allowed: false,
        reason: 'Invalid file type.'
      };
    }

    return { allowed: true };
  }

  // Security helper methods
  private containsMaliciousPatterns(input: string): boolean {
    const maliciousPatterns = [
      /[<>\"']/,  // HTML/XSS patterns
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /(union|select|insert|delete|update|drop|create|alter|exec)/i,
      /(\|\||&&|;|`)/,  // Command injection patterns
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  private containsInjectionPatterns(input: string): boolean {
    const injectionPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /(union|select|insert|delete|update|drop|create|alter|exec)\s+/i,
      /(\|\||&&|;|`|\\)/,
      /(\.\.\/|\.\.\\)/,  // Path traversal
    ];

    return injectionPatterns.some(pattern => pattern.test(input));
  }

  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /\b(admin|root|administrator|system|test|demo)\b/i,
      /\b(password|passwd|pwd|secret|key|token)\b/i,
      /[^\x20-\x7E]/,  // Non-printable characters
      /(.)\1{10,}/,  // Repeated characters (potential DoS)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email', 'temp-mail.org'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  private hasSuspiciousEmailPattern(email: string): boolean {
    // Check for suspicious patterns in email
    const suspiciousPatterns = [
      /\+.*\+/,  // Multiple plus signs
      /\.{2,}/,  // Multiple consecutive dots
      /@.*@/,    // Multiple @ symbols
      /[<>]/,    // HTML brackets
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  private cleanupRateLimitEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime && !entry.blocked) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  // Get security metrics for monitoring
  getSecurityMetrics(): {
    activeRateLimits: number;
    blockedRequests: number;
    totalRequests: number;
  } {
    let blockedRequests = 0;
    let totalRequests = 0;

    for (const entry of this.rateLimitMap.values()) {
      totalRequests += entry.count;
      if (entry.blocked) {
        blockedRequests++;
      }
    }

    return {
      activeRateLimits: this.rateLimitMap.size,
      blockedRequests,
      totalRequests
    };
  }

  // Clear all rate limits (for testing or emergency)
  clearAllRateLimits(): void {
    this.rateLimitMap.clear();
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance();
export default securityMiddleware;
