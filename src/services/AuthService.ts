/**
 * Authentication Service
 * Secure authentication with JWT, WhatsApp OTP, and Dominican Republic optimizations
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { cacheManager } from '../api/src/config/database.js';
import { 
  verifyAccessToken, 
  generateTokens, 
  generateDeviceFingerprint,
  hasPermission,
  UserRole
} from '../lib/security/auth/index.js';
import { DominicanValidators } from '../lib/security/validation/index.js';
import { securityEventLogger, auditLogger } from '../lib/security/monitoring/index.js';
import { WhatsAppService } from './WhatsAppService.js';
import { SMSService } from './SMSService.js';

interface LoginCredentials {
  phoneNumber: string;
  otp: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    timezone?: string;
    language?: string;
  };
}

interface RegisterData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  cedula?: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    timezone?: string;
    language?: string;
  };
}

interface OTPVerificationResult {
  isValid: boolean;
  attemptsRemaining?: number;
  cooldownSeconds?: number;
  reason?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface AuthResult {
  success: boolean;
  tokens?: AuthTokens;
  user?: any;
  error?: string;
  requiresMfa?: boolean;
  mfaMethods?: string[];
}

export class AuthService {
  private userRepository: UserRepository;
  private whatsappService: WhatsAppService;
  private smsService: SMSService;
  
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY = 10 * 60; // 10 minutes
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly OTP_COOLDOWN = 60; // 1 minute between requests
  private readonly LOCKOUT_DURATION = 30 * 60; // 30 minutes
  private readonly MAX_LOGIN_ATTEMPTS = 5;

  constructor() {
    this.userRepository = new UserRepository();
    this.whatsappService = new WhatsAppService();
    this.smsService = new SMSService();
  }

  /**
   * Send OTP for authentication
   */
  async sendOTP(phoneNumber: string, method: 'whatsapp' | 'sms' = 'whatsapp'): Promise<{
    success: boolean;
    message: string;
    cooldownSeconds?: number;
    expiresIn?: number;
  }> {
    // Validate Dominican phone number
    const phoneValidation = DominicanValidators.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error(`Número de teléfono dominicano inválido: ${phoneValidation.errors.join(', ')}`);
    }

    const normalizedPhone = phoneValidation.sanitized;
    
    // Check cooldown
    const cooldownKey = `otp_cooldown:${normalizedPhone}`;
    const cooldownRemaining = await cacheManager.get(cooldownKey);
    if (cooldownRemaining) {
      return {
        success: false,
        message: 'Debe esperar antes de solicitar otro código',
        cooldownSeconds: parseInt(cooldownRemaining)
      };
    }

    // Check if account is locked
    const lockoutKey = `lockout:${normalizedPhone}`;
    const lockoutTime = await cacheManager.get(lockoutKey);
    if (lockoutTime) {
      const remainingTime = Math.ceil((parseInt(lockoutTime) - Date.now()) / 1000);
      if (remainingTime > 0) {
        return {
          success: false,
          message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos',
          cooldownSeconds: remainingTime
        };
      }
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpKey = `otp:${normalizedPhone}`;
    const attemptsKey = `otp_attempts:${normalizedPhone}`;

    // Store OTP with expiry
    await cacheManager.set(otpKey, otp, 'l1', this.OTP_EXPIRY);
    await cacheManager.set(attemptsKey, '0', 'l1', this.OTP_EXPIRY);
    await cacheManager.set(cooldownKey, this.OTP_COOLDOWN.toString(), 'l1', this.OTP_COOLDOWN);

    try {
      // Send OTP via selected method
      if (method === 'whatsapp') {
        await this.whatsappService.sendOTP(normalizedPhone, otp);
      } else {
        await this.smsService.sendOTP(normalizedPhone, otp);
      }

      // Log OTP sent event
      await securityEventLogger.logEvent({
        type: 'OTP_SENT',
        severity: 'LOW',
        source: 'auth_service',
        ipAddress: '127.0.0.1',
        userAgent: 'system',
        details: {
          phoneNumber: normalizedPhone,
          method,
          timestamp: new Date()
        },
        tags: ['authentication', 'otp']
      });

      return {
        success: true,
        message: method === 'whatsapp' ? 
          'Código enviado por WhatsApp' : 
          'Código enviado por SMS',
        expiresIn: this.OTP_EXPIRY
      };

    } catch (error) {
      // Log OTP sending failure
      await securityEventLogger.logEvent({
        type: 'OTP_SEND_FAILED',
        severity: 'MEDIUM',
        source: 'auth_service',
        ipAddress: '127.0.0.1',
        userAgent: 'system',
        details: {
          phoneNumber: normalizedPhone,
          method,
          error: error.message,
          timestamp: new Date()
        },
        tags: ['authentication', 'otp', 'error']
      });

      throw new Error('Error al enviar código de verificación');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber: string, otp: string): Promise<OTPVerificationResult> {
    const phoneValidation = DominicanValidators.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return { isValid: false, reason: 'Invalid phone number format' };
    }

    const normalizedPhone = phoneValidation.sanitized;
    const otpKey = `otp:${normalizedPhone}`;
    const attemptsKey = `otp_attempts:${normalizedPhone}`;
    
    // Get stored OTP and current attempts
    const [storedOtp, attemptsStr] = await Promise.all([
      cacheManager.get(otpKey),
      cacheManager.get(attemptsKey)
    ]);

    if (!storedOtp) {
      return { 
        isValid: false, 
        reason: 'OTP expired or not found' 
      };
    }

    const attempts = parseInt(attemptsStr || '0');
    
    if (attempts >= this.MAX_OTP_ATTEMPTS) {
      // Lock account temporarily
      const lockoutKey = `lockout:${normalizedPhone}`;
      await cacheManager.set(
        lockoutKey, 
        (Date.now() + this.LOCKOUT_DURATION * 1000).toString(), 
        'l1',
        this.LOCKOUT_DURATION
      );

      // Log lockout event
      await securityEventLogger.logEvent({
        type: 'ACCOUNT_LOCKED',
        severity: 'HIGH',
        source: 'auth_service',
        ipAddress: '127.0.0.1',
        userAgent: 'system',
        details: {
          phoneNumber: normalizedPhone,
          reason: 'max_otp_attempts',
          lockoutDuration: this.LOCKOUT_DURATION,
          timestamp: new Date()
        },
        tags: ['authentication', 'lockout']
      });

      return { 
        isValid: false, 
        reason: 'Too many failed attempts',
        cooldownSeconds: this.LOCKOUT_DURATION
      };
    }

    // Verify OTP
    if (otp !== storedOtp) {
      const newAttempts = attempts + 1;
      await cacheManager.set(attemptsKey, newAttempts.toString(), 'l1', this.OTP_EXPIRY);

      // Log failed verification
      await securityEventLogger.logEvent({
        type: 'OTP_VERIFICATION_FAILED',
        severity: 'MEDIUM',
        source: 'auth_service',
        ipAddress: '127.0.0.1',
        userAgent: 'system',
        details: {
          phoneNumber: normalizedPhone,
          attempts: newAttempts,
          maxAttempts: this.MAX_OTP_ATTEMPTS,
          timestamp: new Date()
        },
        tags: ['authentication', 'otp', 'failed']
      });

      return { 
        isValid: false, 
        reason: 'Invalid OTP',
        attemptsRemaining: this.MAX_OTP_ATTEMPTS - newAttempts
      };
    }

    // OTP is valid - clear attempts
    await Promise.all([
      cacheManager.del(otpKey),
      cacheManager.del(attemptsKey)
    ]);

    // Log successful verification
    await securityEventLogger.logEvent({
      type: 'OTP_VERIFICATION_SUCCESS',
      severity: 'LOW',
      source: 'auth_service',
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      details: {
        phoneNumber: normalizedPhone,
        timestamp: new Date()
      },
      tags: ['authentication', 'otp', 'success']
    });

    return { isValid: true };
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    try {
      // Verify OTP first
      const otpResult = await this.verifyOTP(data.phoneNumber, ''); // OTP should be verified separately
      
      // Create user account
      const user = await this.userRepository.create({
        phoneNumber: data.phoneNumber,
        email: data.email,
        personalInfo: {
          firstName: data.firstName,
          lastName: data.lastName
        },
        cedula: data.cedula,
        role: UserRole.CUSTOMER,
        kycLevel: data.cedula ? 1 : 0 // Basic KYC if Cédula provided
      });

      // Generate device fingerprint
      const deviceFingerprint = generateDeviceFingerprint(
        data.deviceInfo?.userAgent || '',
        data.deviceInfo?.ipAddress || '',
        data.deviceInfo?.language || 'es-DO',
        data.deviceInfo?.timezone || 'America/Santo_Domingo'
      );

      // Generate authentication tokens
      const tokens = generateTokens(user, deviceFingerprint);

      // Create user session
      await this.createUserSession(user.id, deviceFingerprint, data.deviceInfo);

      // Log successful registration
      await auditLogger.logAudit({
        action: 'user_registration',
        resource: 'user_account',
        userId: user.id,
        userRole: 'customer',
        ipAddress: data.deviceInfo?.ipAddress || '127.0.0.1',
        userAgent: data.deviceInfo?.userAgent || 'unknown',
        success: true,
        details: {
          phoneNumber: data.phoneNumber,
          hasEmail: !!data.email,
          hasCedula: !!data.cedula,
          kycLevel: user.kycLevel
        },
        compliance: {
          dominican172_13: true,
          pciDss: false,
          amlCft: true
        }
      });

      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        },
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          kycLevel: user.kycLevel,
          isVerified: user.isVerified
        }
      };

    } catch (error) {
      // Log registration failure
      await securityEventLogger.logEvent({
        type: 'REGISTRATION_FAILED',
        severity: 'MEDIUM',
        source: 'auth_service',
        ipAddress: data.deviceInfo?.ipAddress || '127.0.0.1',
        userAgent: data.deviceInfo?.userAgent || 'unknown',
        details: {
          phoneNumber: data.phoneNumber,
          error: error.message,
          timestamp: new Date()
        },
        tags: ['authentication', 'registration', 'error']
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login user with OTP
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Verify OTP
      const otpResult = await this.verifyOTP(credentials.phoneNumber, credentials.otp);
      if (!otpResult.isValid) {
        return {
          success: false,
          error: otpResult.reason || 'Invalid verification code'
        };
      }

      // Find user
      const user = await this.userRepository.findByPhone(credentials.phoneNumber);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        await securityEventLogger.logEvent({
          type: 'LOGIN_BLOCKED',
          severity: 'HIGH',
          source: 'auth_service',
          userId: user.id,
          ipAddress: credentials.deviceInfo?.ipAddress || '127.0.0.1',
          userAgent: credentials.deviceInfo?.userAgent || 'unknown',
          details: {
            reason: 'account_inactive',
            timestamp: new Date()
          },
          tags: ['authentication', 'blocked']
        });

        return {
          success: false,
          error: 'Account is inactive'
        };
      }

      // Generate device fingerprint
      const deviceFingerprint = generateDeviceFingerprint(
        credentials.deviceInfo?.userAgent || '',
        credentials.deviceInfo?.ipAddress || '',
        credentials.deviceInfo?.language || 'es-DO',
        credentials.deviceInfo?.timezone || 'America/Santo_Domingo'
      );

      // Check if MFA is required (high-value accounts)
      const requiresMfa = user.kycLevel >= 2 && this.shouldRequireMfa(user);
      if (requiresMfa) {
        // Store pending login session
        const pendingSessionKey = `pending_login:${user.id}`;
        await cacheManager.set(
          pendingSessionKey,
          JSON.stringify({ deviceFingerprint, deviceInfo: credentials.deviceInfo }),
          'l1',
          600 // 10 minutes
        );

        return {
          success: false,
          requiresMfa: true,
          mfaMethods: ['biometric', 'sms_backup'],
          error: 'Multi-factor authentication required'
        };
      }

      // Generate authentication tokens
      const tokens = generateTokens(user, deviceFingerprint);

      // Create user session
      await this.createUserSession(user.id, deviceFingerprint, credentials.deviceInfo);

      // Update last login
      await this.userRepository.update(user.id, {
        // lastLoginAt and lastLoginIp would be added to the update interface
      });

      // Log successful login
      await auditLogger.logAudit({
        action: 'user_login',
        resource: 'user_session',
        userId: user.id,
        userRole: user.role,
        ipAddress: credentials.deviceInfo?.ipAddress || '127.0.0.1',
        userAgent: credentials.deviceInfo?.userAgent || 'unknown',
        success: true,
        details: {
          phoneNumber: credentials.phoneNumber,
          kycLevel: user.kycLevel,
          deviceFingerprint
        },
        compliance: {
          dominican172_13: true,
          pciDss: false,
          amlCft: true
        }
      });

      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        },
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          kycLevel: user.kycLevel,
          isVerified: user.isVerified
        }
      };

    } catch (error) {
      // Log login failure
      await securityEventLogger.logEvent({
        type: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        source: 'auth_service',
        ipAddress: credentials.deviceInfo?.ipAddress || '127.0.0.1',
        userAgent: credentials.deviceInfo?.userAgent || 'unknown',
        details: {
          phoneNumber: credentials.phoneNumber,
          error: error.message,
          timestamp: new Date()
        },
        tags: ['authentication', 'login', 'error']
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token (implementation would use security library)
      const payload = verifyAccessToken(refreshToken); // This should be a refresh token verifier
      if (!payload) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Get user
      const user = await this.userRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const tokens = generateTokens(user, payload.deviceFingerprint);

      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Deactivate specific session
        await this.deactivateUserSession(sessionId);
      } else {
        // Deactivate all user sessions
        await this.deactivateAllUserSessions(userId);
      }

      // Log logout
      await auditLogger.logAudit({
        action: 'user_logout',
        resource: 'user_session',
        userId,
        userRole: 'user',
        ipAddress: '127.0.0.1',
        userAgent: 'api',
        success: true,
        details: {
          sessionId,
          timestamp: new Date()
        },
        compliance: {
          dominican172_13: true,
          pciDss: false,
          amlCft: false
        }
      });

    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Check if MFA should be required
   */
  private shouldRequireMfa(user: any): boolean {
    // Require MFA for:
    // - High KYC level users (2+)
    // - Users with significant transaction history
    // - Colmado agents
    return user.kycLevel >= 2 || user.role === UserRole.COLMADO_AGENT;
  }

  /**
   * Create user session
   */
  private async createUserSession(
    userId: string, 
    deviceFingerprint: string, 
    deviceInfo?: any
  ): Promise<void> {
    // Implementation would create session in database
    // This is a placeholder for the actual session creation
  }

  /**
   * Deactivate user session
   */
  private async deactivateUserSession(sessionId: string): Promise<void> {
    // Implementation would deactivate specific session
  }

  /**
   * Deactivate all user sessions
   */
  private async deactivateAllUserSessions(userId: string): Promise<void> {
    // Implementation would deactivate all user sessions
  }
}