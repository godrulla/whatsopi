/**
 * Threat Monitoring & Incident Response System
 * Advanced threat detection and automated incident response for WhatsOpí
 * 
 * Features:
 * - Real-time threat monitoring
 * - Automated incident response
 * - Threat intelligence integration
 * - Security orchestration
 * - Breach detection and containment
 * - Forensic data collection
 * - Communication and escalation
 * - Recovery and post-incident analysis
 */

import { EventEmitter } from 'events';

// Types
export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  createdAt: Date;
  updatedAt: Date;
  detectedBy: DetectionSource;
  affectedAssets: AffectedAsset[];
  indicators: ThreatIndicator[];
  timeline: IncidentEvent[];
  assignedTo?: string;
  estimatedImpact: ImpactAssessment;
  containmentActions: ContainmentAction[];
  communicationLog: CommunicationEntry[];
  postIncidentReport?: PostIncidentReport;
}

export interface AffectedAsset {
  id: string;
  type: AssetType;
  name: string;
  criticality: AssetCriticality;
  impactLevel: ImpactLevel;
  compromiseStatus: CompromiseStatus;
  lastKnownGoodState?: Date;
}

export interface ThreatIndicator {
  id: string;
  type: IndicatorType;
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  severity: ThreatSeverity;
  tlpLevel: TLPLevel;
  context: Record<string, any>;
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  description: string;
  actor: string;
  automated: boolean;
  details: Record<string, any>;
}

export interface ContainmentAction {
  id: string;
  type: ContainmentType;
  description: string;
  status: ActionStatus;
  implementedAt?: Date;
  implementedBy: string;
  effectiveness: EffectivenessRating;
  details: Record<string, any>;
}

export interface CommunicationEntry {
  id: string;
  timestamp: Date;
  type: CommunicationType;
  recipient: string;
  sender: string;
  message: string;
  channel: CommunicationChannel;
  delivered: boolean;
  acknowledged: boolean;
}

export interface PostIncidentReport {
  id: string;
  incidentId: string;
  rootCause: string;
  contributingFactors: string[];
  timelineAccuracy: number;
  containmentEffectiveness: number;
  communicationEffectiveness: number;
  lessonsLearned: string[];
  improvements: ImprovementRecommendation[];
  createdBy: string;
  createdAt: Date;
}

export interface ImprovementRecommendation {
  id: string;
  category: ImprovementCategory;
  description: string;
  priority: Priority;
  estimatedCost: number;
  estimatedTimeframe: string;
  responsible: string;
  status: RecommendationStatus;
}

export interface ImpactAssessment {
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  financialImpact: number;
  reputationalImpact: ImpactLevel;
  legalImpact: ImpactLevel;
  operationalImpact: ImpactLevel;
  customerImpact: number; // Number of affected customers
  downtime: number; // Minutes of downtime
}

export interface ThreatIntelligence {
  id: string;
  source: IntelligenceSource;
  indicator: string;
  indicatorType: IndicatorType;
  confidence: number;
  severity: ThreatSeverity;
  ttps: string[]; // Tactics, Techniques, Procedures
  threatActor?: string;
  campaign?: string;
  firstSeen: Date;
  lastUpdated: Date;
  description: string;
  mitigations: string[];
  references: string[];
}

export interface AutomatedResponse {
  id: string;
  triggerId: string;
  ruleId: string;
  action: ResponseAction;
  status: ResponseStatus;
  startedAt: Date;
  completedAt?: Date;
  result: ResponseResult;
  logs: string[];
}

// Enums
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  ERADICATED = 'eradicated',
  RECOVERING = 'recovering',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum IncidentCategory {
  MALWARE = 'malware',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  DENIAL_OF_SERVICE = 'denial_of_service',
  PHISHING = 'phishing',
  INSIDER_THREAT = 'insider_threat',
  SYSTEM_COMPROMISE = 'system_compromise',
  POLICY_VIOLATION = 'policy_violation',
  FRAUD = 'fraud',
  PHYSICAL_SECURITY = 'physical_security'
}

export enum DetectionSource {
  AUTOMATED_SYSTEM = 'automated_system',
  SECURITY_ANALYST = 'security_analyst',
  USER_REPORT = 'user_report',
  THIRD_PARTY = 'third_party',
  THREAT_INTELLIGENCE = 'threat_intelligence',
  VULNERABILITY_SCANNER = 'vulnerability_scanner'
}

