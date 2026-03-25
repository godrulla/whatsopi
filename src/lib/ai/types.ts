/**
 * Core AI Types and Interfaces for WhatsOpí
 * Comprehensive type definitions for the AI/ML system
 */

// Core AI Types
export type Language = 'es-DO' | 'ht' | 'en' | 'es';
export type ModelProvider = 'claude' | 'alia' | 'openai' | 'custom';
export type AICapability = 'nlp' | 'voice' | 'chat' | 'recommendation' | 'credit' | 'fraud' | 'moderation' | 'analytics';

// Request and Response Types
export interface AIRequest {
  id: string;
  userId?: string;
  sessionId: string;
  capability: AICapability;
  provider?: ModelProvider;
  input: string | Buffer | AIStructuredInput;
  context?: AIContext;
  options?: AIRequestOptions;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  id: string;
  requestId: string;
  success: boolean;
  data?: any;
  error?: AIError;
  confidence?: number;
  processingTime: number;
  provider: ModelProvider;
  model: string;
  tokens?: TokenUsage;
  metadata?: Record<string, any>;
}

export interface AIStructuredInput {
  text?: string;
  audio?: Buffer;
  image?: Buffer;
  data?: Record<string, any>;
  format?: 'text' | 'audio' | 'image' | 'json';
}

export interface AIContext {
  userId?: string;
  sessionId: string;
  language: Language;
  location?: GeolocationData;
  userProfile?: UserProfile;
  conversationHistory?: ConversationMessage[];
  businessContext?: BusinessContext;
  culturalContext?: CulturalContext;
  timestamp: Date;
}

export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  cacheEnabled?: boolean;
  securityLevel?: SecurityLevel;
  timeout?: number;
  retries?: number;
}

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  cost?: number;
}

// Language Processing Types
export interface LanguageDetectionResult {
  language: Language;
  confidence: number;
  dialect?: string;
  alternativeLanguages?: { language: Language; confidence: number }[];
}

export interface TextAnalysis {
  language: LanguageDetectionResult;
  sentiment: SentimentResult;
  entities: Entity[];
  intent: IntentResult;
  keywords: Keyword[];
  readability: ReadabilityScore;
  culturalMarkers: CulturalMarker[];
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'negative' | 'neutral' | 'positive';
  confidence: number;
  emotions?: EmotionScore[];
}

export interface EmotionScore {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'trust' | 'anticipation' | 'disgust';
  score: number;
}

export interface Entity {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export type EntityType = 
  | 'person' | 'location' | 'organization' | 'product' | 'money' | 'date' | 'time'
  | 'phone' | 'email' | 'address' | 'colmado' | 'dominican_location' | 'haitian_location'
  | 'local_product' | 'currency' | 'informal_business';

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters?: Record<string, any>;
  alternativeIntents?: { intent: string; confidence: number }[];
}

export interface Keyword {
  text: string;
  relevance: number;
  frequency: number;
  category?: string;
}

export interface ReadabilityScore {
  score: number;
  level: 'very_easy' | 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  grade: number;
}

export interface CulturalMarker {
  type: 'dominican_expression' | 'haitian_expression' | 'caribbean_slang' | 'formal_spanish' | 'informal_spanish';
  text: string;
  meaning?: string;
  confidence: number;
}

// Voice Processing Types
export interface VoiceProcessingResult {
  transcript: string;
  language: LanguageDetectionResult;
  confidence: number;
  speakerInfo?: SpeakerInfo;
  audioQuality: AudioQuality;
  voiceFeatures: VoiceFeatures;
  dominican: DominicanVoiceFeatures;
}

export interface SpeakerInfo {
  speakerId?: string;
  gender?: 'male' | 'female' | 'unknown';
  ageRange?: 'child' | 'young_adult' | 'adult' | 'senior';
  accent: AccentInfo;
  voiceprint?: string;
}

export interface AccentInfo {
  type: 'dominican' | 'haitian' | 'caribbean' | 'standard_spanish' | 'other';
  region?: string;
  confidence: number;
  characteristics: string[];
}

