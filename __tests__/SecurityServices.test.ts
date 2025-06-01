// Smart Office Assistant - Security Services Tests
// Tests for validation, secure storage, and security middleware

import { validationService } from '../services/ValidationService';
import { securityMiddleware } from '../services/SecurityMiddleware';

// Mock AsyncStorage and SecureStore
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

describe('ValidationService', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com'
      ];

      validEmails.forEach(email => {
        const result = validationService.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedValue).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain..com',
        'user@domain.com.',
        'user name@domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = validationService.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should detect suspicious email patterns', () => {
      const suspiciousEmails = [
        'user<script>@domain.com',
        'user@domain.com<script>',
        'javascript:alert()@domain.com'
      ];

      suspiciousEmails.forEach(email => {
        const result = validationService.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email contains invalid characters');
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password2024',
        'Complex#Pass$word9'
      ];

      strongPasswords.forEach(password => {
        const result = validationService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.strength.score).toBeGreaterThanOrEqual(3);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '',
        '123',
        'password',
        'abc123',
        'PASSWORD',
        '12345678'
      ];

      weakPasswords.forEach(password => {
        const result = validationService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should detect common passwords', () => {
      const commonPasswords = [
        'password',
        'password123',
        '123456',
        'qwerty'
      ];

      commonPasswords.forEach(password => {
        const result = validationService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('too common'))).toBe(true);
      });
    });

    it('should detect sequential and repeated characters', () => {
      const result1 = validationService.validatePassword('Password123!');
      expect(result1.errors.some(error => error.includes('sequential'))).toBe(true);

      const result2 = validationService.validatePassword('Passwordaaa!');
      expect(result2.errors.some(error => error.includes('repeated'))).toBe(true);
    });
  });

  describe('Text Sanitization', () => {
    it('should sanitize HTML content', () => {
      const htmlInput = '<script>alert("xss")</script>Hello World';
      const result = validationService.sanitizeText(htmlInput, { allowHtml: false });
      
      expect(result.sanitizedValue).not.toContain('<script>');
      expect(result.sanitizedValue).toContain('Hello World');
    });

    it('should detect SQL injection patterns', () => {
      const sqlInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "UNION SELECT * FROM users"
      ];

      sqlInputs.forEach(input => {
        const result = validationService.sanitizeText(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('harmful content'))).toBe(true);
      });
    });

    it('should detect XSS patterns', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        '<iframe src="javascript:alert()"></iframe>',
        'javascript:alert("xss")',
        '<img onerror="alert()" src="x">'
      ];

      xssInputs.forEach(input => {
        const result = validationService.sanitizeText(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('harmful content'))).toBe(true);
      });
    });

    it('should enforce length limits', () => {
      const longText = 'a'.repeat(1000);
      const result = validationService.sanitizeText(longText, { maxLength: 100 });
      
      expect(result.errors.some(error => error.includes('too long'))).toBe(true);
      expect(result.sanitizedValue?.length).toBe(100);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '1234567890',
        '+1234567890',
        '12345678901234'
      ];

      validPhones.forEach(phone => {
        const result = validationService.validatePhoneNumber(phone);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toMatch(/^\d+$/);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123',
        '12345678901234567890',
        'abc1234567890'
      ];

      invalidPhones.forEach(phone => {
        const result = validationService.validatePhoneNumber(phone);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Employee ID Validation', () => {
    it('should validate correct employee IDs', () => {
      const validIds = [
        'EMP123',
        'USER001',
        'ADMIN999',
        'ABC123XYZ'
      ];

      validIds.forEach(id => {
        const result = validationService.validateEmployeeId(id);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(id.toUpperCase());
      });
    });

    it('should reject invalid employee IDs', () => {
      const invalidIds = [
        '',
        'AB',
        'employee-123',
        'emp@123',
        'a'.repeat(25)
      ];

      invalidIds.forEach(id => {
        const result = validationService.validateEmployeeId(id);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('SecurityMiddleware', () => {
  beforeEach(() => {
    securityMiddleware.clearAllRateLimits();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const result = await securityMiddleware.checkRateLimit('user1', 'api/test');
      expect(result.allowed).toBe(true);
    });

    it('should block requests exceeding rate limit', async () => {
      const identifier = 'user1';
      const endpoint = 'api/test';

      // Make requests up to the limit
      for (let i = 0; i < 60; i++) {
        await securityMiddleware.checkRateLimit(identifier, endpoint);
      }

      // Next request should be blocked
      const result = await securityMiddleware.checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should have stricter limits for auth endpoints', async () => {
      const identifier = 'user1';
      const endpoint = 'auth/signin';

      // Make requests up to the auth limit (5)
      for (let i = 0; i < 5; i++) {
        await securityMiddleware.checkRateLimit(identifier, endpoint);
      }

      // Next request should be blocked
      const result = await securityMiddleware.checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should validate safe input', () => {
      const safeInputs = [
        'Hello World',
        'user@example.com',
        '1234567890',
        'EMP123'
      ];

      safeInputs.forEach(input => {
        const result = securityMiddleware.validateInput(input, 'text');
        expect(result.allowed).toBe(true);
      });
    });

    it('should block malicious input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        'javascript:alert()',
        '../../etc/passwd'
      ];

      maliciousInputs.forEach(input => {
        const result = securityMiddleware.validateInput(input, 'text');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Invalid');
      });
    });

    it('should enforce input length limits', () => {
      const longInput = 'a'.repeat(2000);
      const result = securityMiddleware.validateInput(longInput, 'text');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('File Upload Validation', () => {
    it('should allow safe file uploads', () => {
      const safeFiles = [
        { name: 'document.pdf', size: 1024 * 1024, type: 'application/pdf' },
        { name: 'image.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' },
        { name: 'photo.png', size: 500 * 1024, type: 'image/png' }
      ];

      safeFiles.forEach(file => {
        const result = securityMiddleware.validateFileUpload(file.name, file.size, file.type);
        expect(result.allowed).toBe(true);
      });
    });

    it('should block unsafe file uploads', () => {
      const unsafeFiles = [
        { name: 'script.exe', size: 1024, type: 'application/x-executable' },
        { name: 'virus.bat', size: 1024, type: 'application/x-bat' },
        { name: 'large.pdf', size: 20 * 1024 * 1024, type: 'application/pdf' }
      ];

      unsafeFiles.forEach(file => {
        const result = securityMiddleware.validateFileUpload(file.name, file.size, file.type);
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('Authentication Security', () => {
    it('should allow legitimate authentication attempts', async () => {
      const result = await securityMiddleware.checkAuthSecurity(
        'user@example.com',
        'Mozilla/5.0 (compatible browser)',
        '192.168.1.1'
      );
      expect(result.allowed).toBe(true);
    });

    it('should block disposable email addresses', async () => {
      const result = await securityMiddleware.checkAuthSecurity(
        'user@10minutemail.com',
        'Mozilla/5.0 (compatible browser)',
        '192.168.1.1'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Disposable email');
    });
  });

  describe('Security Metrics', () => {
    it('should provide security metrics', async () => {
      // Generate some activity
      await securityMiddleware.checkRateLimit('user1', 'api/test');
      await securityMiddleware.checkRateLimit('user2', 'api/test');

      const metrics = securityMiddleware.getSecurityMetrics();
      expect(metrics.activeRateLimits).toBeGreaterThan(0);
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });
  });
});
