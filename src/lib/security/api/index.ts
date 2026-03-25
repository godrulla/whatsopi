/**
 * API Security Framework
 * Comprehensive API protection for WhatsOpí platform
 * 
 * Features:
 * - Rate limiting with different tiers
 * - Request validation and sanitization
 * - API key management
 * - CORS configuration
 * - Request/response filtering
 * - Webhook signature verification
 * - API versioning security
 */

import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';

// Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface APIKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: RateLimitConfig;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usage: {
    requests: number;
    errors: number;
    bandwidth: number;
  };
}

export interface RequestValidationRule {
  path: string;
  method: string;
  schema: z.ZodSchema;
  rateLimit?: RateLimitConfig;
  requiresAuth: boolean;
  permissions?: string[];
}

// Rate limiting implementation
export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }
  
  // Check if request is allowed
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry) {
      // First request
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      });
      return true;
    }
    
    // Check if window has expired
    if (now > entry.resetTime) {
      // Reset window
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      entry.blocked = false;
      return true;
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      entry.blocked = true;
      return false;
    }
    
    // Increment counter
    entry.count++;
    return true;
  }
  
  // Get remaining requests for a key
  getRemaining(key: string, config: RateLimitConfig): number {
    const entry = this.store.get(key);
    if (!entry) {
      return config.maxRequests;
    }
    
    const now = Date.now();
    if (now > entry.resetTime) {
      return config.maxRequests;
    }
    
    return Math.max(0, config.maxRequests - entry.count);
  }
  
  // Get reset time for a key
  getResetTime(key: string): number {
    const entry = this.store.get(key);
    return entry ? entry.resetTime : Date.now();
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Rate limit configurations for different user types
export const rateLimitConfigs = {
  // Basic users (phone-verified)
  basic: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (req: any) => `basic:${req.user?.id || req.ip}`
  },
  
  // Verified users (KYC completed)
  verified: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    keyGenerator: (req: any) => `verified:${req.user?.id || req.ip}`
  },
  
  // Merchants
  merchant: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    keyGenerator: (req: any) => `merchant:${req.user?.id || req.ip}`
  },
  
  // Colmado agents
  agent: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 2000,
    keyGenerator: (req: any) => `agent:${req.user?.id || req.ip}`
  },
  
  // WhatsApp webhook (high frequency)
  whatsapp: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000,
    keyGenerator: (req: any) => `whatsapp:${req.ip}`
  },
  
  // Public endpoints (no auth required)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    keyGenerator: (req: any) => `public:${req.ip}`
  }
};

// Input validation schemas
export const validationSchemas = {
  // Phone number validation (Dominican Republic format)
  phoneNumber: z.string()
    .regex(/^\+1[8-9]\d{9}$/, 'Invalid Dominican Republic phone number'),
  
  // Financial amount validation
  amount: z.number()
    .positive('Amount must be positive')
    .max(50000, 'Amount exceeds maximum limit')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  
  // OTP validation
  otp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  
  // User input sanitization
  userInput: z.string()
    .max(1000, 'Input too long')
    .regex(/^[a-zA-Z0-9\s\u00C0-\u017F.,!?-]*$/, 'Invalid characters in input'),
  
  // File upload validation
  fileUpload: z.object({
    name: z.string().max(255),
    size: z.number().max(10 * 1024 * 1024), // 10MB
    type: z.enum(['image/jpeg', 'image/png', 'application/pdf'])
  }),
  
  // Transaction validation
  transaction: z.object({
    amount: z.number().positive().max(50000),
    currency: z.enum(['DOP', 'USD']),
    recipientPhone: z.string().regex(/^\+1[8-9]\d{9}$/),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional()
  }),
  
  // WhatsApp message validation
  whatsappMessage: z.object({
    from: z.string().regex(/^\+1[8-9]\d{9}$/),
    body: z.string().max(4096),
    type: z.enum(['text', 'audio', 'image', 'document']),
    timestamp: z.string().datetime()
  })
};

// Request validation middleware
export class RequestValidator {
  private rules = new Map<string, RequestValidationRule>();
  
