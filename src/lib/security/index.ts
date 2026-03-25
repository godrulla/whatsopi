/**
 * WhatsOpí Security Framework
 * Comprehensive security implementation for Dominican Republic's informal economy
 * 
 * Features:
 * - Dominican Law 172-13 compliance
 * - PCI DSS Level 1 compliance
 * - Multi-language security (Spanish/Creole)
 * - Informal economy trust patterns
 * - AI/ML security measures
 * - Voice interface protection
 */

export * from './auth';
export * from './encryption';
export * from './validation';
export * from './monitoring';
export * from './privacy';
export * from './compliance';
export * from './threats';
export * from './api';
export * from './voice';
export * from './ai';

// Security configuration
export interface SecurityConfig {
  // Environment settings
  environment: 'development' | 'staging' | 'production';
  
  // Dominican Republic specific settings
  dominicanCompliance: {
    law172_13: boolean;
    dataProtectionOfficer: string;
    privacyNoticeLanguages: ('spanish' | 'creole')[];
  };
  
  // PCI DSS settings
  pciCompliance: {
    level: 1 | 2 | 3 | 4;
    tokenization: boolean;
    encryption: boolean;
  };
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    requests: {
      perMinute: number;
      perHour: number;
      perDay: number;
    };
  };
  
  // Authentication
  auth: {
    jwtExpiry: number;
    refreshTokenExpiry: number;
    mfaRequired: boolean;
    biometricAuth: boolean;
  };
  
  // Monitoring
  monitoring: {
    auditLogs: boolean;
    realTimeAlerts: boolean;
    threatDetection: boolean;
  };
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
  
  dominicanCompliance: {
    law172_13: true,
    dataProtectionOfficer: 'dpo@whatsopi.com',
    privacyNoticeLanguages: ['spanish', 'creole']
  },
  
  pciCompliance: {
    level: 1,
    tokenization: true,
    encryption: true
  },
  
  rateLimiting: {
    enabled: true,
    requests: {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000
    }
  },
  
  auth: {
    jwtExpiry: 15 * 60 * 1000, // 15 minutes
    refreshTokenExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
    mfaRequired: false, // Optional for basic users
    biometricAuth: true
  },
  
  monitoring: {
    auditLogs: true,
    realTimeAlerts: true,
    threatDetection: true
  }
};

// Security context for the application
export class SecurityContext {
  private config: SecurityConfig;
  
  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }
  
  getConfig(): SecurityConfig {
    return this.config;
  }
  
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  isCompliant(standard: 'dominican-172-13' | 'pci-dss' | 'aml-cft'): boolean {
    switch (standard) {
      case 'dominican-172-13':
        return this.config.dominicanCompliance.law172_13;
      case 'pci-dss':
        return this.config.pciCompliance.level === 1;
      case 'aml-cft':
        return true; // Will be implemented in compliance module
      default:
        return false;
    }
  }
}

// Global security context instance
export const securityContext = new SecurityContext();