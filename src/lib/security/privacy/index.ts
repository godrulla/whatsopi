/**
 * Privacy Controls & Consent Management System
 * Dominican Law 172-13 compliant privacy framework
 * 
 * Features:
 * - Granular consent management
 * - Data subject rights (access, rectification, deletion, portability)
 * - Privacy-by-design principles
 * - Multi-language privacy notices (Spanish/Creole)
 * - Data minimization and retention policies
 * - Breach notification procedures
 * - Cross-border transfer controls
 */

import { z } from 'zod';

// Types
export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: DataProcessingPurpose;
  legalBasis: LegalBasis;
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: ConsentMethod;
  language: 'spanish' | 'creole' | 'english';
  consentText: string;
  withdrawalDate?: Date;
  withdrawalMethod?: ConsentMethod;
  ipAddress: string;
  userAgent: string;
  version: number; // For consent versioning
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: DataSubjectRequestType;
  status: RequestStatus;
  submittedAt: Date;
  completedAt?: Date;
  requestDetails: any;
  response?: any;
  verificationMethod: VerificationMethod;
  language: 'spanish' | 'creole' | 'english';
  processingNotes: string[];
}

export interface PrivacyNotice {
  id: string;
  version: string;
  language: 'spanish' | 'creole' | 'english';
  effectiveDate: Date;
  content: PrivacyNoticeContent;
  isActive: boolean;
}

export interface DataInventory {
  id: string;
  dataCategory: DataCategory;
  dataTypes: string[];
  processingPurposes: DataProcessingPurpose[];
  legalBasis: LegalBasis[];
  retentionPeriod: number; // in days
  dataSubjects: string[];
  recipients: string[];
  crossBorderTransfers: CrossBorderTransfer[];
  securityMeasures: string[];
  lastUpdated: Date;
}

export interface PrivacyBreach {
  id: string;
  discoveredAt: Date;
  reportedAt?: Date;
  description: string;
  affectedDataTypes: DataCategory[];
  affectedUsers: number;
  severity: BreachSeverity;
  riskLevel: RiskLevel;
  containmentMeasures: string[];
  notificationStatus: {
    authority: boolean;
    authorityDate?: Date;
    dataSubjects: boolean;
    dataSubjectsDate?: Date;
  };
  status: BreachStatus;
  responsiblePerson: string;
}

export enum DataProcessingPurpose {
  SERVICE_PROVISION = 'service_provision',
  AUTHENTICATION = 'authentication',
  PAYMENT_PROCESSING = 'payment_processing',
  FRAUD_PREVENTION = 'fraud_prevention',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  CUSTOMER_SUPPORT = 'customer_support',
  LEGAL_COMPLIANCE = 'legal_compliance',
  RESEARCH_DEVELOPMENT = 'research_development'
}

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export enum ConsentMethod {
  WEB_FORM = 'web_form',
  MOBILE_APP = 'mobile_app',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  VOICE_CALL = 'voice_call',
  IN_PERSON = 'in_person'
}

export enum DataSubjectRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection'
}

export enum RequestStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  VERIFICATION_REQUIRED = 'verification_required',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  PARTIALLY_FULFILLED = 'partially_fulfilled'
}

export enum VerificationMethod {
  OTP_SMS = 'otp_sms',
  OTP_WHATSAPP = 'otp_whatsapp',
  DOCUMENT_UPLOAD = 'document_upload',
  BIOMETRIC = 'biometric',
  IN_PERSON = 'in_person'
}

export enum DataCategory {
  PERSONAL_IDENTIFIERS = 'personal_identifiers',
  CONTACT_INFORMATION = 'contact_information',
  FINANCIAL_DATA = 'financial_data',
  BIOMETRIC_DATA = 'biometric_data',
  LOCATION_DATA = 'location_data',
  BEHAVIORAL_DATA = 'behavioral_data',
  DEVICE_DATA = 'device_data',
  COMMUNICATION_DATA = 'communication_data'
}

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum BreachStatus {
  DISCOVERED = 'discovered',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  NOTIFIED = 'notified',
  RESOLVED = 'resolved'
}

export interface PrivacyNoticeContent {
  title: string;
  introduction: string;
  dataController: {
    name: string;
    address: string;
    contact: string;
    dpo: string;
  };
  dataProcessing: {
    purposes: DataProcessingPurpose[];
    legalBasis: LegalBasis[];
    categories: DataCategory[];
    sources: string[];
  };
  recipients: string[];
  retention: {
    periods: Record<DataCategory, number>;
    criteria: string;
  };
  rights: {
    access: string;
    rectification: string;
    erasure: string;
    portability: string;
    restriction: string;
    objection: string;
    complaint: string;
  };
  cookies: {
    essential: string[];
    analytics: string[];
    marketing: string[];
  };
  updates: string;
  contact: string;
}

