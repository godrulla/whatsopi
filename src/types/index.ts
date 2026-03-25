// Core application types for WhatsOpí

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferredLanguage: 'es-DO' | 'ht';  // Dominican Spanish or Haitian Creole
  role: 'customer' | 'colmado_owner' | 'admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  digitalReputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Colmado {
  id: string;
  name: string;
  ownerId: string;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    province: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone: string;
  whatsappNumber: string;
  isVerified: boolean;
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  services: string[];  // e.g., ['delivery', 'pickup', 'cash_out', 'payments']
  rating: number;
  totalTransactions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  colmadoId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  currency: 'DOP' | 'USD';
  imageUrl?: string;
  inStock: boolean;
  stockQuantity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  colmadoId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: 'DOP' | 'USD';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'whatsapp_pay';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  estimatedDeliveryTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Voice Interface Types
export interface VoiceCommand {
  command: string;
  confidence: number;
  language: 'es-DO' | 'ht' | 'en';
  intent: string;
  entities: VoiceEntity[];
  timestamp: Date;
}

export interface VoiceEntity {
  type: 'product' | 'quantity' | 'colmado' | 'location' | 'time' | 'price';
  value: string;
  confidence: number;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  language: 'es-DO' | 'ht' | 'en';
  emotion?: 'neutral' | 'helpful' | 'encouraging' | 'apologetic';
}

// WhatsApp Integration Types
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location' | 'interactive';
  content: string | WhatsAppInteractiveContent;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface WhatsAppInteractiveContent {
  type: 'button' | 'list' | 'product_list';
  header?: string;
  body: string;
  footer?: string;
  action: WhatsAppAction;
}

export interface WhatsAppAction {
  buttons?: WhatsAppButton[];
  sections?: WhatsAppSection[];
  product_sections?: WhatsAppProductSection[];
}

export interface WhatsAppButton {
  id: string;
  title: string;
  type: 'reply' | 'url' | 'phone';
  url?: string;
  phone?: string;
}

export interface WhatsAppSection {
  title: string;
  rows: WhatsAppRow[];
}

export interface WhatsAppRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppProductSection {
  title: string;
  product_items: WhatsAppProductItem[];
}

export interface WhatsAppProductItem {
  product_retailer_id: string;
  name: string;
  price: string;
  currency: string;
  image_url?: string;
}

// AI and Credit Assessment Types
export interface CreditAssessment {
  userId: string;
  score: number;
  factors: CreditFactor[];
  recommendation: 'approve' | 'review' | 'decline';
  maxLoanAmount: number;
  suggestedInterestRate: number;
  assessmentDate: Date;
  validUntil: Date;
}

export interface CreditFactor {
  type: 'transaction_history' | 'digital_reputation' | 'payment_consistency' | 'business_growth' | 'community_standing';
  value: number;
  weight: number;
  description: string;
}

export interface DigitalReputation {
  userId: string;
  overallScore: number;
  components: {
    transactionReliability: number;
    customerSatisfaction: number;
    businessGrowth: number;
    communityEngagement: number;
    paymentHistory: number;
  };
  verifiedSkills: string[];
  endorsements: Endorsement[];
  portfolio: PortfolioItem[];
  lastUpdated: Date;
}

export interface Endorsement {
  fromUserId: string;
  fromUserName: string;
  skill: string;
  comment?: string;
  rating: number;
  createdAt: Date;
}

export interface PortfolioItem {
  type: 'image' | 'document' | 'video' | 'testimonial';
  title: string;
  description: string;
  url: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
}

// Payment and Financial Types
export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'tpago' | 'bank_account';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  orderId?: string;
  type: 'payment' | 'refund' | 'cash_out' | 'cash_in' | 'transfer';
  amount: number;
  currency: 'DOP' | 'USD';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethodId?: string;
  description: string;
  fees?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

// Offline Storage Types
export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'order' | 'product' | 'user' | 'message';
  entityId: string;
  payload: any;
  timestamp: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export interface SyncStatus {
  lastSync: Date;
  pendingActions: number;
  failedActions: number;
  isOnline: boolean;
  isSyncing: boolean;
}

// Language and Localization Types
export interface Language {
  code: 'es-DO' | 'ht' | 'en';
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export interface TranslationKey {
  key: string;
  'es-DO': string;
  'ht': string;
  'en'?: string;
  context?: string;
  pluralForms?: {
    'es-DO': string[];
    'ht': string[];
    'en'?: string[];
  };
}

// App State Types
export interface AppState {
  user: User | null;
  currentLanguage: 'es-DO' | 'ht' | 'en';
  isOnline: boolean;
  isVoiceEnabled: boolean;
  syncStatus: SyncStatus;
  currentColmado: Colmado | null;
  cart: CartItem[];
  notifications: Notification[];
}

export interface CartItem {
  productId: string;
  productName: string;
  colmadoId: string;
  colmadoName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}