export interface AudioQuality {
  sampleRate: number;
  bitRate: number;
  duration: number;
  noiseLevel: number;
  clarity: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface VoiceFeatures {
  pitch: number;
  speed: number;
  volume: number;
  emphasis: number[];
  pauses: number[];
  intonation: IntonationPattern[];
}

export interface IntonationPattern {
  type: 'rising' | 'falling' | 'flat' | 'question' | 'exclamation';
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface DominicanVoiceFeatures {
  localExpressions: LocalExpression[];
  pronunciationVariants: PronunciationVariant[];
  dialectMarkers: DialectMarker[];
  informalityLevel: number;
}

export interface LocalExpression {
  expression: string;
  standardEquivalent: string;
  usage: 'common' | 'regional' | 'generational';
  confidence: number;
}

export interface PronunciationVariant {
  word: string;
  standardPronunciation: string;
  localPronunciation: string;
  variant: 'aspiration' | 'weakening' | 'substitution' | 'deletion';
}

export interface DialectMarker {
  feature: string;
  type: 'phonetic' | 'lexical' | 'syntactic';
  description: string;
  confidence: number;
}

// Chat and Conversation Types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  language: Language;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  message: string;
  language: Language;
  intent: string;
  actions?: ChatAction[];
  suggestions?: string[];
  culturalContext?: CulturalChatContext;
  dominican: DominicanChatFeatures;
}

export interface ChatAction {
  type: 'navigate' | 'search' | 'order' | 'payment' | 'call_api' | 'show_info';
  parameters: Record<string, any>;
  description: string;
}

export interface CulturalChatContext {
  formality: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  relationshipLevel: 'stranger' | 'acquaintance' | 'friend' | 'family';
  culturalNorms: string[];
  localContext: string[];
}

export interface DominicanChatFeatures {
  useLocalExpressions: boolean;
  informalityLevel: number;
  communityContext: boolean;
  colmadoReferences: boolean;
}

// Recommendation Types
export interface RecommendationRequest {
  userId: string;
  type: 'product' | 'colmado' | 'service' | 'content';
  context: RecommendationContext;
  filters?: RecommendationFilters;
  limit?: number;
}

export interface RecommendationContext {
  location?: GeolocationData;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season?: 'dry' | 'wet';
  weather?: 'sunny' | 'rainy' | 'cloudy';
  currentCart?: string[];
  recentPurchases?: PurchaseHistory[];
  preferences?: UserPreferences;
  culturalEvents?: CulturalEvent[];
}

export interface RecommendationFilters {
  priceRange?: { min: number; max: number };
  category?: string[];
  brands?: string[];
  distance?: number;
  rating?: number;
  availability?: boolean;
}

export interface Recommendation {
  id: string;
  type: 'product' | 'colmado' | 'service';
  title: string;
  description: string;
  confidence: number;
  reason: string;
  culturalRelevance: string;
  dominican: DominicanRecommendationFeatures;
  metadata: Record<string, any>;
}

export interface DominicanRecommendationFeatures {
  localPopularity: number;
  communityTrust: number;
  informalEconomyFit: boolean;
  culturalAppropriate: boolean;
  familyOriented: boolean;
}

// Credit Scoring Types
export interface CreditScoringRequest {
  userId: string;
  personalInfo: PersonalInfo;
  financialData: FinancialData;
  informalEconomyData: InformalEconomyData;
  socialData?: SocialData;
  behaviorData?: BehaviorData;
}

export interface PersonalInfo {
  age: number;
  gender: 'male' | 'female' | 'other';
  location: GeolocationData;
  education: EducationLevel;
  familySize: number;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
}

export type EducationLevel = 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate';

export interface FinancialData {
  monthlyIncome?: number;
  incomeStability: 'very_stable' | 'stable' | 'moderate' | 'unstable' | 'very_unstable';
  bankAccount: boolean;
  creditHistory?: CreditHistoryItem[];
  assets?: Asset[];
  debts?: Debt[];
}

export interface CreditHistoryItem {
  type: 'loan' | 'credit_card' | 'informal_credit';
  amount: number;
  status: 'paid' | 'current' | 'late' | 'defaulted';
  date: Date;
  provider: string;
}

export interface Asset {
  type: 'property' | 'vehicle' | 'business' | 'livestock' | 'equipment';
  value: number;
  description: string;
}

export interface Debt {
  type: 'formal' | 'informal' | 'family' | 'community';
  amount: number;
  creditor: string;
  dueDate?: Date;
}

export interface InformalEconomyData {
  businessType?: 'colmado' | 'street_vendor' | 'service_provider' | 'craft_maker' | 'other';
  businessAge?: number;
  customerBase: 'local' | 'regional' | 'tourist' | 'mixed';
  seasonality: 'stable' | 'seasonal' | 'variable';
  communityStanding: CommunityStanding;
  supplierRelationships: SupplierRelationship[];
}

export interface CommunityStanding {
  reputation: 'poor' | 'fair' | 'good' | 'excellent';
  trustLevel: number;
  communityRoles: string[];
  recommendations: number;
}

export interface SupplierRelationship {
  supplier: string;
  relationship: 'new' | 'established' | 'long_term';
  creditTerms?: string;
  reliability: number;
}

export interface SocialData {
  phoneUsage: PhoneUsageData;
  socialConnections: number;
  communityInvolvement: string[];
  references: Reference[];
}

export interface PhoneUsageData {
  hasSmartphone: boolean;
  dataUsage: 'low' | 'medium' | 'high';
  paymentHistory: 'poor' | 'fair' | 'good' | 'excellent';
  socialMediaUsage: boolean;
}

export interface Reference {
  name: string;
  relationship: 'family' | 'friend' | 'business' | 'community';
  contactInfo: string;
  trustLevel: number;
}

export interface BehaviorData {
  whatsapiUsage: WhatsapiUsageData;
  transactionPatterns: TransactionPattern[];
  reliability: ReliabilityMetrics;
}

export interface WhatsapiUsageData {
  accountAge: number;
  transactionCount: number;
  averageTransactionSize: number;
  paymentMethods: string[];
  disputeHistory: number;
}

export interface TransactionPattern {
  type: 'regular' | 'seasonal' | 'irregular';
  frequency: number;
  amount: number;
  category: string;
}

export interface ReliabilityMetrics {
  paymentPunctuality: number;
  communicationResponsiveness: number;
  promiseKeeping: number;
  disputeResolution: number;
}

export interface CreditScore {
  score: number; // 300-850 scale
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: ScoreFactor[];
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  recommendations: string[];
  dominican: DominicanCreditFeatures;
}

export interface ScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface DominicanCreditFeatures {
  informalEconomyAdjustment: number;
  communityTrustFactor: number;
  remittanceReliability?: number;
  seasonalityAdjustment: number;
  culturalFactors: string[];
}

// Fraud Detection Types
export interface FraudDetectionRequest {
  transactionId: string;
  userId?: string;
  transaction: TransactionData;
  context: FraudContext;
  userProfile?: UserProfile;
}

export interface TransactionData {
  amount: number;
  currency: string;
  type: 'payment' | 'transfer' | 'withdrawal' | 'deposit';
  method: 'card' | 'mobile' | 'cash' | 'whatsapp';
  merchant?: string;
  location?: GeolocationData;
  timestamp: Date;
}

export interface FraudContext {
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
  sessionInfo: SessionInfo;
  behaviorContext: BehaviorContext;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  os: string;
  browser?: string;
  isKnownDevice: boolean;
  trustScore: number;
}

export interface NetworkInfo {
  ipAddress: string;
  location: GeolocationData;
  isp: string;
  vpnDetected: boolean;
  proxyDetected: boolean;
  riskScore: number;
}

export interface SessionInfo {
  sessionId: string;
  sessionAge: number;
  actionsCount: number;
  authenticationType: 'password' | 'biometric' | 'sms' | 'whatsapp';
  multiFactorUsed: boolean;
}

export interface BehaviorContext {
  typingPatterns?: TypingPattern;
  navigationPatterns: NavigationPattern[];
  timePatterns: TimePattern;
  transactionPatterns: HistoricalPattern[];
}

export interface TypingPattern {
  speed: number;
  rhythm: number[];
  consistency: number;
  deviceMatches: boolean;
}

export interface NavigationPattern {
  path: string;
  duration: number;
  interactions: number;
  typical: boolean;
}

export interface TimePattern {
  hourOfDay: number;
  dayOfWeek: number;
  timezone: string;
  typical: boolean;
}

export interface HistoricalPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  deviation: number;
}