export interface CrossBorderTransfer {
  recipient: string;
  country: string;
  adequacyDecision: boolean;
  safeguards: string[];
  purpose: string;
}

// Consent Management System
export class ConsentManager {
  private consents = new Map<string, ConsentRecord[]>();
  
  // Record consent
  recordConsent(
    userId: string,
    purpose: DataProcessingPurpose,
    legalBasis: LegalBasis,
    consentGiven: boolean,
    method: ConsentMethod,
    language: 'spanish' | 'creole' | 'english',
    consentText: string,
    ipAddress: string,
    userAgent: string
  ): ConsentRecord {
    const userConsents = this.consents.get(userId) || [];
    
    // Check if there's an existing consent for this purpose
    const existingConsent = userConsents.find(c => 
      c.purpose === purpose && !c.withdrawalDate
    );
    
    if (existingConsent) {
      // Withdraw existing consent
      existingConsent.withdrawalDate = new Date();
      existingConsent.withdrawalMethod = method;
    }
    
    const consentRecord: ConsentRecord = {
      id: this.generateConsentId(),
      userId,
      purpose,
      legalBasis,
      consentGiven,
      consentDate: new Date(),
      consentMethod: method,
      language,
      consentText,
      ipAddress,
      userAgent,
      version: this.getLatestConsentVersion(purpose)
    };
    
    userConsents.push(consentRecord);
    this.consents.set(userId, userConsents);
    
    return consentRecord;
  }
  
  // Check if user has valid consent for purpose
  hasValidConsent(userId: string, purpose: DataProcessingPurpose): boolean {
    const userConsents = this.consents.get(userId) || [];
    
    const validConsent = userConsents.find(c => 
      c.purpose === purpose && 
      c.consentGiven && 
      !c.withdrawalDate
    );
    
    return !!validConsent;
  }
  
  // Withdraw consent
  withdrawConsent(
    userId: string,
    purpose: DataProcessingPurpose,
    method: ConsentMethod
  ): boolean {
    const userConsents = this.consents.get(userId) || [];
    
    const activeConsent = userConsents.find(c => 
      c.purpose === purpose && 
      c.consentGiven && 
      !c.withdrawalDate
    );
    
    if (activeConsent) {
      activeConsent.withdrawalDate = new Date();
      activeConsent.withdrawalMethod = method;
      return true;
    }
    
    return false;
  }
  
  // Get consent history for user
  getConsentHistory(userId: string): ConsentRecord[] {
    return this.consents.get(userId) || [];
  }
  
  // Get consent audit trail
  getConsentAuditTrail(userId: string, purpose: DataProcessingPurpose): ConsentRecord[] {
    const userConsents = this.consents.get(userId) || [];
    return userConsents.filter(c => c.purpose === purpose);
  }
  
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private getLatestConsentVersion(purpose: DataProcessingPurpose): number {
    // In practice, this would track consent text versions
    return 1;
  }
}

// Data Subject Rights Manager
export class DataSubjectRightsManager {
  private requests = new Map<string, DataSubjectRequest[]>();
  
  // Submit data subject request
  submitRequest(
    userId: string,
    type: DataSubjectRequestType,
    requestDetails: any,
    verificationMethod: VerificationMethod,
    language: 'spanish' | 'creole' | 'english'
  ): DataSubjectRequest {
    const userRequests = this.requests.get(userId) || [];
    
    const request: DataSubjectRequest = {
      id: this.generateRequestId(),
      userId,
      type,
      status: RequestStatus.SUBMITTED,
      submittedAt: new Date(),
      requestDetails,
      verificationMethod,
      language,
      processingNotes: []
    };
    
    userRequests.push(request);
    this.requests.set(userId, userRequests);
    
    // Auto-process certain requests
    this.autoProcessRequest(request);
    
    return request;
  }
  
  // Process access request
  processAccessRequest(requestId: string): any {
    const request = this.findRequest(requestId);
    if (!request || request.type !== DataSubjectRequestType.ACCESS) {
      throw new Error('Invalid access request');
    }
    
    // Collect all user data
    const userData = this.collectUserData(request.userId);
    
    request.status = RequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.response = userData;
    
    return userData;
  }
  