export enum AssetType {
  SERVER = 'server',
  DATABASE = 'database',
  APPLICATION = 'application',
  NETWORK_DEVICE = 'network_device',
  ENDPOINT = 'endpoint',
  CLOUD_SERVICE = 'cloud_service',
  USER_ACCOUNT = 'user_account',
  DATA_STORE = 'data_store'
}

export enum AssetCriticality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ImpactLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CompromiseStatus {
  UNKNOWN = 'unknown',
  NOT_COMPROMISED = 'not_compromised',
  SUSPECTED = 'suspected',
  CONFIRMED = 'confirmed',
  CONTAINED = 'contained',
  REMEDIATED = 'remediated'
}

export enum IndicatorType {
  IP_ADDRESS = 'ip_address',
  DOMAIN = 'domain',
  URL = 'url',
  FILE_HASH = 'file_hash',
  EMAIL = 'email',
  USER_AGENT = 'user_agent',
  CERTIFICATE = 'certificate',
  PHONE_NUMBER = 'phone_number'
}

export enum ThreatSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TLPLevel {
  WHITE = 'white',
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red'
}

export enum EventType {
  DETECTION = 'detection',
  ANALYSIS = 'analysis',
  CONTAINMENT = 'containment',
  ERADICATION = 'eradication',
  RECOVERY = 'recovery',
  COMMUNICATION = 'communication',
  ESCALATION = 'escalation'
}

export enum ContainmentType {
  NETWORK_ISOLATION = 'network_isolation',
  ACCOUNT_DISABLE = 'account_disable',
  SERVICE_SHUTDOWN = 'service_shutdown',
  TRAFFIC_BLOCKING = 'traffic_blocking',
  SYSTEM_QUARANTINE = 'system_quarantine',
  DATA_ISOLATION = 'data_isolation',
  PRIVILEGE_REVOCATION = 'privilege_revocation'
}

export enum ActionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum EffectivenessRating {
  INEFFECTIVE = 'ineffective',
  PARTIALLY_EFFECTIVE = 'partially_effective',
  EFFECTIVE = 'effective',
  HIGHLY_EFFECTIVE = 'highly_effective'
}

export enum CommunicationType {
  NOTIFICATION = 'notification',
  UPDATE = 'update',
  ESCALATION = 'escalation',
  RESOLUTION = 'resolution',
  WARNING = 'warning'
}

export enum CommunicationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  SLACK = 'slack',
  PHONE = 'phone',
  DASHBOARD = 'dashboard'
}

export enum ImprovementCategory {
  PEOPLE = 'people',
  PROCESS = 'process',
  TECHNOLOGY = 'technology',
  COMMUNICATION = 'communication',
  TRAINING = 'training'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecommendationStatus {
  PROPOSED = 'proposed',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  REJECTED = 'rejected'
}

export enum IntelligenceSource {
  COMMERCIAL_FEED = 'commercial_feed',
  OPEN_SOURCE = 'open_source',
  GOVERNMENT = 'government',
  INDUSTRY_SHARING = 'industry_sharing',
  INTERNAL_ANALYSIS = 'internal_analysis'
}

export enum ResponseAction {
  BLOCK_IP = 'block_ip',
  DISABLE_ACCOUNT = 'disable_account',
  ISOLATE_SYSTEM = 'isolate_system',
  QUARANTINE_FILE = 'quarantine_file',
  ALERT_ANALYST = 'alert_analyst',
  COLLECT_EVIDENCE = 'collect_evidence',
  NOTIFY_STAKEHOLDER = 'notify_stakeholder'
}

export enum ResponseStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ResponseResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILURE = 'failure',
  ERROR = 'error'
}

// Incident Response Manager
export class IncidentResponseManager extends EventEmitter {
  private incidents = new Map<string, SecurityIncident>();
  private threatIntelligence = new Map<string, ThreatIntelligence>();
  private automatedResponses = new Map<string, AutomatedResponse>();
  private responseRules: ResponseRule[] = [];
  
  constructor() {
    super();
    this.initializeResponseRules();
  }
  
  // Create new security incident
  createIncident(
    title: string,
    description: string,
    severity: IncidentSeverity,
    category: IncidentCategory,
    detectedBy: DetectionSource,
    indicators: ThreatIndicator[] = []
  ): SecurityIncident {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      title,
      description,
      severity,
      status: IncidentStatus.NEW,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
      detectedBy,
      affectedAssets: [],
      indicators,
      timeline: [{
        id: this.generateEventId(),
        timestamp: new Date(),
        type: EventType.DETECTION,
        description: 'Incident detected and created',
        actor: 'system',
        automated: true,
        details: { severity, category }
      }],
      estimatedImpact: this.calculateInitialImpact(severity, category),
      containmentActions: [],
      communicationLog: []
    };
    
