/**
 * Authentication & Authorization System
 * Designed for Dominican Republic's informal economy users
 * 
 * Features:
 * - WhatsApp OTP authentication
 * - Multi-factor authentication
 * - Biometric authentication
 * - Role-based access control (RBAC)
 * - Session management
 * - Device fingerprinting
 */

import { z } from 'zod';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Types
export interface User {
  id: string;
  phoneNumber: string;
  role: UserRole;
  kycLevel: KYCLevel;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  deviceFingerprints: string[];
  preferences: {
    language: 'spanish' | 'creole' | 'english';
    mfaEnabled: boolean;
    biometricEnabled: boolean;
  };
}

export enum UserRole {
  CUSTOMER = 'customer',
  MERCHANT = 'merchant',
  COLMADO_AGENT = 'colmado_agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum KYCLevel {
  UNVERIFIED = 0,
  PHONE_VERIFIED = 1,
  DOCUMENT_VERIFIED = 2,
  ENHANCED_VERIFIED = 3
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'bearer';
}

export interface SessionData {
  userId: string;
  role: UserRole;
  kycLevel: KYCLevel;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// Validation schemas
export const phoneNumberSchema = z.string()
  .regex(/^\+1[8-9]\d{9}$/, 'Invalid Dominican Republic phone number format');

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number and special character');

// Crypto utilities
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

// JWT utilities
export function generateTokens(user: User, deviceFingerprint: string): AuthToken {
  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const accessTokenPayload = {
    sub: user.id,
    role: user.role,
    kycLevel: user.kycLevel,
    deviceFingerprint,
    type: 'access',
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(accessTokenExpiry.getTime() / 1000)
  };
  
  const refreshTokenPayload = {
    sub: user.id,
    deviceFingerprint,
    type: 'refresh',
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(refreshTokenExpiry.getTime() / 1000)
  };
  
  const accessToken = sign(accessTokenPayload, process.env.JWT_SECRET!);
  const refreshToken = sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET!);
  
  return {
    accessToken,
    refreshToken,
    expiresAt: accessTokenExpiry,
    tokenType: 'bearer'
  };
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// Device fingerprinting
export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  acceptLanguage: string,
  timezone: string
): string {
  const data = `${userAgent}:${ipAddress}:${acceptLanguage}:${timezone}`;
  return Buffer.from(data).toString('base64');
}

// OTP management
export interface OTPData {
  code: string;
  phoneNumber: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
}

export class OTPManager {
  private otpStore = new Map<string, OTPData>();
  private readonly maxAttempts = 3;
  private readonly expiryMinutes = 5;
  
  generateOTP(phoneNumber: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.expiryMinutes * 60 * 1000);
    
    // Clean up expired OTPs
    this.cleanupExpiredOTPs();
    
    this.otpStore.set(phoneNumber, {
      code,
      phoneNumber,
      createdAt: now,
      expiresAt,
      attempts: 0,
      isUsed: false
    });
    
    return code;
  }
  
  verifyOTP(phoneNumber: string, code: string): boolean {
    const otpData = this.otpStore.get(phoneNumber);
    
    if (!otpData) {
      return false;
    }
    
    if (otpData.isUsed) {
      return false;
    }
    
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return false;
    }
    
    if (otpData.attempts >= this.maxAttempts) {
      this.otpStore.delete(phoneNumber);
      return false;
    }
    
    otpData.attempts++;
    
    if (otpData.code === code) {
      otpData.isUsed = true;
      return true;
    }
    
    return false;
  }
  
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [phoneNumber, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phoneNumber);
      }
    }
  }
}

// Permission system
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  conditions?: Record<string, any>;
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.CUSTOMER]: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'transactions', action: 'create' },
    { resource: 'transactions', action: 'read', conditions: { owner: true } },
    { resource: 'products', action: 'read' },
    { resource: 'orders', action: 'create' },
    { resource: 'orders', action: 'read', conditions: { owner: true } }
  ],
  
  [UserRole.MERCHANT]: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update', conditions: { owner: true } },
    { resource: 'products', action: 'delete', conditions: { owner: true } },
    { resource: 'orders', action: 'read' },
    { resource: 'payments', action: 'read' },
    { resource: 'analytics', action: 'read', conditions: { owner: true } }
  ],
  
  [UserRole.COLMADO_AGENT]: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'cash_operations', action: 'create' },
    { resource: 'cash_operations', action: 'read' },
    { resource: 'customer_verification', action: 'execute' },
    { resource: 'transaction_history', action: 'read' },
    { resource: 'reports', action: 'read', conditions: { agent: true } }
  ],
  
  [UserRole.ADMIN]: [
    { resource: '*', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'system', action: 'read' },
    { resource: 'compliance', action: 'read' },
    { resource: 'reports', action: 'read' }
  ],
  
  [UserRole.SUPER_ADMIN]: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
    { resource: '*', action: 'execute' }
  ]
};

// Authorization checker
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action'],
  context?: Record<string, any>
): boolean {
  const permissions = rolePermissions[userRole];
  
  for (const permission of permissions) {
    // Check for wildcard permission
    if (permission.resource === '*') {
      return true;
    }
    
    // Check for exact resource match
    if (permission.resource === resource && permission.action === action) {
      // Check conditions if they exist
      if (permission.conditions && context) {
        for (const [key, value] of Object.entries(permission.conditions)) {
          if (context[key] !== value) {
            continue;
          }
        }
      }
      return true;
    }
  }
  
  return false;
}

// Transaction limits based on KYC level
export const transactionLimits: Record<KYCLevel, { daily: number; monthly: number }> = {
  [KYCLevel.UNVERIFIED]: { daily: 50, monthly: 200 },
  [KYCLevel.PHONE_VERIFIED]: { daily: 500, monthly: 2000 },
  [KYCLevel.DOCUMENT_VERIFIED]: { daily: 5000, monthly: 20000 },
  [KYCLevel.ENHANCED_VERIFIED]: { daily: 50000, monthly: 200000 }
};

export function getTransactionLimit(kycLevel: KYCLevel, period: 'daily' | 'monthly'): number {
  return transactionLimits[kycLevel][period];
}

// Export instances
export const otpManager = new OTPManager();