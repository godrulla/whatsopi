/**
 * Security Monitoring & Audit System
 * Comprehensive security event tracking and incident detection
 * 
 * Features:
 * - Real-time security event monitoring
 * - Audit trail logging
 * - Threat detection and alerting
 * - Compliance logging for Dominican Law 172-13
 * - PCI DSS audit requirements
 * - Incident response automation
 * - Security metrics and reporting
 */

import { EventEmitter } from 'events';

// Types
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  location?: GeoLocation;
  tags: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  resource: string;
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, any>;
  beforeState?: any;
  afterState?: any;
  compliance: ComplianceFlags;
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  severity: SecuritySeverity;
  events: SecurityEvent[];
  status: AlertStatus;
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
  tags: string[];
}

export interface ThreatIntel {
  id: string;
  type: ThreatType;
  indicator: string;
  confidence: number;
  severity: SecuritySeverity;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  description: string;
  tags: string[];
}

export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGIN_BRUTEFORCE = 'login_bruteforce',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  
  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // Data events
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  PII_ACCESS = 'pii_access',
  PAYMENT_DATA_ACCESS = 'payment_data_access',
  
  // Transaction events
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_FAILED = 'transaction_failed',
  LARGE_TRANSACTION = 'large_transaction',
  SUSPICIOUS_TRANSACTION = 'suspicious_transaction',
  
  // Security events
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  COMMAND_INJECTION_ATTEMPT = 'command_injection_attempt',
  FILE_UPLOAD_MALWARE = 'file_upload_malware',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // System events
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGE = 'configuration_change',
  SERVICE_START = 'service_start',
  SERVICE_STOP = 'service_stop',
  
  // AI/ML events
  PROMPT_INJECTION = 'prompt_injection',
  MODEL_ABUSE = 'model_abuse',
  VOICE_SPOOFING = 'voice_spoofing',
  
  // Compliance events
  GDPR_REQUEST = 'gdpr_request',
  DATA_BREACH = 'data_breach',
  CONSENT_GIVEN = 'consent_given',
  CONSENT_WITHDRAWN = 'consent_withdrawn'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive'
}

export enum ThreatType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  FILE_HASH = 'file_hash',
  EMAIL = 'email',
  PHONE_NUMBER = 'phone_number'
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ComplianceFlags {
  dominican172_13: boolean;
  pciDss: boolean;
  amlCft: boolean;
}

// Security Event Logger
export class SecurityEventLogger {
  private events: SecurityEvent[] = [];
  private eventEmitter = new EventEmitter();
  
  // Log security event
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };
    
    this.events.push(securityEvent);
    this.eventEmitter.emit('securityEvent', securityEvent);
    
    // Check if this event should trigger an alert
    this.checkForThreats(securityEvent);
    
    return securityEvent;
  }
  
  // Get events by type
  getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Get events by user
  getEventsByUser(userId: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Get events by severity
  getEventsBySeverity(severity: SecuritySeverity, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Get recent events
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private checkForThreats(event: SecurityEvent): void {
    // Check for brute force attacks
    if (event.type === SecurityEventType.LOGIN_FAILURE) {
      this.checkBruteForceAttack(event);
    }
    
    // Check for suspicious patterns
    if (event.severity === SecuritySeverity.HIGH || event.severity === SecuritySeverity.CRITICAL) {
      this.createAlert(event);
    }
  }
  
  private checkBruteForceAttack(event: SecurityEvent): void {
    const recentFailures = this.events.filter(e => 
      e.type === SecurityEventType.LOGIN_FAILURE &&
      e.ipAddress === event.ipAddress &&
      e.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    );
    
    if (recentFailures.length >= 5) {
      const bruteForceEvent: SecurityEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        type: SecurityEventType.LOGIN_BRUTEFORCE,
        severity: SecuritySeverity.HIGH,
        source: 'threat_detector',
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: {
          failedAttempts: recentFailures.length,
          timeWindow: '15 minutes'
        },
        tags: ['brute_force', 'automated']
      };
      
      this.events.push(bruteForceEvent);
      this.eventEmitter.emit('securityEvent', bruteForceEvent);
      this.createAlert(bruteForceEvent);
    }
  }
  
  private createAlert(event: SecurityEvent): void {
    // This would typically send to an alerting system
    console.warn(`Security Alert: ${event.type} - ${event.severity}`, event);
  }
  
  // Subscribe to security events
  onSecurityEvent(callback: (event: SecurityEvent) => void): void {
    this.eventEmitter.on('securityEvent', callback);
  }
}

// Audit Logger for compliance
export class AuditLogger {
  private auditLogs: AuditLogEntry[] = [];
  