export interface FraudScore {
  score: number; // 0-1000
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: FraudFactor[];
  confidence: number;
  recommendations: FraudRecommendation[];
  dominican: DominicanFraudFeatures;
}

export interface FraudFactor {
  factor: string;
  category: 'device' | 'behavior' | 'transaction' | 'location' | 'timing';
  riskScore: number;
  description: string;
  evidence: Record<string, any>;
}

export interface FraudRecommendation {
  action: 'allow' | 'challenge' | 'block' | 'manual_review';
  reason: string;
  confidence: number;
  alternatives?: string[];
}

export interface DominicanFraudFeatures {
  informalPatternRecognition: boolean;
  remittancePatterns: boolean;
  communityTrustFactors: boolean;
  localTransactionNorms: string[];
}

// Business Analytics Types
export interface AnalyticsRequest {
  colmadoId: string;
  timeRange: DateRange;
  metrics: AnalyticsMetric[];
  comparisons?: ComparisonRequest[];
  segmentation?: SegmentationRequest;
}

export interface DateRange {
  start: Date;
  end: Date;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export type AnalyticsMetric = 
  | 'sales' | 'revenue' | 'customers' | 'transactions' | 'inventory' | 'profit'
  | 'customer_satisfaction' | 'repeat_rate' | 'average_order' | 'peak_hours';

export interface ComparisonRequest {
  type: 'time_period' | 'peer_colmados' | 'market_average';
  parameters: Record<string, any>;
}

export interface SegmentationRequest {
  dimension: 'product' | 'customer' | 'time' | 'location';
  granularity: 'detailed' | 'summary';
}

export interface AnalyticsResult {
  metrics: MetricResult[];
  insights: BusinessInsight[];
  recommendations: BusinessRecommendation[];
  predictions: BusinessPrediction[];
  dominican: DominicanBusinessFeatures;
}

export interface MetricResult {
  metric: AnalyticsMetric;
  value: number;
  trend: TrendDirection;
  change: number;
  period: string;
  segments?: SegmentData[];
}

export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile';

export interface SegmentData {
  segment: string;
  value: number;
  percentage: number;
  trend: TrendDirection;
}

export interface BusinessInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
}

