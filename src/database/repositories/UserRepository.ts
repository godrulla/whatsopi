/**
 * User Repository
 * Secure user data access layer with encryption and Dominican Republic optimizations
 */

import { User, UserRole, Prisma } from '@prisma/client';
import { prisma, SecureRepository, cacheManager } from '../../api/src/config/database.js';
import { fieldEncryptor, FieldType } from '../../lib/security/encryption/index.js';
import { DominicanValidators } from '../../lib/security/validation/index.js';
import { auditLogger } from '../../lib/security/monitoring/index.js';

interface CreateUserData {
  email?: string;
  phoneNumber: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    address?: string;
    dateOfBirth?: string;
  };
  cedula?: string; // Dominican ID
  role?: UserRole;
  kycLevel?: number;
}

interface UpdateUserData {
  email?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    dateOfBirth?: string;
  };
  kycLevel?: number;
  isActive?: boolean;
  preferences?: any;
}

interface UserSearchFilters {
  role?: UserRole;
  kycLevel?: number;
  isActive?: boolean;
  isVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  phoneNumber?: string;
  email?: string;
}

export class UserRepository extends SecureRepository {
  private readonly encryptedFields = ['personalInfo', 'kycDocuments', 'cedula'];
  private readonly cachePrefix = 'user:';
  private readonly cacheTtl = 3600; // 1 hour

  protected getFieldType(fieldName: string): FieldType {
    switch (fieldName) {
      case 'personalInfo':
      case 'cedula':
        return FieldType.PII;
      case 'kycDocuments':
        return FieldType.SENSITIVE_DOCUMENT;
      default:
        return FieldType.GENERAL;
    }
  }