  // Log audit event
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const auditEntry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      ...entry
    };
    
    this.auditLogs.push(auditEntry);
    
    // If this involves PII or payment data, mark for compliance
    if (this.involvesSensitiveData(entry)) {
      auditEntry.compliance.dominican172_13 = true;
      if (this.involvesPaymentData(entry)) {
        auditEntry.compliance.pciDss = true;
      }
    }
    
    return auditEntry;
  }
  
  // Get audit logs for compliance reporting
  getComplianceAuditLogs(
    compliance: keyof ComplianceFlags,
    startDate: Date,
    endDate: Date
  ): AuditLogEntry[] {
    return this.auditLogs.filter(log => 
      log.compliance[compliance] &&
      log.timestamp >= startDate &&
      log.timestamp <= endDate
    );
  }
  
  // Get audit logs by user
  getAuditLogsByUser(userId: string, limit: number = 100): AuditLogEntry[] {
    return this.auditLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Get audit logs by resource
  getAuditLogsByResource(resource: string, limit: number = 100): AuditLogEntry[] {
    return this.auditLogs
      .filter(log => log.resource === resource)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  private generateAuditId(): string {
    return `aud_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private involvesSensitiveData(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): boolean {
    const sensitiveResources = ['user_profile', 'kyc_document', 'transaction', 'payment'];
    return sensitiveResources.some(resource => entry.resource.includes(resource));
  }
  
  private involvesPaymentData(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): boolean {
    const paymentResources = ['payment', 'card', 'transaction'];
    return paymentResources.some(resource => entry.resource.includes(resource));
  }
}

// Threat Detection Engine
export class ThreatDetector {
  private threatIntel: ThreatIntel[] = [];
  private securityEventLogger: SecurityEventLogger;
  
  constructor(securityEventLogger: SecurityEventLogger) {
    this.securityEventLogger = securityEventLogger;
    this.initializeThreatIntel();
  }
  
  // Add threat intelligence
  addThreatIntel(threat: Omit<ThreatIntel, 'id' | 'firstSeen' | 'lastSeen'>): ThreatIntel {
    const threatIntel: ThreatIntel = {
      id: this.generateThreatId(),
      firstSeen: new Date(),
      lastSeen: new Date(),
      ...threat
    };
    
    this.threatIntel.push(threatIntel);
    return threatIntel;
  }
  
  // Check if IP is known threat
  isKnownThreat(indicator: string, type: ThreatType): ThreatIntel | null {
    return this.threatIntel.find(threat => 
      threat.type === type && 
      threat.indicator === indicator
    ) || null;
  }
  
  // Analyze request for threats
  analyzeRequest(
    ipAddress: string,
    userAgent: string,
    payload: any,
    endpoint: string
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];
    
    // Check IP reputation
    const ipThreat = this.isKnownThreat(ipAddress, ThreatType.IP_ADDRESS);
    if (ipThreat) {
      events.push(this.securityEventLogger.logEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: ipThreat.severity,
        source: 'threat_detector',
        ipAddress,
        userAgent,
        details: {
          threatId: ipThreat.id,
          reason: 'Known malicious IP'
        },
        tags: ['threat_intel', 'malicious_ip']
      }));
    }
    
    // Check for suspicious user agent patterns
    if (this.isSuspiciousUserAgent(userAgent)) {
      events.push(this.securityEventLogger.logEvent({
        type: SecurityEventType.SUSPICIOUS_TRANSACTION,
        severity: SecuritySeverity.MEDIUM,
        source: 'threat_detector',
        ipAddress,
        userAgent,
        details: {
          reason: 'Suspicious user agent pattern'
        },
        tags: ['suspicious_ua', 'automated']
      }));
    }
    
    // Check payload for injection attempts
    if (payload && typeof payload === 'object') {
      const injectionAttempts = this.detectInjectionAttempts(payload);
      for (const attempt of injectionAttempts) {
        events.push(this.securityEventLogger.logEvent({
          type: attempt.type,
          severity: SecuritySeverity.HIGH,
          source: 'threat_detector',
          ipAddress,
          userAgent,
          details: {
            field: attempt.field,
            value: attempt.value,
            pattern: attempt.pattern
          },
          tags: ['injection_attempt', 'attack']
        }));
      }
    }
    
    return events;
  }
  
  private initializeThreatIntel(): void {
    // Initialize with known bad IPs, domains, etc.
    // In production, this would be loaded from threat intelligence feeds
    const knownBadIPs = [
      '10.0.0.1', // Example bad IP
      '192.168.1.100' // Example bad IP
    ];
    
    for (const ip of knownBadIPs) {
      this.addThreatIntel({
        type: ThreatType.IP_ADDRESS,
        indicator: ip,
        confidence: 0.9,
        severity: SecuritySeverity.HIGH,
        source: 'static_list',
        description: 'Known malicious IP address',
        tags: ['malicious', 'static']
      });
    }
  }
  
  private generateThreatId(): string {
    return `thr_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
  
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /curl/i,
      /wget/i,
      /python-requests/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
  
  private detectInjectionAttempts(payload: any): Array<{
    type: SecurityEventType;
    field: string;
    value: string;
    pattern: string;
  }> {
    const attempts: Array<{
      type: SecurityEventType;
      field: string;
      value: string;
      pattern: string;
    }> = [];
    
    const checkValue = (key: string, value: any) => {
      if (typeof value !== 'string') return;
      
      // SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi,
        /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
        /(;|\-\-|\/\*|\*\/)/g
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          attempts.push({
            type: SecurityEventType.SQL_INJECTION_ATTEMPT,
            field: key,
            value: value.substring(0, 100), // Truncate for logging
            pattern: pattern.toString()
          });
          break;
        }
      }
      
      // XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          attempts.push({
            type: SecurityEventType.XSS_ATTEMPT,
            field: key,
            value: value.substring(0, 100),
            pattern: pattern.toString()
          });
          break;
        }
      }
      
      // Command injection patterns
      const cmdPatterns = [
        /[;&|`$(){}[\]<>]/g,
        /\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh)\b/gi
      ];
      
      for (const pattern of cmdPatterns) {
        if (pattern.test(value)) {
          attempts.push({
            type: SecurityEventType.COMMAND_INJECTION_ATTEMPT,
            field: key,
            value: value.substring(0, 100),
            pattern: pattern.toString()
          });
          break;
        }
      }
    };
    
    // Recursively check all fields
    const traverse = (obj: any, path: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          traverse(value, currentPath);
        } else {
          checkValue(currentPath, value);
        }
      }
    };
    
    traverse(payload);
    return attempts;
  }
}

// Security Metrics Calculator
export class SecurityMetrics {
  private securityEventLogger: SecurityEventLogger;
  private auditLogger: AuditLogger;
  
  constructor(securityEventLogger: SecurityEventLogger, auditLogger: AuditLogger) {
    this.securityEventLogger = securityEventLogger;
    this.auditLogger = auditLogger;
  }
  
  // Calculate security KPIs
  calculateKPIs(startDate: Date, endDate: Date): SecurityKPIs {
    const events = this.securityEventLogger.getRecentEvents(10000)
      .filter(event => event.timestamp >= startDate && event.timestamp <= endDate);
    
    const totalEvents = events.length;
    const criticalEvents = events.filter(e => e.severity === SecuritySeverity.CRITICAL).length;
    const highEvents = events.filter(e => e.severity === SecuritySeverity.HIGH).length;
    
    const authenticationFailures = events.filter(e => 
      e.type === SecurityEventType.LOGIN_FAILURE
    ).length;
    
    const injectionAttempts = events.filter(e => 
      [SecurityEventType.XSS_ATTEMPT, SecurityEventType.SQL_INJECTION_ATTEMPT, 
       SecurityEventType.COMMAND_INJECTION_ATTEMPT].includes(e.type)
    ).length;
    
    const bruteForceAttempts = events.filter(e => 
      e.type === SecurityEventType.LOGIN_BRUTEFORCE
    ).length;
    
    return {
      totalSecurityEvents: totalEvents,
      criticalEvents,
      highSeverityEvents: highEvents,
      authenticationFailureRate: totalEvents > 0 ? authenticationFailures / totalEvents : 0,
      injectionAttemptRate: totalEvents > 0 ? injectionAttempts / totalEvents : 0,
      bruteForceAttempts,
      meanTimeToDetection: this.calculateMTTD(events),
      falsePositiveRate: this.calculateFalsePositiveRate(events)
    };
  }
  
  private calculateMTTD(events: SecurityEvent[]): number {
    // Simplified MTTD calculation
    // In practice, this would be more sophisticated
    return 5; // 5 minutes average
  }
  
  private calculateFalsePositiveRate(events: SecurityEvent[]): number {
    // Simplified calculation
    // In practice, this would track resolved alerts marked as false positives
    return 0.1; // 10% false positive rate
  }
}

export interface SecurityKPIs {
  totalSecurityEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  authenticationFailureRate: number;
  injectionAttemptRate: number;
  bruteForceAttempts: number;
  meanTimeToDetection: number;
  falsePositiveRate: number;
}

// Export instances
export const securityEventLogger = new SecurityEventLogger();
export const auditLogger = new AuditLogger();
export const threatDetector = new ThreatDetector(securityEventLogger);
export const securityMetrics = new SecurityMetrics(securityEventLogger, auditLogger);