  addRule(rule: RequestValidationRule): void {
    const key = `${rule.method}:${rule.path}`;
    this.rules.set(key, rule);
  }
  
  validate(method: string, path: string, data: any): { valid: boolean; errors?: string[] } {
    const key = `${method}:${path}`;
    const rule = this.rules.get(key);
    
    if (!rule) {
      return { valid: true }; // No validation rule defined
    }
    
    try {
      rule.schema.parse(data);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }
  
  getRule(method: string, path: string): RequestValidationRule | undefined {
    const key = `${method}:${path}`;
    return this.rules.get(key);
  }
}

// API key management
export class APIKeyManager {
  private keys = new Map<string, APIKey>();
  
  // Generate new API key
  generateKey(name: string, permissions: string[], rateLimit: RateLimitConfig): APIKey {
    const id = this.generateId();
    const key = this.generateSecureKey();
    
    const apiKey: APIKey = {
      id,
      key,
      name,
      permissions,
      rateLimit,
      isActive: true,
      createdAt: new Date(),
      usage: {
        requests: 0,
        errors: 0,
        bandwidth: 0
      }
    };
    
    this.keys.set(key, apiKey);
    return apiKey;
  }
  
  // Validate API key
  validateKey(key: string): APIKey | null {
    const apiKey = this.keys.get(key);
    
    if (!apiKey || !apiKey.isActive) {
      return null;
    }
    
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }
    
    // Update usage statistics
    apiKey.lastUsedAt = new Date();
    apiKey.usage.requests++;
    
    return apiKey;
  }
  
  // Check if API key has permission
  hasPermission(key: string, permission: string): boolean {
    const apiKey = this.keys.get(key);
    if (!apiKey) return false;
    
    return apiKey.permissions.includes('*') || apiKey.permissions.includes(permission);
  }
  
  // Revoke API key
  revokeKey(key: string): boolean {
    const apiKey = this.keys.get(key);
    if (apiKey) {
      apiKey.isActive = false;
      return true;
    }
    return false;
  }
  
  private generateId(): string {
    return 'ak_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  private generateSecureKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'wopi_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Webhook signature verification
export class WebhookVerifier {
  // Verify WhatsApp webhook signature
  static verifyWhatsAppSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }
  
  // Verify payment webhook signature
  static verifyPaymentSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }
  
  // Generate webhook signature for outgoing requests
  static generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

// CORS configuration
export const corsConfig = {
  // Production origins
  production: [
    'https://whatsopi.com',
    'https://app.whatsopi.com',
    'https://merchant.whatsopi.com',
    'https://admin.whatsopi.com'
  ],
  
  // Development origins
  development: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Device-Fingerprint',
    'Accept-Language'
  ],
  
  // Exposed headers
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID'
  ],
  
  // Credentials
  credentials: true,
  
  // Max age for preflight requests
  maxAge: 86400 // 24 hours
};

// Security headers
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.whatsapp.com https://graph.facebook.com;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private'
};

// Request sanitization
export class RequestSanitizer {
  // Sanitize string input
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }
  
  // Sanitize phone number
  static sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }
  
  // Sanitize financial amount
  static sanitizeAmount(amount: any): number {
    const num = parseFloat(String(amount).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
  }
  
  // Sanitize object recursively
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Export instances
export const rateLimiter = new RateLimiter();
export const requestValidator = new RequestValidator();
export const apiKeyManager = new APIKeyManager();

// Initialize validation rules
requestValidator.addRule({
  path: '/api/auth/login',
  method: 'POST',
  schema: z.object({
    phoneNumber: validationSchemas.phoneNumber,
    otp: validationSchemas.otp
  }),
  rateLimit: rateLimitConfigs.public,
  requiresAuth: false
});

requestValidator.addRule({
  path: '/api/transactions/send',
  method: 'POST',
  schema: validationSchemas.transaction,
  rateLimit: rateLimitConfigs.verified,
  requiresAuth: true,
  permissions: ['transactions:create']
});

requestValidator.addRule({
  path: '/api/webhooks/whatsapp',
  method: 'POST',
  schema: validationSchemas.whatsappMessage,
  rateLimit: rateLimitConfigs.whatsapp,
  requiresAuth: false
});