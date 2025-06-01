// Smart Office Assistant - Input Validation and Sanitization Service
// Provides comprehensive input validation and sanitization for security

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

interface PasswordStrength {
  score: number; // 0-4 (weak to strong)
  feedback: string[];
  isValid: boolean;
}

class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Email validation with comprehensive checks
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    let sanitizedEmail = email?.trim().toLowerCase() || '';

    // Basic presence check
    if (!sanitizedEmail) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    // Length check
    if (sanitizedEmail.length > 254) {
      errors.push('Email is too long (maximum 254 characters)');
    }

    // Format validation (RFC 5322 compliant)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(sanitizedEmail)) {
      errors.push('Please enter a valid email address');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(sanitizedEmail)) {
      errors.push('Email contains invalid characters');
    }

    // Domain validation
    const domain = sanitizedEmail.split('@')[1];
    if (domain && domain.includes('..')) {
      errors.push('Email domain is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitizedEmail
    };
  }

  // Password validation with strength checking
  validatePassword(password: string): ValidationResult & { strength: PasswordStrength } {
    const errors: string[] = [];
    const strength = this.checkPasswordStrength(password);

    // Basic presence check
    if (!password) {
      errors.push('Password is required');
      return { 
        isValid: false, 
        errors, 
        strength: { score: 0, feedback: ['Password is required'], isValid: false }
      };
    }

    // Length requirements
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password is too long (maximum 128 characters)');
    }

    // Complexity requirements
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    if (this.isCommonPassword(password)) {
      errors.push('This password is too common. Please choose a more unique password');
    }

    // Check for sequential or repeated characters
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters (e.g., 123, abc)');
    }

    if (this.hasRepeatedChars(password)) {
      errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
    }

    return {
      isValid: errors.length === 0 && strength.isValid,
      errors: errors.concat(strength.feedback),
      strength
    };
  }

  // Text input sanitization
  sanitizeText(input: string, options: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  } = {}): ValidationResult {
    const errors: string[] = [];
    let sanitized = input || '';

    // Trim whitespace
    sanitized = sanitized.trim();

    // Length validation
    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`Text is too long (maximum ${options.maxLength} characters)`);
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // HTML sanitization
    if (!options.allowHtml) {
      sanitized = this.stripHtml(sanitized);
    }

    // Special character validation
    if (!options.allowSpecialChars) {
      const specialCharRegex = /[<>\"'&]/g;
      if (specialCharRegex.test(sanitized)) {
        errors.push('Text contains invalid special characters');
        sanitized = sanitized.replace(specialCharRegex, '');
      }
    }

    // Check for SQL injection patterns
    if (this.containsSqlInjectionPatterns(sanitized)) {
      errors.push('Text contains potentially harmful content');
      sanitized = this.removeSqlInjectionPatterns(sanitized);
    }

    // Check for XSS patterns
    if (this.containsXssPatterns(sanitized)) {
      errors.push('Text contains potentially harmful content');
      sanitized = this.removeXssPatterns(sanitized);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  // Phone number validation
  validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = phone?.replace(/\D/g, '') || ''; // Remove non-digits

    if (!sanitized) {
      errors.push('Phone number is required');
      return { isValid: false, errors };
    }

    // Length validation (assuming international format)
    if (sanitized.length < 10 || sanitized.length > 15) {
      errors.push('Phone number must be between 10 and 15 digits');
    }

    // Format validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(sanitized)) {
      errors.push('Please enter a valid phone number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  // Employee ID validation
  validateEmployeeId(employeeId: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = employeeId?.trim().toUpperCase() || '';

    if (!sanitized) {
      errors.push('Employee ID is required');
      return { isValid: false, errors };
    }

    // Format validation (alphanumeric, 3-20 characters)
    const employeeIdRegex = /^[A-Z0-9]{3,20}$/;
    if (!employeeIdRegex.test(sanitized)) {
      errors.push('Employee ID must be 3-20 alphanumeric characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  // Date validation
  validateDate(dateString: string): ValidationResult {
    const errors: string[] = [];
    const sanitized = dateString?.trim() || '';

    if (!sanitized) {
      errors.push('Date is required');
      return { isValid: false, errors };
    }

    const date = new Date(sanitized);
    if (isNaN(date.getTime())) {
      errors.push('Please enter a valid date');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    };
  }

  // Private helper methods
  private checkPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety scoring
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Provide feedback
    if (score < 3) {
      feedback.push('Password is weak');
    } else if (score < 4) {
      feedback.push('Password is moderate');
    } else {
      feedback.push('Password is strong');
    }

    return {
      score,
      feedback,
      isValid: score >= 3
    };
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'shadow', 'superman', 'michael'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = ['123', '234', '345', '456', '567', '678', '789', 'abc', 'bcd', 'cde'];
    return sequences.some(seq => password.toLowerCase().includes(seq));
  }

  private hasRepeatedChars(password: string): boolean {
    return /(.)\1{2,}/.test(password);
  }

  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /[<>]/,  // HTML tags
      /javascript:/i,  // JavaScript protocol
      /data:/i,  // Data protocol
      /vbscript:/i,  // VBScript protocol
    ];
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private containsSqlInjectionPatterns(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(SCRIPT|IFRAME|OBJECT|EMBED|FORM)\b)/i,
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private containsXssPatterns(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private removeSqlInjectionPatterns(input: string): string {
    return input
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      .replace(/(--|\/\*|\*\/)/g, '')
      .replace(/(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi, '');
  }

  private removeXssPatterns(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  private stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();
export default validationService;