    this.incidents.set(incident.id, incident);
    
    // Trigger automated response if applicable
    this.processAutomatedResponse(incident);
    
    // Send notifications
    this.sendIncidentNotifications(incident);
    
    this.emit('incidentCreated', incident);
    return incident;
  }
  
  // Update incident status
  updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    updatedBy: string,
    notes?: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    const previousStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date();
    
    // Add timeline event
    this.addTimelineEvent(incident, {
      type: EventType.ANALYSIS,
      description: `Status changed from ${previousStatus} to ${status}`,
      actor: updatedBy,
      automated: false,
      details: { previousStatus, newStatus: status, notes }
    });
    
    // Handle status-specific actions
    this.handleStatusChange(incident, previousStatus, status);
    
    this.emit('incidentUpdated', incident);
    return true;
  }
  
  // Add affected asset to incident
  addAffectedAsset(
    incidentId: string,
    asset: AffectedAsset
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    incident.affectedAssets.push(asset);
    incident.updatedAt = new Date();
    
    this.addTimelineEvent(incident, {
      type: EventType.ANALYSIS,
      description: `Asset ${asset.name} added to incident`,
      actor: 'analyst',
      automated: false,
      details: { assetId: asset.id, assetType: asset.type }
    });
    
    // Recalculate impact
    incident.estimatedImpact = this.recalculateImpact(incident);
    
    return true;
  }
  
  // Implement containment action
  implementContainmentAction(
    incidentId: string,
    action: ContainmentAction
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    action.implementedAt = new Date();
    action.status = ActionStatus.IN_PROGRESS;
    
    incident.containmentActions.push(action);
    incident.updatedAt = new Date();
    
    this.addTimelineEvent(incident, {
      type: EventType.CONTAINMENT,
      description: `Containment action implemented: ${action.description}`,
      actor: action.implementedBy,
      automated: false,
      details: { actionId: action.id, actionType: action.type }
    });
    
    // Execute the containment action
    this.executeContainmentAction(incident, action);
    
    return true;
  }
  
  // Add threat intelligence
  addThreatIntelligence(intel: ThreatIntelligence): void {
    this.threatIntelligence.set(intel.id, intel);
    
    // Check if this intelligence relates to any active incidents
    this.correlateWithIncidents(intel);
  }
  
  // Get incidents by status
  getIncidentsByStatus(status: IncidentStatus): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status === status);
  }
  
  // Get incidents by severity
  getIncidentsBySeverity(severity: IncidentSeverity): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.severity === severity);
  }
  
  // Get active incidents
  getActiveIncidents(): SecurityIncident[] {
    const activeStatuses = [
      IncidentStatus.NEW,
      IncidentStatus.ACKNOWLEDGED,
      IncidentStatus.INVESTIGATING,
      IncidentStatus.CONTAINED,
      IncidentStatus.ERADICATED,
      IncidentStatus.RECOVERING
    ];
    
    return Array.from(this.incidents.values())
      .filter(incident => activeStatuses.includes(incident.status));
  }
  
  // Process automated response
  private processAutomatedResponse(incident: SecurityIncident): void {
    for (const rule of this.responseRules) {
      if (this.ruleMatches(rule, incident)) {
        const response = this.executeAutomatedResponse(rule, incident);
        if (response) {
          this.automatedResponses.set(response.id, response);
        }
      }
    }
  }
  
  private executeAutomatedResponse(
    rule: ResponseRule,
    incident: SecurityIncident
  ): AutomatedResponse | null {
    const response: AutomatedResponse = {
      id: this.generateResponseId(),
      triggerId: incident.id,
      ruleId: rule.id,
      action: rule.action,
      status: ResponseStatus.PENDING,
      startedAt: new Date(),
      result: ResponseResult.SUCCESS,
      logs: []
    };
    
    try {
      response.status = ResponseStatus.EXECUTING;
      response.logs.push(`Starting automated response: ${rule.action}`);
      
      // Execute the action based on type
      switch (rule.action) {
        case ResponseAction.BLOCK_IP:
          this.blockIP(incident, response);
          break;
        case ResponseAction.DISABLE_ACCOUNT:
          this.disableAccount(incident, response);
          break;
        case ResponseAction.ISOLATE_SYSTEM:
          this.isolateSystem(incident, response);
          break;
        case ResponseAction.ALERT_ANALYST:
          this.alertAnalyst(incident, response);
          break;
        case ResponseAction.COLLECT_EVIDENCE:
          this.collectEvidence(incident, response);
          break;
        default:
          response.logs.push(`Unknown action type: ${rule.action}`);
          response.result = ResponseResult.ERROR;
      }
      
      response.status = ResponseStatus.COMPLETED;
      response.completedAt = new Date();
      
      this.addTimelineEvent(incident, {
        type: EventType.CONTAINMENT,
        description: `Automated response executed: ${rule.action}`,
        actor: 'system',
        automated: true,
        details: { responseId: response.id, result: response.result }
      });
      
    } catch (error) {
      response.status = ResponseStatus.FAILED;
      response.result = ResponseResult.FAILURE;
      response.logs.push(`Error executing response: ${error}`);
    }
    
    return response;
  }
  
  private blockIP(incident: SecurityIncident, response: AutomatedResponse): void {
    // Find IP indicators in the incident
    const ipIndicators = incident.indicators.filter(i => i.type === IndicatorType.IP_ADDRESS);
    
    for (const indicator of ipIndicators) {
      // Simulate IP blocking
      response.logs.push(`Blocking IP address: ${indicator.value}`);
      
      // In a real implementation, this would integrate with firewalls/WAF
      this.simulateFirewallBlock(indicator.value);
    }
  }
  
  private disableAccount(incident: SecurityIncident, response: AutomatedResponse): void {
    for (const asset of incident.affectedAssets) {
      if (asset.type === AssetType.USER_ACCOUNT) {
        response.logs.push(`Disabling user account: ${asset.name}`);
        
        // In a real implementation, this would integrate with identity management
        this.simulateAccountDisable(asset.name);
      }
    }
  }
  
  private isolateSystem(incident: SecurityIncident, response: AutomatedResponse): void {
    for (const asset of incident.affectedAssets) {
      if ([AssetType.SERVER, AssetType.ENDPOINT].includes(asset.type)) {
        response.logs.push(`Isolating system: ${asset.name}`);
        
        // In a real implementation, this would isolate the system from the network
        this.simulateSystemIsolation(asset.name);
      }
    }
  }
  
  private alertAnalyst(incident: SecurityIncident, response: AutomatedResponse): void {
    response.logs.push('Sending alert to security analyst');
    
    this.sendCommunication(incident, {
      type: CommunicationType.ESCALATION,
      recipient: 'security_analyst_on_duty',
      sender: 'automated_system',
      message: `High priority incident requires immediate attention: ${incident.title}`,
      channel: CommunicationChannel.EMAIL,
      delivered: true,
      acknowledged: false
    });
  }
  
  private collectEvidence(incident: SecurityIncident, response: AutomatedResponse): void {
    response.logs.push('Starting evidence collection');
    
    for (const asset of incident.affectedAssets) {
      // Simulate evidence collection
      this.simulateEvidenceCollection(asset, response);
    }
  }
  
  private simulateFirewallBlock(ipAddress: string): void {
    console.log(`[FIREWALL] Blocking IP address: ${ipAddress}`);
  }
  
  private simulateAccountDisable(accountName: string): void {
    console.log(`[IDENTITY] Disabling account: ${accountName}`);
  }
  
  private simulateSystemIsolation(systemName: string): void {
    console.log(`[NETWORK] Isolating system: ${systemName}`);
  }
  
  private simulateEvidenceCollection(asset: AffectedAsset, response: AutomatedResponse): void {
    response.logs.push(`Collecting evidence from ${asset.type}: ${asset.name}`);
    
    // Simulate collection of various evidence types
    const evidenceTypes = ['memory_dump', 'disk_image', 'network_logs', 'system_logs'];
    
    for (const evidenceType of evidenceTypes) {
      response.logs.push(`Collecting ${evidenceType} from ${asset.name}`);
    }
  }
  
  private ruleMatches(rule: ResponseRule, incident: SecurityIncident): boolean {
    // Check if rule conditions match the incident
    if (rule.conditions.severity && !rule.conditions.severity.includes(incident.severity)) {
      return false;
    }
    
    if (rule.conditions.category && !rule.conditions.category.includes(incident.category)) {
      return false;
    }
    
    if (rule.conditions.indicatorTypes) {
      const incidentIndicatorTypes = incident.indicators.map(i => i.type);
      const hasRequiredIndicator = rule.conditions.indicatorTypes.some(type => 
        incidentIndicatorTypes.includes(type)
      );
      if (!hasRequiredIndicator) {
        return false;
      }
    }
    
    return true;
  }
  
  private initializeResponseRules(): void {
    // High severity incidents get immediate analyst notification
    this.responseRules.push({
      id: 'rule_001',
      name: 'High Severity Alert',
      conditions: {
        severity: [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]
      },
      action: ResponseAction.ALERT_ANALYST,
      enabled: true,
      priority: 1
    });
    
    // Malicious IP addresses get blocked
    this.responseRules.push({
      id: 'rule_002',
      name: 'Block Malicious IPs',
      conditions: {
        indicatorTypes: [IndicatorType.IP_ADDRESS],
        category: [IncidentCategory.UNAUTHORIZED_ACCESS, IncidentCategory.MALWARE]
      },
      action: ResponseAction.BLOCK_IP,
      enabled: true,
      priority: 2
    });
    
    // Compromised accounts get disabled
    this.responseRules.push({
      id: 'rule_003',
      name: 'Disable Compromised Accounts',
      conditions: {
        category: [IncidentCategory.UNAUTHORIZED_ACCESS, IncidentCategory.INSIDER_THREAT]
      },
      action: ResponseAction.DISABLE_ACCOUNT,
      enabled: true,
      priority: 3
    });
    
    // Critical incidents trigger evidence collection
    this.responseRules.push({
      id: 'rule_004',
      name: 'Collect Evidence for Critical Incidents',
      conditions: {
        severity: [IncidentSeverity.CRITICAL]
      },
      action: ResponseAction.COLLECT_EVIDENCE,
      enabled: true,
      priority: 4
    });
  }
  
  private calculateInitialImpact(
    severity: IncidentSeverity,
    category: IncidentCategory
  ): ImpactAssessment {
    const baseImpact: Record<IncidentSeverity, ImpactLevel> = {
      [IncidentSeverity.LOW]: ImpactLevel.LOW,
      [IncidentSeverity.MEDIUM]: ImpactLevel.MEDIUM,
      [IncidentSeverity.HIGH]: ImpactLevel.HIGH,
      [IncidentSeverity.CRITICAL]: ImpactLevel.CRITICAL
    };
    
    const categoryMultipliers: Record<IncidentCategory, number> = {
      [IncidentCategory.DATA_BREACH]: 1.5,
      [IncidentCategory.SYSTEM_COMPROMISE]: 1.3,
      [IncidentCategory.DENIAL_OF_SERVICE]: 1.2,
      [IncidentCategory.FRAUD]: 1.4,
      [IncidentCategory.MALWARE]: 1.1,
      [IncidentCategory.UNAUTHORIZED_ACCESS]: 1.3,
      [IncidentCategory.PHISHING]: 1.0,
      [IncidentCategory.INSIDER_THREAT]: 1.4,
      [IncidentCategory.POLICY_VIOLATION]: 0.8,
      [IncidentCategory.PHYSICAL_SECURITY]: 1.0
    };
    
    const baseLevelValue = this.getImpactLevelValue(baseImpact[severity]);
    const multiplier = categoryMultipliers[category] || 1.0;
    const adjustedValue = Math.min(baseLevelValue * multiplier, 4);
    
    const adjustedLevel = this.getImpactLevelFromValue(adjustedValue);
    
    return {
      confidentiality: category === IncidentCategory.DATA_BREACH ? adjustedLevel : baseImpact[severity],
      integrity: category === IncidentCategory.SYSTEM_COMPROMISE ? adjustedLevel : baseImpact[severity],
      availability: category === IncidentCategory.DENIAL_OF_SERVICE ? adjustedLevel : baseImpact[severity],
      financialImpact: this.estimateFinancialImpact(severity, category),
      reputationalImpact: baseImpact[severity],
      legalImpact: category === IncidentCategory.DATA_BREACH ? adjustedLevel : ImpactLevel.LOW,
      operationalImpact: baseImpact[severity],
      customerImpact: this.estimateCustomerImpact(severity, category),
      downtime: 0
    };
  }
  
  private recalculateImpact(incident: SecurityIncident): ImpactAssessment {
    // Recalculate based on affected assets and current status
    let maxImpact = incident.estimatedImpact;
    
    // Increase impact based on critical assets
    const criticalAssets = incident.affectedAssets.filter(a => 
      a.criticality === AssetCriticality.CRITICAL
    );
    
    if (criticalAssets.length > 0) {
      maxImpact.operationalImpact = ImpactLevel.HIGH;
      maxImpact.customerImpact = Math.max(maxImpact.customerImpact, 1000);
      maxImpact.financialImpact *= 2;
    }
    
    return maxImpact;
  }
  
  private getImpactLevelValue(level: ImpactLevel): number {
    const values: Record<ImpactLevel, number> = {
      [ImpactLevel.NONE]: 0,
      [ImpactLevel.LOW]: 1,
      [ImpactLevel.MEDIUM]: 2,
      [ImpactLevel.HIGH]: 3,
      [ImpactLevel.CRITICAL]: 4
    };
    return values[level];
  }
  
  private getImpactLevelFromValue(value: number): ImpactLevel {
    if (value >= 4) return ImpactLevel.CRITICAL;
    if (value >= 3) return ImpactLevel.HIGH;
    if (value >= 2) return ImpactLevel.MEDIUM;
    if (value >= 1) return ImpactLevel.LOW;
    return ImpactLevel.NONE;
  }
  
  private estimateFinancialImpact(severity: IncidentSeverity, category: IncidentCategory): number {
    const baseImpacts: Record<IncidentSeverity, number> = {
      [IncidentSeverity.LOW]: 1000,
      [IncidentSeverity.MEDIUM]: 10000,
      [IncidentSeverity.HIGH]: 100000,
      [IncidentSeverity.CRITICAL]: 1000000
    };
    
    const categoryMultipliers: Record<IncidentCategory, number> = {
      [IncidentCategory.DATA_BREACH]: 5.0,
      [IncidentCategory.FRAUD]: 3.0,
      [IncidentCategory.SYSTEM_COMPROMISE]: 2.0,
      [IncidentCategory.DENIAL_OF_SERVICE]: 1.5,
      [IncidentCategory.MALWARE]: 1.5,
      [IncidentCategory.UNAUTHORIZED_ACCESS]: 1.2,
      [IncidentCategory.PHISHING]: 1.0,
      [IncidentCategory.INSIDER_THREAT]: 2.5,
      [IncidentCategory.POLICY_VIOLATION]: 0.5,
      [IncidentCategory.PHYSICAL_SECURITY]: 1.0
    };
    
    return baseImpacts[severity] * (categoryMultipliers[category] || 1.0);
  }
  
  private estimateCustomerImpact(severity: IncidentSeverity, category: IncidentCategory): number {
    const baseImpacts: Record<IncidentSeverity, number> = {
      [IncidentSeverity.LOW]: 10,
      [IncidentSeverity.MEDIUM]: 100,
      [IncidentSeverity.HIGH]: 1000,
      [IncidentSeverity.CRITICAL]: 10000
    };
    
    if (category === IncidentCategory.DATA_BREACH) {
      return baseImpacts[severity] * 5;
    } else if (category === IncidentCategory.DENIAL_OF_SERVICE) {
      return baseImpacts[severity] * 10;
    }
    
    return baseImpacts[severity];
  }
  
  private handleStatusChange(
    incident: SecurityIncident,
    previousStatus: IncidentStatus,
    newStatus: IncidentStatus
  ): void {
    // Handle specific status transitions
    switch (newStatus) {
      case IncidentStatus.CONTAINED:
        this.handleContainmentComplete(incident);
        break;
      case IncidentStatus.RESOLVED:
        this.handleIncidentResolved(incident);
        break;
      case IncidentStatus.CLOSED:
        this.handleIncidentClosed(incident);
        break;
    }
  }
  
  private handleContainmentComplete(incident: SecurityIncident): void {
    // Update affected assets status
    for (const asset of incident.affectedAssets) {
      if (asset.compromiseStatus === CompromiseStatus.CONFIRMED) {
        asset.compromiseStatus = CompromiseStatus.CONTAINED;
      }
    }
    
    // Send containment notification
    this.sendCommunication(incident, {
      type: CommunicationType.UPDATE,
      recipient: 'stakeholders',
      sender: 'incident_response_team',
      message: `Incident ${incident.id} has been contained. Threat is no longer spreading.`,
      channel: CommunicationChannel.EMAIL,
      delivered: true,
      acknowledged: false
    });
  }
  
  private handleIncidentResolved(incident: SecurityIncident): void {
    // Calculate resolution metrics
    const resolutionTime = new Date().getTime() - incident.createdAt.getTime();
    const containmentActions = incident.containmentActions.length;
    
    // Update affected assets
    for (const asset of incident.affectedAssets) {
      asset.compromiseStatus = CompromiseStatus.REMEDIATED;
    }
    
    this.addTimelineEvent(incident, {
      type: EventType.RECOVERY,
      description: `Incident resolved after ${Math.round(resolutionTime / (1000 * 60))} minutes with ${containmentActions} containment actions`,
      actor: 'incident_response_team',
      automated: false,
      details: { resolutionTime, containmentActions }
    });
  }
  
  private handleIncidentClosed(incident: SecurityIncident): void {
    // Generate post-incident report if not exists
    if (!incident.postIncidentReport) {
      incident.postIncidentReport = this.generatePostIncidentReport(incident);
    }
    
    // Send closure notification
    this.sendCommunication(incident, {
      type: CommunicationType.RESOLUTION,
      recipient: 'all_stakeholders',
      sender: 'incident_response_manager',
      message: `Incident ${incident.id} has been officially closed. Post-incident report available.`,
      channel: CommunicationChannel.EMAIL,
      delivered: true,
      acknowledged: false
    });
  }
  
  private generatePostIncidentReport(incident: SecurityIncident): PostIncidentReport {
    return {
      id: this.generateReportId(),
      incidentId: incident.id,
      rootCause: this.determineRootCause(incident),
      contributingFactors: this.identifyContributingFactors(incident),
      timelineAccuracy: 0.9,
      containmentEffectiveness: this.calculateContainmentEffectiveness(incident),
      communicationEffectiveness: this.calculateCommunicationEffectiveness(incident),
      lessonsLearned: this.extractLessonsLearned(incident),
      improvements: this.generateImprovementRecommendations(incident),
      createdBy: 'incident_response_manager',
      createdAt: new Date()
    };
  }
  
  private addTimelineEvent(incident: SecurityIncident, eventData: Omit<IncidentEvent, 'id' | 'timestamp'>): void {
    const event: IncidentEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...eventData
    };
    
    incident.timeline.push(event);
  }
  
  private sendIncidentNotifications(incident: SecurityIncident): void {
    // Send notifications based on severity
    if (incident.severity === IncidentSeverity.CRITICAL) {
      this.sendCommunication(incident, {
        type: CommunicationType.ESCALATION,
        recipient: 'executive_team',
        sender: 'security_operations_center',
        message: `CRITICAL INCIDENT: ${incident.title} - Immediate attention required`,
        channel: CommunicationChannel.PHONE,
        delivered: true,
        acknowledged: false
      });
    }
    
    if ([IncidentSeverity.HIGH, IncidentSeverity.CRITICAL].includes(incident.severity)) {
      this.sendCommunication(incident, {
        type: CommunicationType.NOTIFICATION,
        recipient: 'security_team',
        sender: 'automated_system',
        message: `New ${incident.severity} severity incident: ${incident.title}`,
        channel: CommunicationChannel.SLACK,
        delivered: true,
        acknowledged: false
      });
    }
  }
  
  private sendCommunication(incident: SecurityIncident, communication: Omit<CommunicationEntry, 'id' | 'timestamp'>): void {
    const entry: CommunicationEntry = {
      id: this.generateCommunicationId(),
      timestamp: new Date(),
      ...communication
    };
    
    incident.communicationLog.push(entry);
    
    // Simulate sending communication
    console.log(`[${entry.channel.toUpperCase()}] To: ${entry.recipient} - ${entry.message}`);
  }
  
  private correlateWithIncidents(intel: ThreatIntelligence): void {
    const activeIncidents = this.getActiveIncidents();
    
    for (const incident of activeIncidents) {
      // Check if intelligence indicator matches any incident indicators
      const matchingIndicator = incident.indicators.find(indicator => 
        indicator.value === intel.indicator && indicator.type === intel.indicatorType
      );
      
      if (matchingIndicator) {
        // Enhance incident with threat intelligence
        this.addTimelineEvent(incident, {
          type: EventType.ANALYSIS,
          description: `Threat intelligence correlation found: ${intel.description}`,
          actor: 'threat_intelligence_system',
          automated: true,
          details: { intelligenceId: intel.id, threatActor: intel.threatActor }
        });
        
        // Update indicator confidence
        matchingIndicator.confidence = Math.max(matchingIndicator.confidence, intel.confidence);
      }
    }
  }
  
  private executeContainmentAction(incident: SecurityIncident, action: ContainmentAction): void {
    // Simulate execution time
    setTimeout(() => {
      action.status = ActionStatus.COMPLETED;
      action.effectiveness = this.assessActionEffectiveness(action);
      
      this.addTimelineEvent(incident, {
        type: EventType.CONTAINMENT,
        description: `Containment action completed: ${action.description}`,
        actor: action.implementedBy,
        automated: false,
        details: { 
          actionId: action.id, 
          effectiveness: action.effectiveness 
        }
      });
    }, 5000); // 5 second delay to simulate execution
  }
  
  private assessActionEffectiveness(action: ContainmentAction): EffectivenessRating {
    // Simplified effectiveness assessment
    switch (action.type) {
      case ContainmentType.NETWORK_ISOLATION:
        return EffectivenessRating.HIGHLY_EFFECTIVE;
      case ContainmentType.ACCOUNT_DISABLE:
        return EffectivenessRating.EFFECTIVE;
      case ContainmentType.TRAFFIC_BLOCKING:
        return EffectivenessRating.EFFECTIVE;
      default:
        return EffectivenessRating.PARTIALLY_EFFECTIVE;
    }
  }
  
  private determineRootCause(incident: SecurityIncident): string {
    // Simplified root cause analysis
    switch (incident.category) {
      case IncidentCategory.MALWARE:
        return 'Malicious email attachment executed by user';
      case IncidentCategory.UNAUTHORIZED_ACCESS:
        return 'Weak password policy allowed brute force attack';
      case IncidentCategory.DATA_BREACH:
        return 'Unpatched vulnerability in web application';
      default:
        return 'Root cause analysis pending';
    }
  }
  
  private identifyContributingFactors(incident: SecurityIncident): string[] {
    return [
      'Delayed patch management',
      'Insufficient user security awareness training',
      'Inadequate network segmentation',
      'Limited monitoring coverage'
    ];
  }
  
  private calculateContainmentEffectiveness(incident: SecurityIncident): number {
    const totalActions = incident.containmentActions.length;
    if (totalActions === 0) return 0;
    
    const effectiveActions = incident.containmentActions.filter(action => 
      [EffectivenessRating.EFFECTIVE, EffectivenessRating.HIGHLY_EFFECTIVE].includes(action.effectiveness)
    ).length;
    
    return effectiveActions / totalActions;
  }
  
  private calculateCommunicationEffectiveness(incident: SecurityIncident): number {
    const totalCommunications = incident.communicationLog.length;
    if (totalCommunications === 0) return 0;
    
    const acknowledgedCommunications = incident.communicationLog.filter(comm => 
      comm.acknowledged
    ).length;
    
    return acknowledgedCommunications / totalCommunications;
  }
  
  private extractLessonsLearned(incident: SecurityIncident): string[] {
    return [
      'Faster containment reduces impact significantly',
      'Clear communication protocols are essential',
      'Automated response capabilities should be expanded',
      'Regular incident response training is critical'
    ];
  }
  
  private generateImprovementRecommendations(incident: SecurityIncident): ImprovementRecommendation[] {
    return [
      {
        id: this.generateRecommendationId(),
        category: ImprovementCategory.TECHNOLOGY,
        description: 'Implement automated containment for common attack patterns',
        priority: Priority.HIGH,
        estimatedCost: 50000,
        estimatedTimeframe: '3 months',
        responsible: 'security_engineering_team',
        status: RecommendationStatus.PROPOSED
      },
      {
        id: this.generateRecommendationId(),
        category: ImprovementCategory.PROCESS,
        description: 'Update incident response playbooks based on lessons learned',
        priority: Priority.MEDIUM,
        estimatedCost: 10000,
        estimatedTimeframe: '1 month',
        responsible: 'incident_response_team',
        status: RecommendationStatus.PROPOSED
      }
    ];
  }
  
  // ID generators
  private generateIncidentId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  
  private generateEventId(): string {
    return `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  private generateResponseId(): string {
    return `RSP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  private generateReportId(): string {
    return `RPT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  private generateCommunicationId(): string {
    return `COM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  private generateRecommendationId(): string {
    return `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
}

// Response Rule interface
export interface ResponseRule {
  id: string;
  name: string;
  conditions: ResponseRuleConditions;
  action: ResponseAction;
  enabled: boolean;
  priority: number;
}

export interface ResponseRuleConditions {
  severity?: IncidentSeverity[];
  category?: IncidentCategory[];
  indicatorTypes?: IndicatorType[];
  detectionSource?: DetectionSource[];
}

// Export instance
export const incidentResponseManager = new IncidentResponseManager();