export interface BusinessRecommendation {
  category: 'pricing' | 'inventory' | 'marketing' | 'operations' | 'customer_service';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string;
  cost: 'low' | 'medium' | 'high';
}

export interface BusinessPrediction {
  metric: AnalyticsMetric;
  timeframe: 'next_week' | 'next_month' | 'next_quarter';
  predicted: number;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface DominicanBusinessFeatures {
  seasonalFactors: SeasonalFactor[];
  culturalEvents: CulturalEvent[];
  informalEconomyMetrics: InformalEconomyMetric[];
  communityInsights: CommunityInsight[];
}

export interface SeasonalFactor {
  period: string;
  impact: number;
  description: string;
  products?: string[];
}

export interface CulturalEvent {
  name: string;
  date: Date;
  impact: 'low' | 'medium' | 'high';
  categories: string[];
  preparation: string[];
}

export interface InformalEconomyMetric {
  metric: string;
  value: number;
  benchmarkComparison: number;
  description: string;
}

export interface CommunityInsight {
  insight: string;
  relevance: number;
  actionable: boolean;
  community: string;
}

// User and Context Types
export interface UserProfile {
  userId: string;
  demographics: Demographics;
  preferences: UserPreferences;
  behavior: UserBehavior;
  location: GeolocationData;
  language: Language;
  culturalProfile: CulturalProfile;
}

export interface Demographics {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  education?: EducationLevel;
  income?: IncomeRange;
  familySize?: number;
  occupation?: string;
}

export type IncomeRange = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export interface UserPreferences {
  products: string[];
  brands: string[];
  priceRange: { min: number; max: number };
  colmados: string[];
  paymentMethods: string[];
  communicationStyle: 'formal' | 'informal';
  language: Language;
}

export interface UserBehavior {
  purchaseFrequency: number;
  averageOrderValue: number;
  preferredTimes: number[];
  seasonalPatterns: string[];
  loyaltyLevel: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  neighborhood?: string;
}

export interface CulturalProfile {
  region: 'northern' | 'southern' | 'eastern' | 'central' | 'capital';
  urbanicity: 'urban' | 'suburban' | 'rural';
  economicLevel: 'informal' | 'mixed' | 'formal';
  socialConnectedness: number;
  traditionalValues: number;
  techAdoption: 'early' | 'mainstream' | 'late' | 'laggard';
}

export interface BusinessContext {
  colmadoId?: string;
  businessType?: string;
  operatingHours?: string;
  customerBase?: string;
  location?: GeolocationData;
  seasonality?: string[];
}

// Utility Types
export type SecurityLevel = 'low' | 'medium' | 'high' | 'maximum';

export interface PurchaseHistory {
  productId: string;
  colmadoId: string;
  amount: number;
  date: Date;
  satisfaction?: number;
}

// Error Types
export interface AIErrorDetails {
  code: string;
  message: string;
  provider?: ModelProvider;
  model?: string;
  requestId?: string;
  timestamp: Date;
  retryable: boolean;
  details?: Record<string, any>;
}