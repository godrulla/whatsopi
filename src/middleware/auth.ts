/**
 * Authentication Middleware
 * JWT verification and authorization for WhatsOpí API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { 
  verifyAccessToken, 
  hasPermission,
  UserRole,
  KYCLevel 
} from '../lib/security/auth/index.js';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { securityEventLogger } from '../lib/security/monitoring/index.js';
import { cacheManager } from '../api/src/config/database.js';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phoneNumber: string;
        email?: string;
        role: UserRole;
        kycLevel: number;
        isActive: boolean;
        isVerified: boolean;
      };
      sessionId?: string;
    }
  }
}

const userRepository = new UserRepository();

/**
 * Middleware to verify JWT access token
 */
export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso requerido',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      // Log failed authentication attempt
      await securityEventLogger.logEvent({
        type: 'AUTHENTICATION_FAILED',
        severity: 'MEDIUM',
        source: 'auth_middleware',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          reason: 'invalid_token',
          endpoint: req.path,
          method: req.method
        },
        tags: ['authentication', 'token_verification']
      });

      res.status(401).json({
        success: false,
        error: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if token is blacklisted
    const blacklistKey = `blacklist:${token}`;
    const isBlacklisted = await cacheManager.get(blacklistKey);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token revocado',
        code: 'TOKEN_REVOKED'
      });
      return;
    }

    // Get user from database (with caching)
    const user = await userRepository.findById(payload.sub, true);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Check if user account is active
    if (!user.isActive) {
      await securityEventLogger.logEvent({
        type: 'ACCESS_DENIED',
        severity: 'HIGH',
        source: 'auth_middleware',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          reason: 'account_inactive',
          endpoint: req.path,
          method: req.method
        },
        tags: ['authentication', 'account_status']
      });

      res.status(403).json({
        success: false,
        error: 'Cuenta inactiva',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Verify device fingerprint for security
    const currentFingerprint = generateDeviceFingerprint(
      req.get('User-Agent') || '',
      req.ip,
      req.get('Accept-Language') || 'es-DO',
      req.get('X-Timezone') || 'America/Santo_Domingo'
    );

    if (payload.deviceFingerprint !== currentFingerprint) {
      await securityEventLogger.logEvent({
        type: 'SUSPICIOUS_ACCESS',
        severity: 'HIGH',
        source: 'auth_middleware',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          reason: 'device_fingerprint_mismatch',
          expected: payload.deviceFingerprint,
          actual: currentFingerprint,
          endpoint: req.path,
          method: req.method
        },
        tags: ['authentication', 'device_security']
      });

      res.status(401).json({
        success: false,
        error: 'Dispositivo no reconocido. Inicie sesión nuevamente.',
        code: 'DEVICE_MISMATCH'
      });
      return;
    }

    // Update last activity timestamp
    await updateLastActivity(user.id, req.ip);

    // Attach user to request
    req.user = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      kycLevel: user.kycLevel,
      isActive: user.isActive,
      isVerified: user.isVerified
    };

    req.sessionId = payload.sessionId;

    next();

  } catch (error) {
    await securityEventLogger.logEvent({
      type: 'AUTHENTICATION_ERROR',
      severity: 'HIGH',
      source: 'auth_middleware',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      details: {
        error: error.message,
        endpoint: req.path,
        method: req.method
      },
      tags: ['authentication', 'error']
    });

    res.status(500).json({
      success: false,
      error: 'Error de autenticación interno',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Autenticación requerida',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const context = {
        owner: req.user.id,
        kycLevel: req.user.kycLevel,
        isVerified: req.user.isVerified
      };

      const hasAccess = hasPermission(req.user.role, resource, action, context);

      if (!hasAccess) {
        await securityEventLogger.logEvent({
          type: 'ACCESS_DENIED',
          severity: 'MEDIUM',
          source: 'permission_middleware',
          userId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
          details: {
            resource,
            action,
            userRole: req.user.role,
            kycLevel: req.user.kycLevel,
            endpoint: req.path,
            method: req.method
          },
          tags: ['authorization', 'access_denied']
        });

        res.status(403).json({
          success: false,
          error: 'Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            required: `${action} on ${resource}`,
            userRole: req.user.role
          }
        });
        return;
      }

      next();

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error de autorización interno',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Middleware to require minimum KYC level
 */
export const requireKYCLevel = (minLevel: KYCLevel) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    if (req.user.kycLevel < minLevel) {
      const kycMessages = {
        0: 'Verificación básica requerida',
        1: 'Verificación de teléfono requerida',
        2: 'Verificación de identidad requerida',
        3: 'Verificación completa requerida'
      };

      await securityEventLogger.logEvent({
        type: 'ACCESS_DENIED',
        severity: 'LOW',
        source: 'kyc_middleware',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          currentKycLevel: req.user.kycLevel,
          requiredKycLevel: minLevel,
          endpoint: req.path,
          method: req.method
        },
        tags: ['authorization', 'kyc_level']
      });

      res.status(403).json({
        success: false,
        error: kycMessages[minLevel] || 'Nivel de verificación insuficiente',
        code: 'INSUFFICIENT_KYC_LEVEL',
        details: {
          currentLevel: req.user.kycLevel,
          requiredLevel: minLevel,
          upgradeUrl: '/api/kyc/upgrade'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require specific user role
 */
export const requireRole = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      await securityEventLogger.logEvent({
        type: 'ACCESS_DENIED',
        severity: 'MEDIUM',
        source: 'role_middleware',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          userRole: req.user.role,
          requiredRoles: roles,
          endpoint: req.path,
          method: req.method
        },
        tags: ['authorization', 'role_check']
      });

      res.status(403).json({
        success: false,
        error: 'Rol de usuario insuficiente',
        code: 'INSUFFICIENT_ROLE',
        details: {
          userRole: req.user.role,
          requiredRoles: roles
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for admin-only endpoints
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Middleware for merchant and above
 */
export const requireMerchant = requireRole(
  UserRole.MERCHANT, 
  UserRole.COLMADO_AGENT, 
  UserRole.ADMIN, 
  UserRole.SUPER_ADMIN
);

/**
 * Middleware to validate resource ownership
 */
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // Admins can access any resource
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource or has permission
    const hasAccess = await checkResourceOwnership(userId, resourceId, req.path);

    if (!hasAccess) {
      await securityEventLogger.logEvent({
        type: 'ACCESS_DENIED',
        severity: 'MEDIUM',
        source: 'ownership_middleware',
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        details: {
          resourceId,
          resourceIdParam,
          endpoint: req.path,
          method: req.method
        },
        tags: ['authorization', 'ownership']
      });

      res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a este recurso',
        code: 'RESOURCE_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for optional authentication
 * Attaches user if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    if (payload) {
      const user = await userRepository.findById(payload.sub, true);
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          kycLevel: user.kycLevel,
          isActive: user.isActive,
          isVerified: user.isVerified
        };
      }
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Helper function to generate device fingerprint
 */
function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string,
  language: string,
  timezone: string
): string {
  // Import the actual implementation from security library
  // This is a placeholder
  const crypto = require('crypto');
  const fingerprint = `${userAgent}:${ipAddress}:${language}:${timezone}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Helper function to update user's last activity
 */
async function updateLastActivity(userId: string, ipAddress: string): Promise<void> {
  try {
    const activityKey = `activity:${userId}`;
    const activityData = {
      lastActiveAt: new Date().toISOString(),
      lastActiveIp: ipAddress
    };
    
    await cacheManager.set(
      activityKey,
      JSON.stringify(activityData),
      'l1',
      3600 // 1 hour
    );
  } catch (error) {
    console.error('Failed to update last activity:', error);
  }
}

/**
 * Helper function to check resource ownership
 */
async function checkResourceOwnership(
  userId: string, 
  resourceId: string, 
  endpoint: string
): Promise<boolean> {
  try {
    // This is a simplified check - in production, this would query
    // the appropriate service/repository based on the endpoint
    
    if (endpoint.includes('/users/')) {
      return userId === resourceId;
    }
    
    if (endpoint.includes('/transactions/')) {
      // Check if user owns the transaction
      const transaction = await userRepository.findById(resourceId);
      return transaction && (
        transaction.senderId === userId || 
        transaction.recipientId === userId
      );
    }
    
    if (endpoint.includes('/orders/')) {
      // Check if user owns the order
      // This would query the order service
      return true; // Placeholder
    }
    
    // Default to allowing access for now
    return true;
    
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
}

export default {
  authMiddleware,
  requirePermission,
  requireKYCLevel,
  requireRole,
  requireAdmin,
  requireMerchant,
  requireOwnership,
  optionalAuth
};