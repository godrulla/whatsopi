# WhatsOpí System Architecture

## Executive Summary

WhatsOpí is a comprehensive AI-powered digital platform designed to foster digital inclusion and economic empowerment within the Dominican Republic's informal economy. The architecture leverages a hybrid PWA + Voice Interface approach with WhatsApp Business API as the primary channel, supporting 100K+ concurrent users while maintaining offline-first capabilities and compliance with Dominican Law 172-13.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Architecture Principles](#core-architecture-principles)
3. [System Components](#system-components)
4. [Technology Stack](#technology-stack)
5. [Deployment Architecture](#deployment-architecture)
6. [Data Architecture](#data-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Scalability Strategy](#scalability-strategy)
9. [Performance Architecture](#performance-architecture)
10. [Security Architecture](#security-architecture)

## Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[Progressive Web App]
        WA[WhatsApp Client]
        Voice[Voice Interface]
        SMS[SMS Gateway]
    end
    
    subgraph "API Gateway Layer"
        AG[API Gateway<br/>Kong/AWS API Gateway]
        LB[Load Balancer<br/>AWS ALB/CloudFront]
    end
    
    subgraph "Application Services"
        AS[Auth Service]
        US[User Service]
        PS[Payment Service]
        MS[Messaging Service]
        CS[Commerce Service]
        AIS[AI Service]
        VS[Voice Service]
        NS[Notification Service]
    end
    
    subgraph "AI/ML Layer"
        NLP[NLP Engine<br/>Claude/Custom Models]
        REC[Recommendation Engine]
        CREDIT[Credit Scoring]
        FRAUD[Fraud Detection]
    end
    
    subgraph "Integration Layer"
        WBA[WhatsApp Business API]
        PP[PayPal Integration]
        TP[tPago Integration]
        BANK[Banking APIs]
        SMS_GW[SMS Gateway]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary DB)]
        REDIS[(Redis<br/>Cache)]
        ES[(Elasticsearch<br/>Search)]
        S3[(S3<br/>Object Storage)]
        DW[(Data Warehouse<br/>BigQuery)]
    end
    
    subgraph "Infrastructure"
        K8S[Kubernetes Cluster]
        MQ[Message Queue<br/>RabbitMQ/SQS]
        MONITORING[Monitoring<br/>Prometheus/Grafana]
    end
    
    PWA --> LB
    WA --> WBA
    Voice --> VS
    SMS --> SMS_GW
    
    LB --> AG
    AG --> AS & US & PS & MS & CS & AIS & VS & NS
    
    AS & US & PS & MS & CS --> PG
    AS & US & PS & MS & CS --> REDIS
    CS --> ES
    
    AIS --> NLP & REC & CREDIT & FRAUD
    MS --> WBA
    PS --> PP & TP & BANK
    NS --> SMS_GW & WBA
    
    All Services --> MQ
    All Services --> K8S
    All Data --> DW
```

## Core Architecture Principles

### 1. Offline-First Design
- **Local-First Data**: All critical operations work offline with automatic sync
- **Service Workers**: Background sync for all API calls
- **IndexedDB**: Local storage for user data, transactions, and cached content
- **Optimistic UI**: Immediate feedback with background processing

### 2. Mobile-First & Progressive Enhancement
- **PWA Architecture**: Single codebase for all platforms
- **Responsive Design**: Optimized for feature phones to smartphones
- **Progressive Loading**: Core features load first, enhanced features lazy-loaded
- **Minimal Bundle Size**: < 50KB initial load for 2G networks

### 3. WhatsApp-Centric Integration
- **Primary Channel**: 82% of users prefer WhatsApp for commerce
- **Natural Language Interface**: All features accessible via chat
- **Rich Media Support**: Product catalogs, payment links, voice notes
- **Automated Workflows**: Order tracking, payment confirmations, support

### 4. Multi-Language Architecture
- **Primary Languages**: Dominican Spanish, Haitian Creole
- **Contextual Translation**: Regional dialect support
- **Voice-First**: Support for low-literacy users
- **Cultural Localization**: Date formats, currency, cultural nuances

### 5. Colmado-as-a-Hub Model
- **Agent Network**: Colmados serve as CICO points
- **Trusted Intermediaries**: Bridge for non-smartphone users
- **Local Commerce**: Integration with existing colmado operations
- **Community Trust**: Leverage existing relationships

## System Components

### Frontend Components

#### Progressive Web App (PWA)
```typescript
// Core PWA Architecture
interface PWAArchitecture {
  framework: "React 18+ with Next.js 14";
  stateManagement: "Zustand + React Query";
  styling: "Tailwind CSS + CSS Modules";
  offline: "Workbox + Service Workers";
  storage: "IndexedDB + LocalStorage";
  routing: "Next.js App Router";
  optimization: {
    bundleSize: "< 50KB initial";
    lazyLoading: "React.lazy + Suspense";
    codeSpitting: "Route-based + Component-based";
    imageOptimization: "Next/Image + WebP";
  };
}
```

#### Voice Interface
```typescript
interface VoiceArchitecture {
  speechRecognition: "Web Speech API + Custom Models";
  tts: "AWS Polly + Local TTS";
  nlp: "Claude API + Custom Dominican/Creole Models";
  commands: {
    commerce: ["buscar producto", "hacer pedido", "ver precios"];
    payments: ["enviar dinero", "revisar balance", "pagar factura"];
    support: ["ayuda", "hablar con agente", "reportar problema"];
  };
}
```

### Backend Microservices

#### Authentication Service
- **Technology**: Node.js + Express + TypeScript
- **Auth Methods**: JWT + OAuth2 + WhatsApp OTP
- **Session Management**: Redis-backed sessions
- **Security**: PBKDF2 hashing, rate limiting, 2FA

#### User Service
- **Profile Management**: User profiles, preferences, KYC
- **Digital Identity**: Verifiable credentials, reputation scores
- **Privacy Controls**: GDPR-compliant data management
- **Activity Tracking**: Transaction history, usage analytics

#### Payment Service
- **Payment Processors**: PayPal, tPago, traditional cards
- **Wallet System**: Internal wallet with cash-in/cash-out
- **Transaction Processing**: ACID compliance, idempotency
- **Settlement**: Daily batch processing, reconciliation

#### Commerce Service
- **Product Catalog**: Multi-vendor marketplace
- **Order Management**: Order lifecycle, tracking, fulfillment
- **Inventory**: Real-time stock management
- **Pricing**: Dynamic pricing, promotions, bulk discounts

#### AI Service
- **NLP Processing**: Text and voice analysis
- **Recommendations**: Personalized product/service suggestions
- **Credit Scoring**: Alternative credit assessment
- **Fraud Detection**: Real-time transaction monitoring

#### Messaging Service
- **WhatsApp Integration**: Business API, template management
- **SMS Gateway**: Fallback for non-WhatsApp users
- **Push Notifications**: PWA push notifications
- **Email**: Transactional emails, receipts

#### Voice Service
- **Speech-to-Text**: Real-time transcription
- **Text-to-Speech**: Multi-language synthesis
- **Dialog Management**: Conversation state management
- **Command Processing**: Intent recognition, entity extraction

#### Notification Service
- **Multi-Channel**: WhatsApp, SMS, Push, Email
- **Priority Queue**: Critical vs. non-critical notifications
- **Batching**: Intelligent notification grouping
- **Preferences**: User notification preferences

## Technology Stack

### Frontend Stack
```yaml
framework: Next.js 14 (App Router)
language: TypeScript 5.x
ui_library: React 18
state: Zustand + React Query
styling: Tailwind CSS 3.x
pwa: next-pwa + Workbox
voice: Web Speech API
storage: IndexedDB + LocalStorage
testing: Vitest + React Testing Library
```

### Backend Stack
```yaml
runtime: Node.js 20 LTS
language: TypeScript 5.x
framework: Express.js + Fastify (high-performance routes)
database: PostgreSQL 15 + Redis 7
orm: Prisma 5
queue: Bull (Redis-based)
search: Elasticsearch 8
storage: AWS S3 / MinIO
monitoring: Prometheus + Grafana
logging: Winston + ELK Stack
```

### AI/ML Stack
```yaml
llm: Anthropic Claude (Opus 4)
custom_nlp: 
  - ALIA (Spanish dialects)
  - Custom Haitian Creole models
ml_framework: TensorFlow.js + Python services
vector_db: Pinecone / Weaviate
rag: LangChain + Custom implementation
```

### Infrastructure Stack
```yaml
container: Docker + Kubernetes
cloud: AWS (primary) + GCP (DR)
cdn: CloudFront + Cloudflare
ci_cd: GitHub Actions + ArgoCD
iac: Terraform + Helm
secrets: AWS Secrets Manager + Kubernetes Secrets
```

## Deployment Architecture

### Multi-Region Setup
```yaml
primary_region: us-east-1 (Virginia)
secondary_region: us-east-2 (Ohio)
edge_locations:
  - Miami (closest to DR)
  - Atlanta
  - Dallas
  
latency_targets:
  - Dominican Republic: < 50ms
  - Haiti: < 70ms
  - Regional: < 100ms
```

### Kubernetes Architecture
```yaml
clusters:
  production:
    nodes: 20-50 (auto-scaling)
    instance_types: 
      - t3.large (general workloads)
      - c5.xlarge (compute-intensive)
      - r5.large (memory-intensive)
    
  staging:
    nodes: 5-10
    instance_types: t3.medium
    
namespaces:
  - whatsopi-prod
  - whatsopi-staging
  - whatsopi-monitoring
  - whatsopi-ml
```

### CDN & Edge Computing
```yaml
cloudfront:
  origins:
    - ALB (dynamic content)
    - S3 (static assets)
  behaviors:
    - /api/* → ALB
    - /static/* → S3
    - /* → ALB with caching
    
edge_functions:
  - A/B testing
  - Geo-routing
  - Request validation
  - Security headers
```

## Data Architecture

### Primary Database (PostgreSQL)
```sql
-- Partitioning Strategy
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE,
    -- other fields
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE transactions_2025_01 PARTITION OF transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Caching Strategy
```yaml
redis_layers:
  l1_cache:
    ttl: 5 minutes
    data: session, hot data
    
  l2_cache:
    ttl: 1 hour
    data: user profiles, product catalog
    
  l3_cache:
    ttl: 24 hours
    data: static content, translations
    
patterns:
  - cache-aside
  - write-through
  - write-behind (async)
```

### Search Architecture
```yaml
elasticsearch:
  indices:
    - products: 10 shards, 2 replicas
    - users: 5 shards, 2 replicas
    - transactions: 20 shards, 1 replica
    
  analyzers:
    - spanish_analyzer: custom Dominican Spanish
    - creole_analyzer: custom Haitian Creole
    - phonetic_analyzer: for voice search
```

## Integration Architecture

### WhatsApp Business API
```typescript
interface WhatsAppIntegration {
  provider: "Twilio" | "360Dialog" | "Meta Cloud API";
  features: {
    messaging: {
      templates: boolean;
      interactive: boolean;
      media: boolean;
      location: boolean;
    };
    commerce: {
      catalog: boolean;
      cart: boolean;
      payments: boolean;
    };
  };
  webhooks: {
    messages: "/webhook/whatsapp/messages";
    status: "/webhook/whatsapp/status";
    errors: "/webhook/whatsapp/errors";
  };
}
```

### Payment Gateway Integration
```typescript
interface PaymentIntegration {
  providers: {
    paypal: {
      api: "REST API v2";
      features: ["checkout", "subscriptions", "payouts"];
    };
    tpago: {
      api: "Custom API";
      features: ["mobile_money", "bank_transfer", "cards"];
    };
    cards: {
      processor: "Stripe" | "PaymentGateway";
      features: ["tokenization", "3ds", "recurring"];
    };
  };
}
```

## Scalability Strategy

### Horizontal Scaling
```yaml
microservices:
  auth_service:
    min_replicas: 3
    max_replicas: 20
    cpu_threshold: 70%
    memory_threshold: 80%
    
  commerce_service:
    min_replicas: 5
    max_replicas: 50
    cpu_threshold: 60%
    memory_threshold: 70%
    
  ai_service:
    min_replicas: 2
    max_replicas: 10
    gpu_enabled: true
    scaling_policy: predictive
```

### Database Scaling
```yaml
postgresql:
  read_replicas: 3-10 (auto-scaling)
  connection_pooling: PgBouncer
  partitioning: time-based (monthly)
  archival: 2 years online, 5 years cold storage

redis:
  cluster_mode: enabled
  shards: 3-10
  replicas_per_shard: 2
  auto_failover: enabled
```

### Queue Scaling
```yaml
message_queue:
  type: RabbitMQ / AWS SQS
  queues:
    high_priority:
      workers: 10-50
      prefetch: 1
      
    normal_priority:
      workers: 20-100
      prefetch: 10
      
    bulk_operations:
      workers: 5-20
      prefetch: 100
```

## Performance Architecture

### Optimization Strategies
```yaml
frontend:
  - Code splitting by route
  - Lazy loading for below-fold content
  - Image optimization (WebP, AVIF)
  - Service Worker caching
  - HTTP/2 Push for critical resources
  
backend:
  - Database query optimization
  - Result caching at multiple levels
  - Connection pooling
  - Async processing for heavy operations
  - GraphQL for efficient data fetching
  
infrastructure:
  - CDN for static assets
  - Edge computing for personalization
  - Auto-scaling based on metrics
  - Resource pre-warming
```

### Performance Targets
```yaml
response_times:
  api_p50: < 100ms
  api_p95: < 500ms
  api_p99: < 1000ms
  
page_load:
  first_contentful_paint: < 1.5s
  time_to_interactive: < 3s
  largest_contentful_paint: < 2.5s
  
availability:
  uptime_target: 99.9%
  rto: < 1 hour
  rpo: < 15 minutes
```

## Security Architecture

### Security Layers
```yaml
network:
  - AWS WAF for DDoS protection
  - VPC with private subnets
  - Network ACLs and Security Groups
  - TLS 1.3 for all communications
  
application:
  - JWT with refresh tokens
  - Rate limiting per user/IP
  - Input validation and sanitization
  - OWASP Top 10 protection
  
data:
  - Encryption at rest (AES-256)
  - Encryption in transit (TLS 1.3)
  - Field-level encryption for PII
  - Key rotation every 90 days
  
compliance:
  - Dominican Law 172-13 compliance
  - GDPR-ready architecture
  - PCI DSS for payment processing
  - SOC 2 Type II controls
```

### Access Control
```yaml
rbac:
  roles:
    - super_admin: full system access
    - colmado_agent: CICO operations
    - merchant: product management
    - customer: basic operations
    
  permissions:
    - granular API-level permissions
    - resource-based access control
    - temporal access (time-bound)
    - geographic restrictions
```

## Monitoring & Observability

### Metrics & Logging
```yaml
metrics:
  - Prometheus for system metrics
  - Custom business metrics
  - Real-time dashboards (Grafana)
  - Alert thresholds and escalation
  
logging:
  - Centralized logging (ELK Stack)
  - Structured logging (JSON)
  - Log retention: 30 days hot, 1 year cold
  - Audit logs for compliance
  
tracing:
  - Distributed tracing (Jaeger)
  - Request correlation IDs
  - Performance profiling
  - Error tracking (Sentry)
```

## Disaster Recovery

### Backup Strategy
```yaml
databases:
  - Continuous replication to secondary region
  - Point-in-time recovery (7 days)
  - Daily snapshots (30 days retention)
  - Monthly archives (5 years)
  
files:
  - S3 cross-region replication
  - Versioning enabled
  - Lifecycle policies for archival
  
configurations:
  - Git-based config management
  - Encrypted secrets backup
  - Infrastructure as Code
```

### Recovery Procedures
```yaml
scenarios:
  regional_failure:
    rto: 15 minutes
    procedure: DNS failover to secondary region
    
  data_corruption:
    rto: 1 hour
    procedure: Point-in-time recovery
    
  security_breach:
    rto: 30 minutes
    procedure: Isolate, assess, restore from clean backup
```

## Architecture Decision Records (ADRs)

### ADR-001: PWA + Voice Interface Hybrid
**Decision**: Implement a Progressive Web App with integrated Voice UI
**Rationale**: 
- Single codebase for all platforms
- Offline-first capabilities essential for rural areas
- Voice interface critical for low-literacy users
- No app store friction for distribution

### ADR-002: WhatsApp as Primary Channel
**Decision**: WhatsApp Business API as the primary user interface
**Rationale**:
- 82% of DR households use WhatsApp for commerce
- Familiar interface reduces learning curve
- Rich media and interactive features
- Built-in end-to-end encryption

### ADR-003: Microservices Architecture
**Decision**: Decompose into domain-driven microservices
**Rationale**:
- Independent scaling of components
- Technology diversity where beneficial
- Fault isolation and resilience
- Team autonomy and parallel development

### ADR-004: Multi-Model AI Strategy
**Decision**: Combine Claude with specialized language models
**Rationale**:
- Claude for general reasoning and Spanish
- Custom models for Dominican Spanish and Haitian Creole
- RAG for domain-specific accuracy
- Cost optimization through model selection

### ADR-005: Colmados as Agent Network
**Decision**: Leverage colmados as physical touchpoints
**Rationale**:
- Existing trust relationships
- Cash-in/cash-out infrastructure
- Bridge for non-smartphone users
- Community presence and local knowledge

## Next Steps

1. Review and approve architecture with stakeholders
2. Create detailed API contracts (see API_CONTRACTS.md)
3. Design database schemas (see DATABASE_SCHEMAS.md)
4. Define infrastructure requirements (see INFRASTRUCTURE_REQUIREMENTS.md)
5. Prepare security architecture handover (see HANDOVER_TO_SECURITY.md)

---

*This architecture is designed to serve 100,000+ concurrent users while maintaining sub-second response times, 99.9% uptime, and full compliance with Dominican regulations.*