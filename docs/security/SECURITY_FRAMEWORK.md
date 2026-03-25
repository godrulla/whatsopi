# WhatsOpí Security Framework
*Comprehensive Security Implementation for Dominican Republic's Informal Economy*

## Executive Summary

The WhatsOpí Security Framework provides enterprise-grade security controls specifically designed for serving the Dominican Republic's informal economy. This framework addresses unique challenges including low digital literacy, diverse device ecosystems, multi-language support (Spanish/Creole), and regulatory compliance with Dominican Law 172-13 and international standards.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security Components](#security-components)
3. [Implementation Guide](#implementation-guide)
4. [Compliance Framework](#compliance-framework)
5. [Operations & Monitoring](#operations--monitoring)
6. [Incident Response](#incident-response)
7. [Training & Awareness](#training--awareness)

## Architecture Overview

### Defense-in-Depth Strategy

The WhatsOpí security architecture implements multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Protection                          │
│  • CloudFront CDN with AWS WAF                            │
│  • DDoS Protection (AWS Shield Advanced)                  │
│  • Rate Limiting & IP Reputation                          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 Application Security                        │
│  • JWT Authentication with RS256                          │
│  • Role-Based Access Control (RBAC)                       │
│  • Input Validation & Sanitization                        │
│  • API Security with OpenAPI Validation                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Data Protection                          │
│  • AES-256-GCM Encryption at Rest                        │
│  • TLS 1.3 for Data in Transit                           │
│  • Field-Level Encryption for PII                        │
│  • Payment Data Tokenization                             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│              Monitoring & Response                          │
│  • Real-time Security Event Monitoring                    │
│  • Automated Threat Detection                             │
│  • Incident Response Automation                           │
│  • Compliance Audit Trails                               │
└─────────────────────────────────────────────────────────────┘
```

### Security Zones

The platform is segmented into security zones with appropriate controls:

#### DMZ Zone (Internet-Facing)
- **Components**: CloudFront CDN, AWS WAF, Load Balancers
- **Trust Level**: Untrusted
- **Controls**: DDoS protection, IP filtering, rate limiting

#### Application Zone
- **Components**: API Gateway, Microservices, Application Servers
- **Trust Level**: Semi-trusted
- **Controls**: Authentication, authorization, input validation

#### Data Zone
- **Components**: RDS Databases, Redis Cache, Message Queues
- **Trust Level**: Trusted
- **Controls**: Encryption, access controls, audit logging

#### Management Zone
- **Components**: Monitoring, Logging, Admin Tools
- **Trust Level**: Highly trusted
- **Controls**: VPN access, multi-factor authentication, privileged access management

## Security Components

### 1. Authentication & Authorization (`/src/lib/security/auth/`)

#### Multi-Factor Authentication
- **Primary**: WhatsApp OTP (optimized for local usage patterns)
- **Secondary**: SMS OTP (fallback for feature phones)
- **Enhanced**: Biometric authentication for high-value transactions
- **Device**: Device fingerprinting for fraud prevention

#### Role-Based Access Control
```typescript
enum UserRole {
  CUSTOMER = 'customer',           // Basic financial services
  MERCHANT = 'merchant',           // Business operations
  COLMADO_AGENT = 'colmado_agent', // Cash-in/out services
  ADMIN = 'admin',                 // System administration
  SUPER_ADMIN = 'super_admin'      // Full system access
}
```

#### Transaction Limits by KYC Level
| KYC Level | Daily Limit | Monthly Limit | Features |
|-----------|-------------|---------------|----------|
| Unverified | $50 | $200 | Basic payments |
| Phone Verified | $500 | $2,000 | P2P transfers |
| Document Verified | $5,000 | $20,000 | Business features |
| Enhanced Verified | $50,000 | $200,000 | Full access |

### 2. Data Encryption (`/src/lib/security/encryption/`)

#### Encryption at Rest
- **Algorithm**: AES-256-GCM
- **Key Management**: AWS KMS with automatic rotation
- **Field-Level**: PII, payment data, KYC documents
- **Database**: Full database encryption with AWS RDS

#### Encryption in Transit
- **External APIs**: TLS 1.3 with certificate pinning
- **Internal Services**: mTLS with mutual authentication
- **WhatsApp Integration**: End-to-end encryption for sensitive data

#### Payment Data Tokenization
- **PCI DSS Compliant**: Format-preserving tokenization
- **Scope Reduction**: Minimizes PCI DSS compliance scope
- **Secure Vault**: Isolated token vault with HSM protection

### 3. API Security (`/src/lib/security/api/`)

#### Rate Limiting Strategy
```typescript
const rateLimitConfigs = {
  basic: { windowMs: 15 * 60 * 1000, maxRequests: 100 },      // Phone-verified users
  verified: { windowMs: 15 * 60 * 1000, maxRequests: 500 },   // KYC-verified users
  merchant: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },  // Business users
  agent: { windowMs: 15 * 60 * 1000, maxRequests: 2000 },     // Colmado agents
  whatsapp: { windowMs: 1 * 60 * 1000, maxRequests: 1000 },   // WhatsApp webhook
  public: { windowMs: 15 * 60 * 1000, maxRequests: 50 }       // Public endpoints
};
```

#### Input Validation
- **Dominican-Specific**: Phone number, Cédula, RNC validation
- **Multi-Language**: Spanish and Creole text validation
- **Financial**: Amount validation with currency support
- **File Upload**: Type validation, malware scanning, metadata stripping

### 4. Privacy Controls (`/src/lib/security/privacy/`)

#### Dominican Law 172-13 Compliance
- **Consent Management**: Granular consent with withdrawal mechanisms
- **Data Subject Rights**: Access, rectification, erasure, portability
- **Privacy by Design**: Data minimization and purpose limitation
- **Breach Notification**: 72-hour authority notification process

#### Multi-Language Privacy Notices
- **Spanish (Dominican)**: Primary language with local terminology
- **Haitian Creole**: Accessible to Haitian immigrant population
- **English**: International users and business communications

### 5. PCI DSS Compliance (`/src/lib/security/compliance/`)

#### Level 1 Merchant Requirements
- **Cardholder Data Environment**: Segmented network architecture
- **Data Protection**: Encryption of stored cardholder data
- **Access Controls**: Strong authentication and authorization
- **Network Security**: Firewall configuration and monitoring
- **Vulnerability Management**: Regular scanning and patching
- **Monitoring**: Comprehensive logging and real-time monitoring

#### Compliance Automation
```typescript
// Automated compliance assessment
const complianceStatus = pciComplianceManager.getComplianceStatus();
// Returns: { compliant: 95%, nonCompliant: 5%, nextAssessment: Date }
```

### 6. AI/ML Security (`/src/lib/security/ai/`)

#### Prompt Injection Protection
- **Detection**: Real-time scanning for injection patterns
- **Mitigation**: Input sanitization and request blocking
- **Monitoring**: Suspicious pattern tracking and alerting

#### Model Abuse Prevention
- **Behavioral Analysis**: User behavior profiling
- **Rate Limiting**: AI-specific request throttling
- **Content Filtering**: Malicious content detection

### 7. Voice Interface Security (`/src/lib/security/voice/`)

#### Voice Biometric Authentication
- **Enrollment**: Multi-sample voiceprint creation
- **Verification**: Real-time speaker verification
- **Anti-Spoofing**: Deepfake and replay attack detection
- **Privacy**: Voice data encryption and secure processing

#### Multi-Language Support
- **Spanish (Dominican)**: Accent-aware recognition
- **Haitian Creole**: Specialized linguistic features
- **Mixed Language**: Code-switching detection

### 8. Monitoring & Threat Detection (`/src/lib/security/monitoring/`)

#### Real-Time Monitoring
- **Security Events**: Authentication, authorization, data access
- **Threat Detection**: Automated pattern recognition
- **Incident Creation**: Automatic incident generation
- **Alert Routing**: Multi-channel notification system

#### Audit Logging
- **Compliance Logging**: Dominican Law 172-13 and PCI DSS requirements
- **Tamper Protection**: Cryptographic log integrity
- **Long-Term Retention**: 7-year retention for financial records

## Implementation Guide

### Quick Start

1. **Initialize Security Context**
```typescript
import { securityContext } from '@/lib/security';

// Configure for Dominican Republic deployment
securityContext.updateConfig({
  dominicanCompliance: {
    law172_13: true,
    dataProtectionOfficer: 'dpo@whatsopi.com',
    privacyNoticeLanguages: ['spanish', 'creole']
  }
});
```

2. **Implement Authentication**
```typescript
import { otpManager, generateTokens } from '@/lib/security/auth';

// Send WhatsApp OTP
const otp = otpManager.generateOTP(phoneNumber);
await whatsappService.sendOTP(phoneNumber, otp);

// Verify and authenticate
if (otpManager.verifyOTP(phoneNumber, userOTP)) {
  const tokens = generateTokens(user, deviceFingerprint);
  return tokens;
}
```

3. **Encrypt Sensitive Data**
```typescript
import { fieldEncryptor, FieldType } from '@/lib/security/encryption';

// Encrypt PII for database storage
const encryptedData = fieldEncryptor.encryptField(userData, FieldType.PII);
await database.save(encryptedData);

// Decrypt for authorized access
const decryptedData = fieldEncryptor.decryptField(encryptedData);
```

4. **Validate Input**
```typescript
import { InputValidator, validationRuleSets } from '@/lib/security/validation';

// Validate Dominican user input
const result = InputValidator.validate(userInput, validationRuleSets.dominicanUser);
if (!result.isValid) {
  throw new ValidationError(result.errors);
}
```

### Integration Patterns

#### Express.js Middleware
```typescript
import { rateLimiter, requestValidator } from '@/lib/security/api';

app.use('/api', (req, res, next) => {
  // Rate limiting
  const allowed = rateLimiter.isAllowed(req.ip, rateLimitConfigs.public);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  // Request validation
  const validation = requestValidator.validate(req.method, req.path, req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }
  
  next();
});
```

#### Database Integration
```typescript
import { fieldEncryptor, auditLogger } from '@/lib/security';

// Encrypt before save
const encryptData = (data) => {
  return {
    ...data,
    personalInfo: fieldEncryptor.encryptField(data.personalInfo, FieldType.PII),
    paymentData: fieldEncryptor.encryptField(data.paymentData, FieldType.PAYMENT_DATA)
  };
};

// Audit data access
const logDataAccess = (userId, resource, action) => {
  auditLogger.logAudit({
    action,
    resource,
    userId,
    userRole: 'customer',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    success: true,
    details: { timestamp: new Date() },
    compliance: {
      dominican172_13: true,
      pciDss: resource.includes('payment'),
      amlCft: false
    }
  });
};
```

## Compliance Framework

### Dominican Law 172-13 Implementation

#### Data Processing Principles
1. **Lawfulness**: Explicit consent or legitimate interest
2. **Purpose Limitation**: Data used only for stated purposes
3. **Data Minimization**: Collect only necessary data
4. **Accuracy**: Keep data accurate and up to date
5. **Storage Limitation**: Retain data only as long as necessary
6. **Security**: Implement appropriate security measures

#### Data Subject Rights Implementation
```typescript
import { dataSubjectRightsManager } from '@/lib/security/privacy';

// Handle data access request
const accessRequest = dataSubjectRightsManager.submitRequest(
  userId,
  DataSubjectRequestType.ACCESS,
  { requestReason: 'User requested data export' },
  VerificationMethod.OTP_WHATSAPP,
  'spanish'
);

// Process request (30-day compliance requirement)
const userData = dataSubjectRightsManager.processAccessRequest(accessRequest.id);
```

#### Breach Notification Process
```typescript
import { privacyBreachManager } from '@/lib/security/privacy';

// Report breach (immediate)
const breach = privacyBreachManager.reportBreach(
  'Unauthorized access to customer database',
  [DataCategory.PERSONAL_IDENTIFIERS, DataCategory.CONTACT_INFORMATION],
  150, // affected users
  BreachSeverity.HIGH,
  'security_team_lead'
);

// Automatic 72-hour notification scheduling
// Automatic data subject notification for high-risk breaches
```

### PCI DSS Level 1 Compliance

#### Cardholder Data Environment
```typescript
import { cdeManager } from '@/lib/security/compliance';

// Define CDE scope
const cdeEnvironment = cdeManager.defineCDEScope(
  'Production CDE',
  'Payment processing environment',
  [
    {
      id: 'payment-gateway',
      name: 'Payment Gateway Server',
      type: ComponentType.APPLICATION_SERVER,
      ipAddress: '10.0.1.10',
      purpose: 'Process payment transactions',
      cardholderDataProcessed: true,
      cardholderDataStored: false,
      cardholderDataTransmitted: true
    }
  ]
);

// Validate network segmentation
const segmentationResult = cdeManager.validateNetworkSegmentation(cdeEnvironment.id);
```

#### Vulnerability Management
```typescript
import { vulnerabilityScanner } from '@/lib/security/compliance';

// Quarterly vulnerability assessment
const assessment = vulnerabilityScanner.performAssessment(
  ['web_application', 'database_server', 'payment_gateway'],
  'OWASP_ASVS_4.0'
);

// Handle critical vulnerabilities
const criticalVulns = vulnerabilityScanner.getCriticalVulnerabilities();
// Automatic escalation for critical vulnerabilities
```

## Operations & Monitoring

### Security Operations Center (SOC)

#### 24/7 Monitoring Dashboard
```typescript
import { securityMetrics, securityEventLogger } from '@/lib/security/monitoring';

// Real-time security KPIs
const kpis = securityMetrics.calculateKPIs(
  new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  new Date()
);

console.log(`
Security Dashboard - Last 24 Hours
==================================
Total Events: ${kpis.totalSecurityEvents}
Critical Events: ${kpis.criticalEvents}
Authentication Failures: ${(kpis.authenticationFailureRate * 100).toFixed(1)}%
Injection Attempts: ${kpis.injectionAttemptRate}
Mean Time to Detection: ${kpis.meanTimeToDetection} minutes
`);
```

#### Automated Alert Routing
- **Critical Events**: Phone + SMS to on-call engineer
- **High Severity**: Slack + Email to security team
- **Medium Severity**: Email to security team
- **Low Severity**: Dashboard notification

### Threat Intelligence Integration

```typescript
import { threatDetector } from '@/lib/security/monitoring';

// Add threat intelligence
threatDetector.addThreatIntel({
  type: ThreatType.IP_ADDRESS,
  indicator: '192.168.1.100',
  confidence: 0.95,
  severity: SecuritySeverity.HIGH,
  source: 'commercial_threat_feed',
  description: 'Known botnet command and control server',
  tags: ['botnet', 'c2_server']
});

// Automatic correlation with active incidents
```

## Incident Response

### Automated Response Playbooks

The system includes automated response capabilities for common threats:

```typescript
import { incidentResponseManager } from '@/lib/security/threats';

// Automatic incident creation and response
const incident = incidentResponseManager.createIncident(
  'Suspicious Login Activity Detected',
  'Multiple failed login attempts from unknown IP address',
  IncidentSeverity.MEDIUM,
  IncidentCategory.UNAUTHORIZED_ACCESS,
  DetectionSource.AUTOMATED_SYSTEM,
  [
    {
      id: 'ip_001',
      type: IndicatorType.IP_ADDRESS,
      value: '192.168.1.100',
      confidence: 0.8,
      source: 'login_monitor',
      firstSeen: new Date(),
      lastSeen: new Date(),
      severity: ThreatSeverity.MEDIUM,
      tlpLevel: TLPLevel.WHITE,
      context: { login_attempts: 15, time_window: '5 minutes' }
    }
  ]
);

// Automated containment actions:
// 1. Block malicious IP address
// 2. Disable compromised accounts
// 3. Collect forensic evidence
// 4. Alert security analyst
```

### Incident Severity Matrix

| Impact | Low | Medium | High | Critical |
|---------|-----|--------|------|----------|
| **Low** | P4 | P3 | P2 | P1 |
| **Medium** | P3 | P2 | P1 | P0 |
| **High** | P2 | P1 | P0 | P0 |
| **Critical** | P1 | P0 | P0 | P0 |

**Response Times:**
- **P0 (Critical)**: 15 minutes
- **P1 (High)**: 1 hour
- **P2 (Medium)**: 4 hours
- **P3 (Low)**: 24 hours
- **P4 (Informational)**: 72 hours

## Training & Awareness

### Security Training Program

#### Developer Security Training
- **Secure Coding**: OWASP Top 10, input validation, authentication
- **Dominican Compliance**: Law 172-13 requirements and implementation
- **PCI DSS**: Payment security best practices
- **Incident Response**: Security incident handling procedures

#### End-User Security Awareness
- **Spanish Language**: "Seguridad en WhatsOpí" training materials
- **Creole Language**: "Sekirite nan WhatsOpí" training materials
- **Topics**: Password security, phishing awareness, safe mobile practices
- **Format**: WhatsApp-based micro-learning modules

### Security Metrics & KPIs

```typescript
// Security effectiveness metrics
const metrics = {
  preventive: {
    vulnerabilityScanCoverage: '>95%',
    securityTrainingCompletion: '>90%',
    patchDeploymentTime: '<72 hours',
    securityPolicyCompliance: '>98%'
  },
  detective: {
    meanTimeToDetection: '<5 minutes',
    falsePositiveRate: '<10%',
    securityEventCoverage: '>99%',
    incidentEscalationTime: '<15 minutes'
  },
  responsive: {
    meanTimeToResponse: '<30 minutes',
    incidentResolutionTime: '<4 hours',
    recoveryTimeObjective: '<1 hour',
    communicationEffectiveness: '>95%'
  }
};
```

## Security Architecture Decisions

### Key Design Principles

1. **Security by Design**: Security considerations integrated from the beginning
2. **Zero Trust**: Never trust, always verify
3. **Defense in Depth**: Multiple layers of security controls
4. **Privacy by Design**: Data protection built into the system architecture
5. **Cultural Sensitivity**: Security controls adapted for local context
6. **Regulatory Compliance**: Dominican Law 172-13 and international standards
7. **Usability**: Security that doesn't impede user experience

### Technology Stack Security

#### Frontend Security
- **Content Security Policy**: Strict CSP with nonce-based script execution
- **HTTPS Enforcement**: HTTP Strict Transport Security (HSTS)
- **XSS Protection**: Input sanitization and output encoding
- **Dependency Scanning**: Regular security updates for npm packages

#### Backend Security
- **API Security**: OAuth 2.0 with JWT tokens and scope-based access
- **Database Security**: Encrypted at rest with field-level encryption
- **Infrastructure**: AWS security best practices with VPC isolation
- **Secrets Management**: AWS Secrets Manager with automatic rotation

#### Mobile Security
- **Certificate Pinning**: Prevent man-in-the-middle attacks
- **Root/Jailbreak Detection**: Additional security for compromised devices
- **App Signing**: Code signing with certificate validation
- **Secure Storage**: Encrypted local storage for sensitive data

## Conclusion

The WhatsOpí Security Framework provides comprehensive protection for a financial services platform serving the Dominican Republic's informal economy. By addressing unique cultural, linguistic, and regulatory requirements while maintaining international security standards, this framework enables secure digital financial inclusion for underserved populations.

The framework's modular design allows for incremental implementation and continuous improvement based on threat landscape evolution and regulatory changes. Regular security assessments, penetration testing, and compliance audits ensure the framework remains effective and compliant.

For implementation support or security questions, contact the WhatsOpí Security Team at security@whatsopi.com.

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Classification: Internal Use*  
*Next Review: Q2 2024*