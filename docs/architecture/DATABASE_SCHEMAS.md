# WhatsOpí Database Schemas

## Overview

This document defines all database schemas for WhatsOpí's microservices. The system uses PostgreSQL as the primary database with proper partitioning, indexing, and optimization strategies for handling 100K+ concurrent users.

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Common Patterns](#common-patterns)
3. [User Domain Schemas](#user-domain-schemas)
4. [Payment Domain Schemas](#payment-domain-schemas)
5. [Commerce Domain Schemas](#commerce-domain-schemas)
6. [Messaging Domain Schemas](#messaging-domain-schemas)
7. [AI/ML Domain Schemas](#aiml-domain-schemas)
8. [Audit & Analytics Schemas](#audit--analytics-schemas)
9. [Indexing Strategy](#indexing-strategy)
10. [Partitioning Strategy](#partitioning-strategy)

## Database Architecture

### Database Separation
```yaml
databases:
  whatsopi_users:
    purpose: User management, authentication, profiles
    size_estimate: 10GB initially, 100GB at scale
    
  whatsopi_payments:
    purpose: Financial transactions, wallets, settlements
    size_estimate: 50GB initially, 500GB at scale
    
  whatsopi_commerce:
    purpose: Products, orders, merchants
    size_estimate: 20GB initially, 200GB at scale
    
  whatsopi_messaging:
    purpose: Message history, templates, webhooks
    size_estimate: 100GB initially, 1TB at scale
    
  whatsopi_ai:
    purpose: AI interactions, credit scores, recommendations
    size_estimate: 30GB initially, 300GB at scale
    
  whatsopi_analytics:
    purpose: Events, metrics, reporting
    size_estimate: 200GB initially, 2TB at scale
```

### Common Data Types
```sql
-- Custom types used across schemas
CREATE TYPE user_type AS ENUM ('customer', 'merchant', 'colmado_agent', 'admin');
CREATE TYPE language_code AS ENUM ('es-DO', 'ht', 'en');
CREATE TYPE currency_code AS ENUM ('DOP', 'USD', 'HTG');
CREATE TYPE kyc_status AS ENUM ('none', 'pending', 'verified', 'rejected', 'expired');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
```

## Common Patterns

### Base Entity Fields
All tables include these common fields:
```sql
-- Common fields for all tables
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
is_deleted BOOLEAN DEFAULT FALSE,
deleted_at TIMESTAMPTZ,
version INTEGER DEFAULT 1  -- For optimistic locking
```

### Audit Trail Function
```sql
-- Function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_[table_name]_updated_at 
    BEFORE UPDATE ON [table_name] 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## User Domain Schemas

### users
Core user account information.
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),  -- NULL for WhatsApp-only users
    full_name VARCHAR(255) NOT NULL,
    user_type user_type NOT NULL DEFAULT 'customer',
    preferred_language language_code NOT NULL DEFAULT 'es-DO',
    kyc_status kyc_status DEFAULT 'none',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    CONSTRAINT valid_phone CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_phone ON users(phone_number) WHERE is_active = TRUE;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL AND is_active = TRUE;
CREATE INDEX idx_users_type ON users(user_type) WHERE is_active = TRUE;
CREATE INDEX idx_users_referral ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_users_kyc_status ON users(kyc_status) WHERE kyc_status != 'none';
```

### user_profiles
Extended user profile information.
```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20),
    national_id VARCHAR(50),
    national_id_type VARCHAR(20), -- 'cedula', 'passport', 'driver_license'
    address JSONB DEFAULT '{}', -- {street, city, province, postal_code, coordinates}
    occupation VARCHAR(100),
    monthly_income_range VARCHAR(50),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    business_registration VARCHAR(100),
    profile_image_url VARCHAR(500),
    bio TEXT,
    social_links JSONB DEFAULT '{}', -- {facebook, instagram, whatsapp_business}
    preferences JSONB DEFAULT '{}', -- {notifications, privacy, display}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### user_kyc_documents
KYC documentation storage.
```sql
CREATE TABLE user_kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'id_front', 'id_back', 'selfie', 'proof_of_address'
    document_url VARCHAR(500) NOT NULL,
    document_hash VARCHAR(64) NOT NULL, -- SHA-256 for integrity
    verification_status kyc_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    expires_at DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_active_document UNIQUE (user_id, document_type, verification_status) 
        WHERE verification_status = 'verified'
);

CREATE INDEX idx_kyc_user_status ON user_kyc_documents(user_id, verification_status);
CREATE INDEX idx_kyc_expires ON user_kyc_documents(expires_at) WHERE verification_status = 'verified';
```

### user_sessions
Active user sessions management.
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    device_info JSONB DEFAULT '{}', -- {type, os, browser, app_version}
    ip_address INET,
    location JSONB DEFAULT '{}', -- {country, city, coordinates}
    user_agent TEXT,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_session CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user_active ON user_sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token_hash) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;
```

### user_digital_identity
Digital reputation and identity scores.
```sql
CREATE TABLE user_digital_identity (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reputation_score DECIMAL(3,2) DEFAULT 0.00 CHECK (reputation_score >= 0 AND reputation_score <= 5),
    trust_level INTEGER DEFAULT 1 CHECK (trust_level >= 1 AND trust_level <= 5),
    verification_level INTEGER DEFAULT 0, -- 0: none, 1: phone, 2: email, 3: KYC, 4: business
    transaction_count INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    dispute_count INTEGER DEFAULT 0,
    member_since DATE NOT NULL DEFAULT CURRENT_DATE,
    badges JSONB DEFAULT '[]', -- [{type, earned_at, expires_at}]
    achievements JSONB DEFAULT '[]',
    risk_score DECIMAL(3,2) DEFAULT 0.50, -- 0-1, lower is better
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digital_identity_reputation ON user_digital_identity(reputation_score);
CREATE INDEX idx_digital_identity_risk ON user_digital_identity(risk_score);
```

## Payment Domain Schemas

### wallets
User wallet accounts.
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wallet_number VARCHAR(20) UNIQUE NOT NULL, -- Generated unique identifier
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    currency currency_code NOT NULL DEFAULT 'DOP',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'closed'
    pin_hash VARCHAR(255), -- Optional transaction PIN
    daily_limit DECIMAL(10,2) DEFAULT 50000.00,
    monthly_limit DECIMAL(10,2) DEFAULT 500000.00,
    per_transaction_limit DECIMAL(10,2) DEFAULT 20000.00,
    total_in DECIMAL(15,2) DEFAULT 0.00,
    total_out DECIMAL(15,2) DEFAULT 0.00,
    last_transaction_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    failed_pin_attempts INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    CONSTRAINT unique_user_currency UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_number ON wallets(wallet_number);
CREATE INDEX idx_wallets_status ON wallets(status) WHERE status != 'closed';
```

### transactions
All financial transactions.
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'transfer', 'payment', 'topup', 'withdrawal', 'fee', 'refund'
    status transaction_status NOT NULL DEFAULT 'pending',
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency currency_code NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0.00,
    
    -- Source and destination
    source_wallet_id UUID REFERENCES wallets(id),
    source_user_id UUID REFERENCES users(id),
    destination_wallet_id UUID REFERENCES wallets(id),
    destination_user_id UUID REFERENCES users(id),
    
    -- External payment info
    external_payment_method VARCHAR(50), -- 'paypal', 'tpago', 'card', 'bank'
    external_reference VARCHAR(100),
    external_status VARCHAR(50),
    
    -- Transaction details
    description TEXT,
    notes TEXT,
    category VARCHAR(50),
    
    -- Processing info
    processed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    reversed_at TIMESTAMPTZ,
    reversal_transaction_id UUID REFERENCES transactions(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    device_id VARCHAR(255),
    location JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE transactions_2025_01 PARTITION OF transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE transactions_2025_02 PARTITION OF transactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for all months...

CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_source_user ON transactions(source_user_id, created_at DESC);
CREATE INDEX idx_transactions_dest_user ON transactions(destination_user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_transactions_type_date ON transactions(type, created_at DESC);
```

### payment_methods
Saved payment methods.
```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'card', 'bank_account', 'paypal', 'tpago'
    provider VARCHAR(50) NOT NULL,
    
    -- Card details (tokenized)
    card_token VARCHAR(255),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Bank account
    bank_name VARCHAR(100),
    account_number_masked VARCHAR(50),
    account_type VARCHAR(20),
    
    -- Digital wallet
    wallet_email VARCHAR(255),
    wallet_phone VARCHAR(20),
    
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT one_default_per_user UNIQUE (user_id, is_default) WHERE is_default = TRUE
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id) WHERE is_default = TRUE;
```

### transaction_limits
Custom transaction limits per user.
```sql
CREATE TABLE transaction_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'per_transaction'
    limit_amount DECIMAL(12,2) NOT NULL,
    currency currency_code NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    reason TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (effective_until IS NULL OR effective_until > effective_from),
    CONSTRAINT unique_active_limit UNIQUE (user_id, wallet_id, limit_type, currency) 
        WHERE effective_until IS NULL
);

CREATE INDEX idx_limits_user ON transaction_limits(user_id);
CREATE INDEX idx_limits_wallet ON transaction_limits(wallet_id);
CREATE INDEX idx_limits_active ON transaction_limits(effective_from, effective_until);
```

### settlements
Daily settlement batches.
```sql
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_date DATE NOT NULL,
    merchant_id UUID REFERENCES users(id),
    total_transactions INTEGER NOT NULL,
    gross_amount DECIMAL(15,2) NOT NULL,
    total_fees DECIMAL(12,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,
    currency currency_code NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    bank_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_daily_settlement UNIQUE (settlement_date, merchant_id, currency)
);

CREATE INDEX idx_settlements_merchant_date ON settlements(merchant_id, settlement_date DESC);
CREATE INDEX idx_settlements_status ON settlements(status) WHERE status = 'pending';
```

## Commerce Domain Schemas

### merchants
Merchant account information.
```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    registration_number VARCHAR(100),
    tax_id VARCHAR(50),
    description TEXT,
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    
    -- Location
    address JSONB NOT NULL, -- {street, city, province, postal_code}
    coordinates POINT,
    delivery_radius_km DECIMAL(5,2),
    
    -- Business hours
    business_hours JSONB DEFAULT '{}', -- {monday: {open: "08:00", close: "20:00"}}
    timezone VARCHAR(50) DEFAULT 'America/Santo_Domingo',
    
    -- Settings
    accepts_orders BOOLEAN DEFAULT TRUE,
    minimum_order_amount DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    preparation_time_minutes INTEGER DEFAULT 30,
    
    -- Ratings
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'closed'
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_user ON merchants(user_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_location ON merchants USING GIST(coordinates);
CREATE INDEX idx_merchants_rating ON merchants(rating DESC) WHERE status = 'active';
```

### products
Product catalog.
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    compare_at_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    currency currency_code DEFAULT 'DOP',
    tax_rate DECIMAL(4,2) DEFAULT 0.00,
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    allow_backorder BOOLEAN DEFAULT FALSE,
    
    -- Images
    images JSONB DEFAULT '[]', -- [{url, alt_text, position}]
    
    -- Attributes
    weight DECIMAL(10,3), -- in kg
    dimensions JSONB DEFAULT '{}', -- {length, width, height}
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'out_of_stock'
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- SEO
    tags TEXT[],
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    CONSTRAINT unique_merchant_sku UNIQUE (merchant_id, sku) WHERE sku IS NOT NULL
);

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));
```

### product_categories
Product category hierarchy.
```sql
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_categories_slug ON product_categories(slug) WHERE is_active = TRUE;
CREATE INDEX idx_categories_position ON product_categories(position);
```

### orders
Customer orders.
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    
    -- Status
    status order_status NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tip_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency currency_code DEFAULT 'DOP',
    
    -- Delivery
    delivery_method VARCHAR(20) NOT NULL, -- 'pickup', 'delivery'
    delivery_address JSONB,
    delivery_instructions TEXT,
    scheduled_at TIMESTAMPTZ,
    estimated_ready_at TIMESTAMPTZ,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMPTZ,
    
    -- Fulfillment
    confirmed_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Customer info at time of order
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Ratings
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_review TEXT,
    merchant_rating INTEGER CHECK (merchant_rating >= 1 AND merchant_rating <= 5),
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- Continue for all months...

CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_merchant ON orders(merchant_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('delivered', 'cancelled');
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_scheduled ON orders(scheduled_at) WHERE scheduled_at IS NOT NULL;
```

### order_items
Individual items within orders.
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Product snapshot at time of order
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_image VARCHAR(500),
    
    -- Pricing
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    
    -- Options
    options JSONB DEFAULT '{}', -- {size: "large", color: "red"}
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### shopping_carts
Active shopping carts.
```sql
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For anonymous users
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_carts_user ON shopping_carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session ON shopping_carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_carts_expires ON shopping_carts(expires_at);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    options JSONB DEFAULT '{}',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
```

## Messaging Domain Schemas

### message_templates
WhatsApp and SMS templates.
```sql
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'sms', 'email'
    language language_code NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'transactional', 'marketing', 'authentication'
    
    -- Template content
    header_type VARCHAR(20), -- 'text', 'image', 'video', 'document'
    header_content TEXT,
    body_content TEXT NOT NULL,
    footer_content TEXT,
    
    -- WhatsApp specific
    whatsapp_template_id VARCHAR(100),
    whatsapp_status VARCHAR(20), -- 'approved', 'pending', 'rejected'
    
    -- Variables
    variables JSONB DEFAULT '[]', -- [{name, type, example}]
    
    -- Interactive components
    buttons JSONB DEFAULT '[]', -- [{type, text, url/phone}]
    
    -- Usage stats
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_template_name UNIQUE (name, channel, language)
);

CREATE INDEX idx_templates_channel ON message_templates(channel) WHERE is_active = TRUE;
CREATE INDEX idx_templates_category ON message_templates(category);
CREATE INDEX idx_templates_language ON message_templates(language);
```

### message_history
All sent messages.
```sql
CREATE TABLE message_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'sms', 'email', 'push'
    
    -- Sender and recipient
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    to_phone VARCHAR(20),
    to_email VARCHAR(255),
    
    -- Message content
    template_id UUID REFERENCES message_templates(id),
    content TEXT,
    media_urls JSONB DEFAULT '[]',
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    -- Cost tracking
    cost DECIMAL(6,4) DEFAULT 0.00,
    segments INTEGER DEFAULT 1,
    
    -- Context
    context_type VARCHAR(50), -- 'order', 'transaction', 'marketing'
    context_id UUID,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE message_history_2025_01 PARTITION OF message_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- Continue for all months...

CREATE INDEX idx_messages_user ON message_history(to_user_id, created_at DESC);
CREATE INDEX idx_messages_phone ON message_history(to_phone, created_at DESC);
CREATE INDEX idx_messages_status ON message_history(status) WHERE status IN ('queued', 'sent');
CREATE INDEX idx_messages_context ON message_history(context_type, context_id);
```

### whatsapp_conversations
WhatsApp conversation threads.
```sql
CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    phone_number VARCHAR(20) NOT NULL,
    wa_id VARCHAR(50) NOT NULL, -- WhatsApp ID
    
    -- Conversation state
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'blocked'
    last_message_at TIMESTAMPTZ,
    last_message_from VARCHAR(20), -- 'user', 'system'
    unread_count INTEGER DEFAULT 0,
    
    -- Context
    current_context VARCHAR(50), -- 'support', 'order', 'payment'
    context_data JSONB DEFAULT '{}',
    
    -- Agent assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    
    -- AI interaction
    ai_enabled BOOLEAN DEFAULT TRUE,
    sentiment_score DECIMAL(3,2), -- -1 to 1
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_conversations_user ON whatsapp_conversations(user_id);
CREATE INDEX idx_wa_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_wa_conversations_status ON whatsapp_conversations(status) WHERE status = 'active';
CREATE INDEX idx_wa_conversations_assigned ON whatsapp_conversations(assigned_to) WHERE assigned_to IS NOT NULL;
```

## AI/ML Domain Schemas

### ai_interactions
AI service interactions log.
```sql
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID NOT NULL,
    
    -- Interaction details
    service_type VARCHAR(50) NOT NULL, -- 'chat', 'voice', 'recommendation', 'credit_score'
    model_used VARCHAR(100),
    model_version VARCHAR(20),
    
    -- Request/Response
    request_text TEXT,
    request_audio_url VARCHAR(500),
    response_text TEXT,
    response_audio_url VARCHAR(500),
    
    -- NLP Analysis
    detected_language language_code,
    intent VARCHAR(100),
    intent_confidence DECIMAL(3,2),
    entities JSONB DEFAULT '{}',
    sentiment_score DECIMAL(3,2), -- -1 to 1
    
    -- Performance
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    cost DECIMAL(8,6),
    
    -- Outcome
    was_helpful BOOLEAN,
    required_human BOOLEAN,
    escalated_to UUID REFERENCES users(id),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create daily partitions for high volume
CREATE TABLE ai_interactions_2025_01_28 PARTITION OF ai_interactions
    FOR VALUES FROM ('2025-01-28') TO ('2025-01-29');
-- Continue daily...

CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id, created_at DESC);
CREATE INDEX idx_ai_interactions_session ON ai_interactions(session_id);
CREATE INDEX idx_ai_interactions_type ON ai_interactions(service_type, created_at DESC);
CREATE INDEX idx_ai_interactions_intent ON ai_interactions(intent) WHERE intent IS NOT NULL;
```

### credit_scores
Alternative credit scoring data.
```sql
CREATE TABLE credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Score details
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
    score_tier VARCHAR(20) NOT NULL, -- 'excellent', 'good', 'fair', 'poor'
    confidence_level DECIMAL(3,2) NOT NULL, -- 0-1
    
    -- Factors analyzed
    factors JSONB NOT NULL DEFAULT '{}', -- {factor_name: {score, weight, impact}}
    
    -- Data sources used
    data_sources JSONB DEFAULT '[]', -- ['transactions', 'social', 'utility', 'business']
    
    -- Credit recommendation
    recommended_limit DECIMAL(10,2),
    recommended_products JSONB DEFAULT '[]',
    
    -- Validity
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Consent
    consent_token VARCHAR(255) NOT NULL,
    consent_granted_at TIMESTAMPTZ NOT NULL,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_scores_user ON credit_scores(user_id, calculated_at DESC);
CREATE INDEX idx_credit_scores_expires ON credit_scores(expires_at);
CREATE INDEX idx_credit_scores_tier ON credit_scores(score_tier);
```

### recommendations
Personalized recommendations.
```sql
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Recommendation details
    type VARCHAR(50) NOT NULL, -- 'product', 'merchant', 'service', 'content'
    item_id UUID NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    
    -- Scoring
    score DECIMAL(3,2) NOT NULL, -- 0-1
    reason VARCHAR(255),
    explanation TEXT,
    
    -- Context
    context JSONB DEFAULT '{}', -- {location, time_of_day, recent_activity}
    
    -- User interaction
    displayed_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    feedback VARCHAR(20), -- 'helpful', 'not_helpful'
    
    -- Validity
    expires_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, created_at DESC);
CREATE INDEX idx_recommendations_type ON recommendations(type);
CREATE INDEX idx_recommendations_score ON recommendations(score DESC);
CREATE INDEX idx_recommendations_expires ON recommendations(expires_at) WHERE expires_at IS NOT NULL;
```

### fraud_detections
Fraud detection results.
```sql
CREATE TABLE fraud_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Risk assessment
    risk_score DECIMAL(3,2) NOT NULL, -- 0-1
    risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- Factors
    risk_factors JSONB NOT NULL DEFAULT '[]', -- [{factor, score, description}]
    
    -- Decision
    recommendation VARCHAR(20) NOT NULL, -- 'approve', 'review', 'decline'
    action_taken VARCHAR(20), -- 'approved', 'blocked', 'flagged'
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Model info
    model_version VARCHAR(20),
    processing_time_ms INTEGER,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_transaction ON fraud_detections(transaction_id);
CREATE INDEX idx_fraud_user ON fraud_detections(user_id);
CREATE INDEX idx_fraud_risk ON fraud_detections(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_fraud_review ON fraud_detections(reviewed_by) WHERE reviewed_by IS NULL;
```

## Audit & Analytics Schemas

### audit_logs
Comprehensive audit trail.
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(255),
    location JSONB,
    
    -- Request info
    request_id UUID,
    api_endpoint VARCHAR(255),
    http_method VARCHAR(10),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- Continue for all months...

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
```

### user_activities
User activity tracking.
```sql
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Context
    ip_address INET,
    device_id VARCHAR(255),
    location JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create daily partitions
CREATE TABLE user_activities_2025_01_28 PARTITION OF user_activities
    FOR VALUES FROM ('2025-01-28') TO ('2025-01-29');
-- Continue daily...

CREATE INDEX idx_activities_user ON user_activities(user_id, created_at DESC);
CREATE INDEX idx_activities_type ON user_activities(activity_type, created_at DESC);
```

### analytics_events
Generic analytics events.
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    
    -- User/Session
    user_id UUID REFERENCES users(id),
    session_id UUID,
    anonymous_id VARCHAR(255),
    
    -- Event properties
    properties JSONB DEFAULT '{}',
    
    -- Context
    page_url VARCHAR(500),
    referrer_url VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Device/Browser
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create hourly partitions for high volume
CREATE TABLE analytics_events_2025_01_28_10 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-01-28 10:00:00') TO ('2025-01-28 11:00:00');
-- Continue hourly...

CREATE INDEX idx_analytics_event ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
```

## Indexing Strategy

### B-Tree Indexes (Default)
- Primary keys (automatic)
- Foreign keys
- Unique constraints
- Range queries (dates, numbers)
- Exact match lookups

### GIN Indexes (Generalized Inverted Index)
- JSONB columns for containment queries
- Array columns
- Full-text search

### GiST Indexes (Generalized Search Tree)
- Geometric data (coordinates)
- Range types
- Nearest-neighbor queries

### BRIN Indexes (Block Range Index)
- Very large tables with natural ordering
- Time-series data (created_at columns)

### Partial Indexes
- Filtered queries (WHERE conditions)
- Exclude NULL values
- Active/inactive records

## Partitioning Strategy

### Time-Based Partitioning
```sql
-- Transactions: Monthly partitions
-- Orders: Monthly partitions  
-- Message History: Monthly partitions
-- AI Interactions: Daily partitions
-- Audit Logs: Monthly partitions
-- Analytics Events: Hourly partitions

-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_monthly_partitions(
    table_name TEXT,
    start_date DATE,
    end_date DATE
) RETURNS VOID AS $$
DECLARE
    curr_date DATE;
    partition_name TEXT;
    start_range TEXT;
    end_range TEXT;
BEGIN
    curr_date := start_date;
    
    WHILE curr_date < end_date LOOP
        partition_name := table_name || '_' || to_char(curr_date, 'YYYY_MM');
        start_range := to_char(curr_date, 'YYYY-MM-DD');
        end_range := to_char(curr_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            partition_name, table_name, start_range, end_range
        );
        
        curr_date := curr_date + INTERVAL '1 month';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for 2025
SELECT create_monthly_partitions('transactions', '2025-01-01', '2026-01-01');
SELECT create_monthly_partitions('orders', '2025-01-01', '2026-01-01');
```

### Partition Maintenance
```sql
-- Drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
    table_name TEXT,
    retention_months INTEGER
) RETURNS VOID AS $$
DECLARE
    partition RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;
    
    FOR partition IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE table_name || '_%'
        AND tablename < table_name || '_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', partition.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly cleanup
-- DROP TABLE IF EXISTS partitions older than 24 months
SELECT drop_old_partitions('analytics_events', 3);
SELECT drop_old_partitions('ai_interactions', 6);
SELECT drop_old_partitions('message_history', 12);
```

## Database Optimization

### Connection Pooling
```yaml
pgbouncer:
  pool_mode: transaction
  max_client_conn: 10000
  default_pool_size: 25
  min_pool_size: 10
  reserve_pool_size: 5
  max_db_connections: 100
```

### Performance Tuning
```sql
-- PostgreSQL configuration
shared_buffers = 8GB
effective_cache_size = 24GB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
```

### Monitoring Queries
```sql
-- Slow query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Most time-consuming queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

---

*These schemas are designed to support WhatsOpí's microservices architecture with optimal performance, scalability, and data integrity for 100K+ concurrent users.*