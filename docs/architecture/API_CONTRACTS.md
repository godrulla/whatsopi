# WhatsOpí API Contracts

## Overview

This document defines all API contracts for WhatsOpí's microservices architecture. All APIs follow REST principles with consistent error handling, authentication, and versioning strategies.

## Table of Contents

1. [API Standards](#api-standards)
2. [Authentication Service APIs](#authentication-service-apis)
3. [User Service APIs](#user-service-apis)
4. [Payment Service APIs](#payment-service-apis)
5. [Commerce Service APIs](#commerce-service-apis)
6. [Messaging Service APIs](#messaging-service-apis)
7. [AI Service APIs](#ai-service-apis)
8. [Voice Service APIs](#voice-service-apis)
9. [Notification Service APIs](#notification-service-apis)
10. [WhatsApp Webhook APIs](#whatsapp-webhook-apis)

## API Standards

### Base URLs
```yaml
production: https://api.whatsopi.do/v1
staging: https://api-staging.whatsopi.do/v1
development: http://localhost:3000/v1
```

### Common Headers
```http
Content-Type: application/json
Accept: application/json
X-API-Version: 1.0
X-Request-ID: uuid-v4
X-Client-Version: app-version
Accept-Language: es-DO | ht
Authorization: Bearer {jwt-token}
```

### Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### Error Codes
```typescript
enum ErrorCodes {
  // Authentication Errors (1xxx)
  UNAUTHORIZED = "1001",
  INVALID_TOKEN = "1002",
  TOKEN_EXPIRED = "1003",
  INSUFFICIENT_PERMISSIONS = "1004",
  
  // Validation Errors (2xxx)
  VALIDATION_FAILED = "2001",
  INVALID_INPUT = "2002",
  MISSING_REQUIRED_FIELD = "2003",
  
  // Business Logic Errors (3xxx)
  INSUFFICIENT_BALANCE = "3001",
  TRANSACTION_FAILED = "3002",
  PRODUCT_NOT_FOUND = "3003",
  USER_NOT_FOUND = "3004",
  
  // System Errors (5xxx)
  INTERNAL_ERROR = "5001",
  SERVICE_UNAVAILABLE = "5002",
  RATE_LIMIT_EXCEEDED = "5003",
}
```

### Pagination
```typescript
interface PaginationParams {
  page: number;      // Starting from 1
  limit: number;     // Max 100
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Authentication Service APIs

### POST /auth/register
Register a new user account.

```typescript
// Request
interface RegisterRequest {
  phoneNumber: string;        // E.164 format
  fullName: string;
  password?: string;          // Optional for WhatsApp-only users
  preferredLanguage: 'es-DO' | 'ht';
  userType: 'customer' | 'merchant' | 'colmado_agent';
  referralCode?: string;
}

// Response
interface RegisterResponse {
  userId: string;
  verificationRequired: boolean;
  verificationMethod: 'sms' | 'whatsapp';
  sessionToken?: string;      // If auto-login enabled
}
```

### POST /auth/login
Authenticate user and receive tokens.

```typescript
// Request
interface LoginRequest {
  identifier: string;         // Phone number or username
  password?: string;          // Required for password users
  otpCode?: string;          // For OTP login
  method: 'password' | 'otp' | 'whatsapp';
}

// Response
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    fullName: string;
    userType: string;
    phoneNumber: string;
    isVerified: boolean;
  };
}
```

### POST /auth/verify
Verify phone number with OTP.

```typescript
// Request
interface VerifyRequest {
  phoneNumber: string;
  code: string;
  verificationType: 'registration' | 'login' | 'transaction';
}

// Response
interface VerifyResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
}
```

### POST /auth/refresh
Refresh access token.

```typescript
// Request
interface RefreshRequest {
  refreshToken: string;
}

// Response
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### POST /auth/logout
Invalidate user session.

```typescript
// Request
interface LogoutRequest {
  refreshToken: string;
  allDevices?: boolean;
}

// Response
interface LogoutResponse {
  success: boolean;
}
```

## User Service APIs

### GET /users/profile
Get current user profile.

```typescript
// Response
interface UserProfile {
  userId: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  userType: 'customer' | 'merchant' | 'colmado_agent';
  preferredLanguage: 'es-DO' | 'ht';
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  digitalIdentity: {
    reputationScore: number;
    transactionCount: number;
    memberSince: string;
    verificationLevel: number;
  };
  preferences: {
    notifications: {
      whatsapp: boolean;
      sms: boolean;
      email: boolean;
      push: boolean;
    };
    privacy: {
      shareLocation: boolean;
      shareTransaction: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}
```

### PUT /users/profile
Update user profile.

```typescript
// Request
interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  preferredLanguage?: 'es-DO' | 'ht';
  preferences?: {
    notifications?: {
      whatsapp?: boolean;
      sms?: boolean;
      email?: boolean;
      push?: boolean;
    };
    privacy?: {
      shareLocation?: boolean;
      shareTransaction?: boolean;
    };
  };
}

// Response
interface UpdateProfileResponse {
  profile: UserProfile;
  updated: boolean;
}
```

### POST /users/kyc
Submit KYC documentation.

```typescript
// Request
interface KycSubmissionRequest {
  documentType: 'cedula' | 'passport' | 'driver_license';
  documentNumber: string;
  documentImages: {
    front: string;  // Base64 or URL
    back?: string;  // Base64 or URL
  };
  selfieImage: string;  // Base64 or URL
  additionalInfo?: {
    address?: string;
    occupation?: string;
    monthlyIncome?: string;
  };
}

// Response
interface KycSubmissionResponse {
  submissionId: string;
  status: 'pending' | 'processing';
  estimatedTime: number; // minutes
}
```

### GET /users/activities
Get user activity history.

```typescript
// Request Query Parameters
interface ActivityParams extends PaginationParams {
  type?: 'transaction' | 'login' | 'profile_update' | 'all';
  startDate?: string;
  endDate?: string;
}

// Response
interface UserActivity {
  activityId: string;
  type: string;
  description: string;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

type ActivitiesResponse = PaginatedResponse<UserActivity>;
```

## Payment Service APIs

### POST /payments/wallets
Create or get user wallet.

```typescript
// Response
interface WalletResponse {
  walletId: string;
  userId: string;
  balance: {
    amount: number;
    currency: 'DOP' | 'USD' | 'HTG';
  };
  status: 'active' | 'suspended' | 'closed';
  limits: {
    daily: number;
    monthly: number;
    perTransaction: number;
  };
  createdAt: string;
}
```

### POST /payments/transfer
Transfer money between wallets.

```typescript
// Request
interface TransferRequest {
  fromWalletId?: string;    // Optional, defaults to user's wallet
  toPhoneNumber?: string;   // Either phone or walletId
  toWalletId?: string;
  amount: number;
  currency: 'DOP' | 'USD' | 'HTG';
  description?: string;
  pin?: string;             // Transaction PIN if enabled
}

// Response
interface TransferResponse {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  fee: number;
  totalDebited: number;
  recipient: {
    name: string;
    phoneNumber: string;
  };
  timestamp: string;
  reference: string;
}
```

### POST /payments/topup
Add money to wallet (Cash-in).

```typescript
// Request
interface TopupRequest {
  amount: number;
  currency: 'DOP' | 'USD' | 'HTG';
  method: 'colmado_agent' | 'bank_transfer' | 'card' | 'paypal';
  agentCode?: string;       // For colmado agent topups
  paymentMethodId?: string; // For saved payment methods
}

// Response
interface TopupResponse {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  fee: number;
  totalAmount: number;
  paymentInstructions?: {
    method: string;
    reference: string;
    instructions: string[];
    expiresAt?: string;
  };
  completedAt?: string;
}
```

### POST /payments/withdraw
Withdraw money from wallet (Cash-out).

```typescript
// Request
interface WithdrawRequest {
  amount: number;
  currency: 'DOP' | 'USD' | 'HTG';
  method: 'colmado_agent' | 'bank_transfer';
  agentCode?: string;
  bankAccountId?: string;
  pin: string;
}

// Response
interface WithdrawResponse {
  transactionId: string;
  withdrawalCode: string;   // For agent withdrawals
  status: 'pending' | 'approved' | 'processing' | 'completed';
  amount: number;
  fee: number;
  netAmount: number;
  estimatedTime: string;
  agentLocation?: {
    name: string;
    address: string;
    phone: string;
  };
}
```

### GET /payments/transactions
Get transaction history.

```typescript
// Request Query Parameters
interface TransactionParams extends PaginationParams {
  type?: 'transfer' | 'topup' | 'withdraw' | 'payment' | 'all';
  status?: 'pending' | 'completed' | 'failed' | 'all';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Response
interface Transaction {
  transactionId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  fee: number;
  description: string;
  counterparty?: {
    name: string;
    phoneNumber?: string;
    type: 'user' | 'merchant' | 'agent';
  };
  reference: string;
  createdAt: string;
  completedAt?: string;
}

type TransactionsResponse = PaginatedResponse<Transaction>;
```

### POST /payments/process
Process a payment for goods/services.

```typescript
// Request
interface PaymentRequest {
  merchantId: string;
  amount: number;
  currency: 'DOP' | 'USD' | 'HTG';
  orderId?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: 'wallet' | 'card' | 'paypal' | 'tpago';
  paymentMethodId?: string;
  returnUrl?: string;       // For external payment methods
  webhookUrl?: string;
}

// Response
interface PaymentResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  fee: number;
  netAmount: number;
  paymentUrl?: string;      // For external payment methods
  expiresAt?: string;
  completedAt?: string;
}
```

## Commerce Service APIs

### GET /products
Search and list products.

```typescript
// Request Query Parameters
interface ProductSearchParams extends PaginationParams {
  query?: string;
  category?: string;
  merchantId?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: {
    lat: number;
    lng: number;
    radius: number;         // in kilometers
  };
  inStock?: boolean;
  tags?: string[];
}

// Response
interface Product {
  productId: string;
  merchantId: string;
  merchantName: string;
  name: string;
  description: string;
  category: string;
  price: {
    amount: number;
    currency: string;
    discountedPrice?: number;
  };
  images: string[];
  inStock: boolean;
  stockQuantity?: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

type ProductsResponse = PaginatedResponse<Product>;
```

### GET /products/{productId}
Get product details.

```typescript
// Response
interface ProductDetail extends Product {
  variants?: Array<{
    variantId: string;
    name: string;
    price: number;
    inStock: boolean;
    attributes: Record<string, any>;
  }>;
  specifications?: Record<string, any>;
  merchantInfo: {
    merchantId: string;
    name: string;
    rating: number;
    responseTime: string;
    location: {
      address: string;
      lat: number;
      lng: number;
    };
  };
  relatedProducts?: Product[];
}
```

### POST /orders
Create a new order.

```typescript
// Request
interface CreateOrderRequest {
  merchantId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
    instructions?: string;
  };
  paymentMethod: 'wallet' | 'cash_on_delivery' | 'card';
  scheduledTime?: string;
  notes?: string;
}

// Response
interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';
  totalAmount: number;
  deliveryFee: number;
  tax: number;
  grandTotal: number;
  estimatedTime: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  trackingUrl: string;
}
```

### GET /orders/{orderId}
Get order details.

```typescript
// Response
interface OrderDetail {
  orderId: string;
  orderNumber: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes?: string;
  }>;
  pricing: {
    subtotal: number;
    deliveryFee: number;
    tax: number;
    discount: number;
    total: number;
  };
  merchant: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    method: string;
    address?: string;
    scheduledTime?: string;
    trackingCode?: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### PUT /orders/{orderId}/status
Update order status (merchant).

```typescript
// Request
interface UpdateOrderStatusRequest {
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  reason?: string;           // Required for cancellation
  estimatedTime?: string;    // Updated ETA
}

// Response
interface UpdateOrderStatusResponse {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
  notificationSent: boolean;
}
```

### POST /cart
Manage shopping cart.

```typescript
// Request
interface CartRequest {
  action: 'add' | 'update' | 'remove' | 'clear';
  productId?: string;
  variantId?: string;
  quantity?: number;
  merchantId?: string;       // For multi-merchant cart
}

// Response
interface CartResponse {
  cartId: string;
  items: Array<{
    productId: string;
    productName: string;
    merchantId: string;
    merchantName: string;
    quantity: number;
    price: number;
    subtotal: number;
    image: string;
  }>;
  summary: {
    itemCount: number;
    subtotal: number;
    estimatedTax: number;
    estimatedTotal: number;
  };
  updatedAt: string;
}
```

## Messaging Service APIs

### POST /messaging/whatsapp/send
Send WhatsApp message.

```typescript
// Request
interface WhatsAppMessageRequest {
  to: string;                // Phone number in E.164 format
  type: 'text' | 'template' | 'interactive' | 'media';
  text?: {
    body: string;
    previewUrl?: boolean;
  };
  template?: {
    name: string;
    language: 'es' | 'ht';
    components?: Array<{
      type: 'body' | 'header';
      parameters: Array<{
        type: 'text' | 'image' | 'document';
        text?: string;
        image?: { link: string };
        document?: { link: string; filename: string };
      }>;
    }>;
  };
  interactive?: {
    type: 'button' | 'list';
    body: { text: string };
    action: any;             // WhatsApp interactive format
  };
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    caption?: string;
    filename?: string;
  };
}

// Response
interface WhatsAppMessageResponse {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorMessage?: string;
}
```

### POST /messaging/sms/send
Send SMS message.

```typescript
// Request
interface SmsRequest {
  to: string;                // Phone number
  message: string;
  priority: 'high' | 'normal';
  scheduledTime?: string;
}

// Response
interface SmsResponse {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed';
  cost: number;
  segments: number;
  errorMessage?: string;
}
```

### GET /messaging/templates
Get message templates.

```typescript
// Request Query Parameters
interface TemplateParams {
  channel: 'whatsapp' | 'sms';
  language?: 'es-DO' | 'ht';
  category?: 'transactional' | 'marketing' | 'authentication';
}

// Response
interface MessageTemplate {
  templateId: string;
  name: string;
  channel: string;
  language: string;
  category: string;
  status: 'approved' | 'pending' | 'rejected';
  components: Array<{
    type: string;
    text: string;
    variables?: string[];
  }>;
  example?: any;
}
```

## AI Service APIs

### POST /ai/chat
Process chat message with AI.

```typescript
// Request
interface AiChatRequest {
  message: string;
  context?: {
    userId?: string;
    sessionId?: string;
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  };
  language: 'es-DO' | 'ht';
  intent?: 'general' | 'commerce' | 'support' | 'financial';
}

// Response
interface AiChatResponse {
  response: string;
  intent: {
    primary: string;
    confidence: number;
    entities?: Record<string, any>;
  };
  suggestedActions?: Array<{
    type: string;
    label: string;
    action: any;
  }>;
  requiresHuman?: boolean;
}
```

### POST /ai/recommendations
Get personalized recommendations.

```typescript
// Request
interface RecommendationRequest {
  userId: string;
  type: 'products' | 'services' | 'merchants' | 'mixed';
  context?: {
    location?: { lat: number; lng: number };
    timeOfDay?: string;
    recentActivity?: string[];
  };
  limit?: number;
}

// Response
interface RecommendationResponse {
  recommendations: Array<{
    type: string;
    id: string;
    title: string;
    description: string;
    score: number;
    reason: string;
    metadata: any;
  }>;
  personalizationScore: number;
}
```

### POST /ai/credit-score
Calculate alternative credit score.

```typescript
// Request
interface CreditScoreRequest {
  userId: string;
  consentToken: string;      // User consent for data analysis
  dataPoints?: {
    transactionHistory?: boolean;
    socialConnections?: boolean;
    businessActivity?: boolean;
    utilityPayments?: boolean;
  };
}

// Response
interface CreditScoreResponse {
  scoreId: string;
  score: number;             // 0-1000
  tier: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
  recommendations: string[];
  creditLimit: {
    amount: number;
    currency: string;
  };
  calculatedAt: string;
  expiresAt: string;
}
```

### POST /ai/fraud-check
Check transaction for fraud.

```typescript
// Request
interface FraudCheckRequest {
  transactionId: string;
  userId: string;
  amount: number;
  type: 'payment' | 'transfer' | 'withdrawal';
  metadata: {
    ip?: string;
    deviceId?: string;
    location?: { lat: number; lng: number };
    recipientId?: string;
  };
}

// Response
interface FraudCheckResponse {
  riskScore: number;         // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: 'approve' | 'review' | 'decline';
  requiresVerification?: {
    method: 'otp' | 'biometric' | 'document';
    reason: string;
  };
}
```

## Voice Service APIs

### POST /voice/recognize
Convert speech to text.

```typescript
// Request
interface VoiceRecognitionRequest {
  audio: string;             // Base64 encoded audio
  format: 'wav' | 'mp3' | 'webm';
  language: 'es-DO' | 'ht';
  context?: {
    expectedCommands?: string[];
    previousTranscript?: string;
  };
}

// Response
interface VoiceRecognitionResponse {
  transcript: string;
  confidence: number;
  language: string;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  intent?: {
    command: string;
    parameters: Record<string, any>;
  };
}
```

### POST /voice/synthesize
Convert text to speech.

```typescript
// Request
interface VoiceSynthesisRequest {
  text: string;
  language: 'es-DO' | 'ht';
  voice?: 'male' | 'female';
  speed?: number;            // 0.5 - 2.0
  format?: 'mp3' | 'wav';
}

// Response
interface VoiceSynthesisResponse {
  audio: string;             // Base64 encoded audio
  duration: number;          // in seconds
  format: string;
}
```

### POST /voice/command
Process voice command.

```typescript
// Request
interface VoiceCommandRequest {
  audio: string;             // Base64 encoded
  userId: string;
  sessionId: string;
  context?: {
    currentScreen?: string;
    allowedActions?: string[];
  };
}

// Response
interface VoiceCommandResponse {
  command: string;
  parameters: Record<string, any>;
  action: {
    type: 'navigate' | 'search' | 'transaction' | 'help';
    target: string;
    data?: any;
  };
  confirmation?: {
    required: boolean;
    message: string;
    options: string[];
  };
  response: {
    text: string;
    audio?: string;          // Base64 TTS response
  };
}
```

## Notification Service APIs

### POST /notifications/send
Send notification to user.

```typescript
// Request
interface NotificationRequest {
  userId: string;
  type: 'transaction' | 'order' | 'promotion' | 'system';
  priority: 'high' | 'normal' | 'low';
  channels: Array<'whatsapp' | 'sms' | 'push' | 'email'>;
  content: {
    title: string;
    body: string;
    data?: Record<string, any>;
    action?: {
      type: string;
      url?: string;
      deepLink?: string;
    };
  };
  scheduling?: {
    sendAt?: string;
    timezone?: string;
    respectQuietHours?: boolean;
  };
}

// Response
interface NotificationResponse {
  notificationId: string;
  status: 'sent' | 'scheduled' | 'failed';
  channels: Array<{
    channel: string;
    status: string;
    messageId?: string;
    error?: string;
  }>;
  scheduledTime?: string;
}
```

### GET /notifications/preferences
Get user notification preferences.

```typescript
// Response
interface NotificationPreferences {
  userId: string;
  channels: {
    whatsapp: {
      enabled: boolean;
      types: string[];
    };
    sms: {
      enabled: boolean;
      types: string[];
      quietHours?: {
        start: string;
        end: string;
      };
    };
    push: {
      enabled: boolean;
      types: string[];
    };
    email: {
      enabled: boolean;
      types: string[];
      frequency?: 'instant' | 'daily' | 'weekly';
    };
  };
  language: 'es-DO' | 'ht';
  timezone: string;
}
```

### PUT /notifications/preferences
Update notification preferences.

```typescript
// Request
interface UpdatePreferencesRequest {
  channels?: {
    whatsapp?: {
      enabled?: boolean;
      types?: string[];
    };
    sms?: {
      enabled?: boolean;
      types?: string[];
      quietHours?: {
        start: string;
        end: string;
      };
    };
    push?: {
      enabled?: boolean;
      types?: string[];
    };
    email?: {
      enabled?: boolean;
      types?: string[];
      frequency?: 'instant' | 'daily' | 'weekly';
    };
  };
  language?: 'es-DO' | 'ht';
  timezone?: string;
}

// Response
interface UpdatePreferencesResponse {
  preferences: NotificationPreferences;
  updated: boolean;
}
```

## WhatsApp Webhook APIs

### POST /webhooks/whatsapp/messages
Receive incoming WhatsApp messages.

```typescript
// Webhook Payload
interface WhatsAppWebhook {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'interactive';
          text?: { body: string };
          image?: { id: string; mime_type: string; caption?: string };
          document?: { id: string; mime_type: string; filename?: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string; caption?: string };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
          interactive?: {
            type: 'button_reply' | 'list_reply';
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
          context?: {
            from: string;
            id: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
    }>;
  }>;
}

// Response (must be immediate)
interface WebhookResponse {
  success: boolean;
}
```

### GET /webhooks/whatsapp/verify
Verify webhook endpoint (WhatsApp requirement).

```typescript
// Query Parameters
interface VerifyParams {
  'hub.mode': string;
  'hub.challenge': string;
  'hub.verify_token': string;
}

// Response
// Return the hub.challenge value as plain text
```

## Rate Limiting

All APIs implement rate limiting:

```yaml
public_endpoints:
  - /auth/register: 5 requests per hour per IP
  - /auth/login: 10 requests per hour per IP
  
authenticated_endpoints:
  - Default: 1000 requests per hour per user
  - AI endpoints: 100 requests per hour per user
  - Payment endpoints: 500 requests per hour per user
  
webhook_endpoints:
  - No rate limiting (must handle provider's rate)
```

## API Versioning

- Version in URL path: `/v1/`, `/v2/`
- Sunset policy: 6 months deprecation notice
- Version header: `X-API-Version`
- Backward compatibility for minor versions

## Security Requirements

1. **Authentication**: Bearer token (JWT) required for all protected endpoints
2. **HTTPS**: TLS 1.3 required for all production traffic
3. **CORS**: Configured for specific domains only
4. **Input Validation**: All inputs validated and sanitized
5. **Rate Limiting**: Implemented at API Gateway level
6. **Audit Logging**: All API calls logged with request/response metadata

## Error Handling

All errors follow standard format:

```json
{
  "success": false,
  "error": {
    "code": "3001",
    "message": "Insufficient balance for transaction",
    "details": {
      "required": 500.00,
      "available": 250.00,
      "currency": "DOP"
    }
  },
  "metadata": {
    "timestamp": "2025-01-28T10:30:00Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0"
  }
}
```

## Testing

All APIs must include:
- Unit tests with > 80% coverage
- Integration tests for critical paths
- Load tests for performance validation
- Security tests for authentication/authorization

---

*This API contract serves as the source of truth for all service interactions within the WhatsOpí platform.*