  // Process rectification request
  processRectificationRequest(requestId: string, corrections: any): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.type !== DataSubjectRequestType.RECTIFICATION) {
      throw new Error('Invalid rectification request');
    }
    
    // Apply corrections (implementation would update actual data)
    const success = this.applyDataCorrections(request.userId, corrections);
    
    request.status = success ? RequestStatus.COMPLETED : RequestStatus.REJECTED;
    request.completedAt = new Date();
    request.response = { corrected: success, details: corrections };
    
    return success;
  }
  
  // Process erasure request
  processErasureRequest(requestId: string): boolean {
    const request = this.findRequest(requestId);
    if (!request || request.type !== DataSubjectRequestType.ERASURE) {
      throw new Error('Invalid erasure request');
    }
    
    // Check if erasure is possible (legal obligations, etc.)
    const canErase = this.canEraseUserData(request.userId);
    
    if (canErase) {
      const success = this.eraseUserData(request.userId);
      request.status = success ? RequestStatus.COMPLETED : RequestStatus.REJECTED;
      request.response = { erased: success };
      return success;
    } else {
      request.status = RequestStatus.REJECTED;
      request.response = { erased: false, reason: 'Legal obligations prevent erasure' };
      return false;
    }
  }
  
  // Process portability request
  processPortabilityRequest(requestId: string): any {
    const request = this.findRequest(requestId);
    if (!request || request.type !== DataSubjectRequestType.PORTABILITY) {
      throw new Error('Invalid portability request');
    }
    
    // Export user data in machine-readable format
    const exportData = this.exportUserDataForPortability(request.userId);
    
    request.status = RequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.response = exportData;
    
    return exportData;
  }
  
  // Get user requests
  getUserRequests(userId: string): DataSubjectRequest[] {
    return this.requests.get(userId) || [];
  }
  
  // Get pending requests
  getPendingRequests(): DataSubjectRequest[] {
    const allRequests: DataSubjectRequest[] = [];
    for (const userRequests of this.requests.values()) {
      allRequests.push(...userRequests);
    }
    
    return allRequests.filter(r => 
      [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, 
       RequestStatus.VERIFICATION_REQUIRED, RequestStatus.IN_PROGRESS].includes(r.status)
    );
  }
  
  private generateRequestId(): string {
    return `dsr_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private findRequest(requestId: string): DataSubjectRequest | null {
    for (const userRequests of this.requests.values()) {
      const request = userRequests.find(r => r.id === requestId);
      if (request) return request;
    }
    return null;
  }
  
  private autoProcessRequest(request: DataSubjectRequest): void {
    // Auto-process simple requests
    if (request.type === DataSubjectRequestType.ACCESS) {
      request.status = RequestStatus.IN_PROGRESS;
    }
  }
  
  private collectUserData(userId: string): any {
    // Implementation would collect actual user data
    return {
      profile: {},
      transactions: [],
      preferences: {},
      consentHistory: []
    };
  }
  
  private applyDataCorrections(userId: string, corrections: any): boolean {
    // Implementation would update actual data
    return true;
  }
  
  private canEraseUserData(userId: string): boolean {
    // Check if user data can be erased (no legal obligations)
    return true;
  }
  
  private eraseUserData(userId: string): boolean {
    // Implementation would erase actual user data
    return true;
  }
  
  private exportUserDataForPortability(userId: string): any {
    // Export data in structured format
    return {
      format: 'JSON',
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: this.collectUserData(userId)
    };
  }
}

// Privacy Notice Manager
export class PrivacyNoticeManager {
  private notices = new Map<string, PrivacyNotice[]>();
  
  // Create privacy notice
  createNotice(
    language: 'spanish' | 'creole' | 'english',
    content: PrivacyNoticeContent
  ): PrivacyNotice {
    const languageNotices = this.notices.get(language) || [];
    
    // Deactivate previous versions
    languageNotices.forEach(notice => notice.isActive = false);
    
    const notice: PrivacyNotice = {
      id: this.generateNoticeId(),
      version: this.generateVersion(languageNotices.length),
      language,
      effectiveDate: new Date(),
      content,
      isActive: true
    };
    
    languageNotices.push(notice);
    this.notices.set(language, languageNotices);
    
    return notice;
  }
  
  // Get active privacy notice
  getActiveNotice(language: 'spanish' | 'creole' | 'english'): PrivacyNotice | null {
    const languageNotices = this.notices.get(language) || [];
    return languageNotices.find(notice => notice.isActive) || null;
  }
  
  // Get notice history
  getNoticeHistory(language: 'spanish' | 'creole' | 'english'): PrivacyNotice[] {
    return this.notices.get(language) || [];
  }
  
  private generateNoticeId(): string {
    return `notice_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private generateVersion(count: number): string {
    return `v${count + 1}.0`;
  }
}