  /**
   * Create a new user with encrypted sensitive data
   */
  async create(userData: CreateUserData, createdBy?: string): Promise<User> {
    // Validate Dominican phone number
    const phoneValidation = DominicanValidators.validatePhoneNumber(userData.phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid Dominican phone number: ${phoneValidation.errors.join(', ')}`);
    }

    // Validate Dominican Cédula if provided
    if (userData.cedula) {
      const cedulaValidation = DominicanValidators.validateCedula(userData.cedula);
      if (!cedulaValidation.isValid) {
        throw new Error(`Invalid Dominican Cédula: ${cedulaValidation.errors.join(', ')}`);
      }
    }

    // Check for existing user
    const existingUser = await this.findByPhone(phoneValidation.sanitized);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    if (userData.email) {
      const existingEmail = await this.findByEmail(userData.email);
      if (existingEmail) {
        throw new Error('User with this email already exists');
      }
    }

    // Encrypt sensitive data
    const encryptedData = await this.encryptSensitiveFields({
      email: userData.email,
      phoneNumber: phoneValidation.sanitized,
      personalInfo: userData.personalInfo,
      cedula: userData.cedula,
      role: userData.role || UserRole.CUSTOMER,
      kycLevel: userData.kycLevel || 0
    }, this.encryptedFields);

    try {
      const user = await prisma.user.create({
        data: {
          email: encryptedData.email,
          phoneNumber: encryptedData.phoneNumber,
          personalInfo: encryptedData.personalInfo,
          cedula: encryptedData.cedula,
          role: encryptedData.role,
          kycLevel: encryptedData.kycLevel
        }
      });

      // Audit the creation
      await this.auditOperation('create', 'user', user.id, createdBy);

      // Cache the user (without sensitive data)
      await this.cacheUser(user);

      return await this.decryptSensitiveFields(user, this.encryptedFields);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by ID with decryption
   */
  async findById(id: string, useCache: boolean = true): Promise<User | null> {
    if (useCache) {
      const cached = await cacheManager.get(`${this.cachePrefix}${id}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallets: true,
        sessions: true
      }
    });

    if (!user) return null;

    const decryptedUser = await this.decryptSensitiveFields(user, this.encryptedFields);
    
    if (useCache) {
      await this.cacheUser(decryptedUser);
    }

    return decryptedUser;
  }

  /**
   * Find user by phone number
   */
  async findByPhone(phoneNumber: string): Promise<User | null> {
    const validation = DominicanValidators.validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: validation.sanitized },
      include: {
        wallets: true
      }
    });

    if (!user) return null;

    return await this.decryptSensitiveFields(user, this.encryptedFields);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        wallets: true
      }
    });

    if (!user) return null;

    return await this.decryptSensitiveFields(user, this.encryptedFields);
  }

  /**
   * Update user with encrypted fields
   */
  async update(id: string, updateData: UpdateUserData, updatedBy?: string): Promise<User> {
    const existingUser = await this.findById(id, false);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Encrypt updated sensitive data
    const encryptedData = await this.encryptSensitiveFields(
      updateData,
      this.encryptedFields.filter(field => updateData[field] !== undefined)
    );

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...encryptedData,
          updatedAt: new Date()
        },
        include: {
          wallets: true
        }
      });

      // Audit the update
      await this.auditOperation('update', 'user', id, updatedBy);

      // Invalidate cache
      await cacheManager.del(`${this.cachePrefix}${id}`);

      // Cache updated user
      const decryptedUser = await this.decryptSensitiveFields(updatedUser, this.encryptedFields);
      await this.cacheUser(decryptedUser);

      return decryptedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Update KYC level with validation
   */
  async updateKycLevel(id: string, kycLevel: number, documents?: any[], updatedBy?: string): Promise<User> {
    if (kycLevel < 0 || kycLevel > 3) {
      throw new Error('Invalid KYC level. Must be between 0 and 3');
    }

    const updateData: any = { kycLevel };
    
    if (documents && documents.length > 0) {
      updateData.kycDocuments = documents;
    }

    const user = await this.update(id, updateData, updatedBy);

    // Log KYC level change for compliance
    await auditLogger.logAudit({
      action: 'kyc_level_update',
      resource: 'user_kyc',
      userId: id,
      userRole: 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      success: true,
      details: {
        previousLevel: (await this.findById(id))?.kycLevel,
        newLevel: kycLevel,
        documentsProvided: documents?.length || 0
      },
      compliance: {
        dominican172_13: true,
        amlCft: true,
        pciDss: false
      }
    });

    return user;
  }

  /**
   * Activate/deactivate user account
   */
  async setActiveStatus(id: string, isActive: boolean, reason?: string, updatedBy?: string): Promise<User> {
    const user = await this.update(id, { isActive }, updatedBy);

    // Log status change for security
    await auditLogger.logAudit({
      action: isActive ? 'account_activated' : 'account_deactivated',
      resource: 'user_account',
      userId: id,
      userRole: updatedBy || 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      success: true,
      details: {
        reason,
        timestamp: new Date()
      },
      compliance: {
        dominican172_13: true,
        amlCft: false,
        pciDss: false
      }
    });

    return user;
  }

  /**
   * Search users with filters
   */
  async search(
    filters: UserSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: User[]; total: number; totalPages: number }> {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) where.role = filters.role;
    if (filters.kycLevel !== undefined) where.kycLevel = filters.kycLevel;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
    
    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = filters.createdAfter;
      if (filters.createdBefore) where.createdAt.lte = filters.createdBefore;
    }

    if (filters.phoneNumber) {
      const phoneValidation = DominicanValidators.validatePhoneNumber(filters.phoneNumber);
      if (phoneValidation.isValid) {
        where.phoneNumber = phoneValidation.sanitized;
      }
    }

    if (filters.email) {
      where.email = filters.email.toLowerCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          wallets: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Decrypt sensitive fields for all users
    const decryptedUsers = await Promise.all(
      users.map(user => this.decryptSensitiveFields(user, this.encryptedFields))
    );

    return {
      users: decryptedUsers,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    byRole: Record<UserRole, number>;
    byKycLevel: Record<number, number>;
    recentRegistrations: number;
  }> {
    const [
      total,
      active,
      roleStats,
      kycStats,
      recentCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true
      }),
      prisma.user.groupBy({
        by: ['kycLevel'],
        _count: true
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const byRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = stat._count;
      return acc;
    }, {} as Record<UserRole, number>);

    const byKycLevel = kycStats.reduce((acc, stat) => {
      acc[stat.kycLevel] = stat._count;
      return acc;
    }, {} as Record<number, number>);

    return {
      total,
      active,
      byRole,
      byKycLevel,
      recentRegistrations: recentCount
    };
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async delete(id: string, deletedBy?: string): Promise<void> {
    await this.setActiveStatus(id, false, 'Account deleted', deletedBy);
    
    // Invalidate cache
    await cacheManager.del(`${this.cachePrefix}${id}`);
  }

  /**
   * Cache user data (without sensitive information)
   */
  private async cacheUser(user: User): Promise<void> {
    const cacheData = {
      ...user,
      // Remove sensitive fields from cache
      personalInfo: undefined,
      kycDocuments: undefined,
      cedula: undefined
    };

    await cacheManager.set(
      `${this.cachePrefix}${user.id}`,
      JSON.stringify(cacheData),
      'l2',
      this.cacheTtl
    );
  }

  /**
   * Invalidate user cache
   */
  async invalidateCache(id: string): Promise<void> {
    await cacheManager.del(`${this.cachePrefix}${id}`);
  }

  /**
   * Get user's transaction limits based on KYC level
   */
  getTransactionLimits(kycLevel: number): {
    daily: number;
    monthly: number;
    perTransaction: number;
  } {
    const limits = {
      0: { daily: 5000, monthly: 50000, perTransaction: 1000 },    // Basic
      1: { daily: 25000, monthly: 250000, perTransaction: 5000 },  // Verified phone
      2: { daily: 100000, monthly: 1000000, perTransaction: 25000 }, // ID verified
      3: { daily: 500000, monthly: 5000000, perTransaction: 100000 }  // Full KYC
    };

    return limits[kycLevel] || limits[0];
  }
}