// Privacy Breach Manager
export class PrivacyBreachManager {
  private breaches: PrivacyBreach[] = [];
  
  // Report privacy breach
  reportBreach(
    description: string,
    affectedDataTypes: DataCategory[],
    affectedUsers: number,
    severity: BreachSeverity,
    responsiblePerson: string
  ): PrivacyBreach {
    const breach: PrivacyBreach = {
      id: this.generateBreachId(),
      discoveredAt: new Date(),
      description,
      affectedDataTypes,
      affectedUsers,
      severity,
      riskLevel: this.calculateRiskLevel(severity, affectedUsers),
      containmentMeasures: [],
      notificationStatus: {
        authority: false,
        dataSubjects: false
      },
      status: BreachStatus.DISCOVERED,
      responsiblePerson
    };
    
    this.breaches.push(breach);
    
    // Auto-trigger notifications for high-risk breaches
    if (breach.riskLevel === RiskLevel.HIGH || breach.riskLevel === RiskLevel.VERY_HIGH) {
      this.scheduleNotifications(breach);
    }
    
    return breach;
  }
  
  // Update breach status
  updateBreachStatus(breachId: string, status: BreachStatus): boolean {
    const breach = this.breaches.find(b => b.id === breachId);
    if (breach) {
      breach.status = status;
      return true;
    }
    return false;
  }
  
  // Add containment measure
  addContainmentMeasure(breachId: string, measure: string): boolean {
    const breach = this.breaches.find(b => b.id === breachId);
    if (breach) {
      breach.containmentMeasures.push(measure);
      return true;
    }
    return false;
  }
  
  // Mark authority notification sent
  markAuthorityNotified(breachId: string): boolean {
    const breach = this.breaches.find(b => b.id === breachId);
    if (breach) {
      breach.reportedAt = new Date();
      breach.notificationStatus.authority = true;
      breach.notificationStatus.authorityDate = new Date();
      return true;
    }
    return false;
  }
  
  // Mark data subjects notified
  markDataSubjectsNotified(breachId: string): boolean {
    const breach = this.breaches.find(b => b.id === breachId);
    if (breach) {
      breach.notificationStatus.dataSubjects = true;
      breach.notificationStatus.dataSubjectsDate = new Date();
      return true;
    }
    return false;
  }
  
  // Get breaches requiring notification
  getBreachesRequiringNotification(): PrivacyBreach[] {
    return this.breaches.filter(breach => 
      breach.riskLevel === RiskLevel.HIGH || 
      breach.riskLevel === RiskLevel.VERY_HIGH
    );
  }
  
  // Get breach report
  getBreachReport(breachId: string): PrivacyBreach | null {
    return this.breaches.find(b => b.id === breachId) || null;
  }
  
  private generateBreachId(): string {
    return `breach_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private calculateRiskLevel(severity: BreachSeverity, affectedUsers: number): RiskLevel {
    if (severity === BreachSeverity.CRITICAL || affectedUsers > 10000) {
      return RiskLevel.VERY_HIGH;
    } else if (severity === BreachSeverity.HIGH || affectedUsers > 1000) {
      return RiskLevel.HIGH;
    } else if (severity === BreachSeverity.MEDIUM || affectedUsers > 100) {
      return RiskLevel.MODERATE;
    } else if (severity === BreachSeverity.LOW || affectedUsers > 10) {
      return RiskLevel.LOW;
    } else {
      return RiskLevel.MINIMAL;
    }
  }
  
  private scheduleNotifications(breach: PrivacyBreach): void {
    // Schedule notification to authorities within 72 hours
    console.log(`Scheduling authority notification for breach ${breach.id}`);
    
    // Schedule notification to data subjects if high risk
    if (breach.riskLevel === RiskLevel.VERY_HIGH) {
      console.log(`Scheduling data subject notification for breach ${breach.id}`);
    }
  }
}

// Export instances
export const consentManager = new ConsentManager();
export const dataSubjectRightsManager = new DataSubjectRightsManager();
export const privacyNoticeManager = new PrivacyNoticeManager();
export const privacyBreachManager = new PrivacyBreachManager();