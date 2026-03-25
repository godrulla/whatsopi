# WhatsOpí Production Infrastructure Variables
# Optimized for Dominican Republic deployment and compliance

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "Primary AWS region (closest to Dominican Republic)"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition     = contains(["us-east-1", "us-east-2", "us-west-2"], var.aws_region)
    error_message = "AWS region must be us-east-1, us-east-2, or us-west-2 for optimal Caribbean connectivity."
  }
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-east-2"
  
  validation {
    condition     = var.dr_region != var.aws_region
    error_message = "DR region must be different from primary region."
  }
}

# Domain Configuration
variable "domain_name" {
  description = "Primary domain name for WhatsOpí"
  type        = string
  default     = "whatsopi.do"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid domain format."
  }
}

variable "api_domain_name" {
  description = "API subdomain"
  type        = string
  default     = "api.whatsopi.do"
}

# Network Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the EKS cluster"
  type        = list(string)
  default = [
    "0.0.0.0/0"  # Will be restricted in production via WAF and security groups
  ]
}

# Security and Compliance
variable "enable_compliance_logging" {
  description = "Enable comprehensive logging for Dominican Law 172-13 compliance"
  type        = bool
  default     = true
}

variable "pci_dss_level" {
  description = "PCI DSS compliance level (1, 2, 3, or 4)"
  type        = number
  default     = 1
  
  validation {
    condition     = contains([1, 2, 3, 4], var.pci_dss_level)
    error_message = "PCI DSS level must be 1, 2, 3, or 4."
  }
}

# Database Configuration
variable "database_password" {
  description = "Master password for the Aurora PostgreSQL cluster"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.database_password) >= 12
    error_message = "Database password must be at least 12 characters long for PCI DSS compliance."
  }
}

variable "database_backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
  
  validation {
    condition     = var.database_backup_retention_days >= 7 && var.database_backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

# Redis Configuration
variable "redis_auth_token" {
  description = "Auth token for Redis cluster"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.redis_auth_token) >= 32
    error_message = "Redis auth token must be at least 32 characters long."
  }
}

# Application Secrets
variable "jwt_secret" {
  description = "Secret key for JWT token signing"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters long."
  }
}

variable "encryption_key" {
  description = "Master encryption key for application data"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.encryption_key) == 64
    error_message = "Encryption key must be exactly 64 characters (256-bit key)."
  }
}

# WhatsApp Business API
variable "whatsapp_token" {
  description = "WhatsApp Business API access token"
  type        = string
  sensitive   = true
}

variable "whatsapp_webhook_verify_token" {
  description = "WhatsApp webhook verification token"
  type        = string
  sensitive   = true
}

# Payment Integration
variable "payment_api_key" {
  description = "Payment gateway API key"
  type        = string
  sensitive   = true
}

variable "payment_webhook_secret" {
  description = "Payment webhook secret for signature verification"
  type        = string
  sensitive   = true
}

# Dominican-specific Payment Providers
variable "dominican_bank_configs" {
  description = "Configuration for Dominican Republic banking integrations"
  type = map(object({
    api_endpoint = string
    merchant_id  = string
    public_key   = string
  }))
  default = {
    banco_popular = {
      api_endpoint = "https://api.bancopopular.com.do/v1"
      merchant_id  = ""
      public_key   = ""
    }
    banco_bhd = {
      api_endpoint = "https://api.bhd.com.do/v1"
      merchant_id  = ""
      public_key   = ""
    }
    banco_reservas = {
      api_endpoint = "https://api.banreservas.com/v1"
      merchant_id  = ""
      public_key   = ""
    }
  }
  sensitive = true
}

# Notification Configuration
variable "alert_email" {
  description = "Email address for production alerts"
  type        = string
  default     = "alerts@whatsopi.do"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Alert email must be a valid email address."
  }
}

variable "compliance_email" {
  description = "Email address for compliance notifications"
  type        = string
  default     = "compliance@whatsopi.do"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.compliance_email))
    error_message = "Compliance email must be a valid email address."
  }
}

variable "emergency_phone" {
  description = "Emergency phone number for critical alerts (WhatsApp format)"
  type        = string
  default     = "+18095550123"
  
  validation {
    condition     = can(regex("^\\+[1-9]\\d{1,14}$", var.emergency_phone))
    error_message = "Emergency phone must be in international format (+1234567890)."
  }
}

# Monitoring and Alerting
variable "monitoring_enabled" {
  description = "Enable comprehensive monitoring and alerting"
  type        = bool
  default     = true
}

variable "performance_insights_retention_days" {
  description = "Number of days to retain Performance Insights data"
  type        = number
  default     = 31
  
  validation {
    condition     = contains([7, 31, 93, 186, 372, 731], var.performance_insights_retention_days)
    error_message = "Performance Insights retention must be 7, 31, 93, 186, 372, or 731 days."
  }
}

# Cost Optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "use_spot_instances" {
  description = "Enable spot instances for non-critical workloads"
  type        = bool
  default     = true
}

variable "reserved_instance_percentage" {
  description = "Percentage of instances to purchase as reserved instances"
  type        = number
  default     = 70
  
  validation {
    condition     = var.reserved_instance_percentage >= 0 && var.reserved_instance_percentage <= 100
    error_message = "Reserved instance percentage must be between 0 and 100."
  }
}

# Scaling Configuration
variable "auto_scaling_enabled" {
  description = "Enable auto-scaling for EKS node groups"
  type        = bool
  default     = true
}

variable "scaling_metrics" {
  description = "Metrics to use for auto-scaling decisions"
  type = object({
    cpu_target_utilization    = number
    memory_target_utilization = number
    request_per_second_target = number
  })
  default = {
    cpu_target_utilization    = 70
    memory_target_utilization = 80
    request_per_second_target = 1000
  }
}

# Backup and Disaster Recovery
variable "cross_region_backup_enabled" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery for database"
  type        = bool
  default     = true
}

variable "backup_schedule" {
  description = "Cron expression for automated backups"
  type        = string
  default     = "0 3 * * *"  # Daily at 3 AM DOM time
  
  validation {
    condition     = can(regex("^[0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+$", var.backup_schedule))
    error_message = "Backup schedule must be a valid cron expression."
  }
}

# Performance Configuration
variable "cdn_price_class" {
  description = "CloudFront price class for CDN distribution"
  type        = string
  default     = "PriceClass_200"
  
  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.cdn_price_class)
    error_message = "CDN price class must be PriceClass_All, PriceClass_200, or PriceClass_100."
  }
}

variable "cache_cluster_size" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
  
  validation {
    condition     = var.cache_cluster_size >= 3 && var.cache_cluster_size <= 15
    error_message = "Cache cluster size must be between 3 and 15 nodes."
  }
}

# Dominican Republic Specific Configuration
variable "dominican_timezone" {
  description = "Timezone for Dominican Republic operations"
  type        = string
  default     = "America/Santo_Domingo"
}

variable "dominican_currency" {
  description = "Primary currency code for Dominican Republic"
  type        = string
  default     = "DOP"
  
  validation {
    condition     = var.dominican_currency == "DOP"
    error_message = "Primary currency must be Dominican Peso (DOP)."
  }
}

variable "supported_languages" {
  description = "Supported languages for the application"
  type        = list(string)
  default     = ["es-DO", "ht-HT", "en-US"]
  
  validation {
    condition     = contains(var.supported_languages, "es-DO")
    error_message = "Spanish (Dominican Republic) must be included in supported languages."
  }
}

# Compliance Configuration
variable "data_retention_years" {
  description = "Number of years to retain user data for compliance"
  type        = number
  default     = 7
  
  validation {
    condition     = var.data_retention_years >= 5 && var.data_retention_years <= 10
    error_message = "Data retention must be between 5 and 10 years for Dominican compliance."
  }
}

variable "audit_log_retention_years" {
  description = "Number of years to retain audit logs"
  type        = number
  default     = 7
  
  validation {
    condition     = var.audit_log_retention_years >= 7
    error_message = "Audit logs must be retained for at least 7 years for PCI DSS compliance."
  }
}

variable "privacy_officer_contact" {
  description = "Contact information for Data Protection Officer"
  type = object({
    name  = string
    email = string
    phone = string
  })
  default = {
    name  = "María González Reyes"
    email = "dpo@whatsopi.do"
    phone = "+18095550124"
  }
}

# Development and Testing
variable "enable_debug_logging" {
  description = "Enable debug logging (should be false in production)"
  type        = bool
  default     = false
}

variable "maintenance_window" {
  description = "Preferred maintenance window for updates"
  type        = string
  default     = "sun:04:00-sun:06:00"  # Sunday 4-6 AM Dominican time
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"  # 3-4 AM Dominican time
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for production deployment"
  type = object({
    voice_interface_enabled     = bool
    ai_assistance_enabled      = bool
    offline_mode_enabled       = bool
    biometric_auth_enabled     = bool
    advanced_analytics_enabled = bool
    whatsapp_business_enabled  = bool
  })
  default = {
    voice_interface_enabled     = true
    ai_assistance_enabled      = true
    offline_mode_enabled       = true
    biometric_auth_enabled     = true
    advanced_analytics_enabled = true
    whatsapp_business_enabled  = true
  }
}

# Resource Tagging
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default = {
    BusinessUnit = "FinTech"
    Country      = "DominicanRepublic"
    Compliance   = "Law172-13,PCI-DSS,AML-CFT"
    Owner        = "Armando Diaz Silverio"
    Contact      = "armando@exxede.com"
  }
}

# Third-party Integration
variable "external_api_endpoints" {
  description = "External API endpoints for integrations"
  type = map(string)
  default = {
    superintendencia_bancos = "https://api.sb.gob.do/v1"
    dgii_tax_system        = "https://api.dgii.gov.do/v1"
    central_bank           = "https://api.bancentral.gov.do/v1"
    whatsapp_business      = "https://graph.facebook.com/v18.0"
  }
}

# Load Testing Configuration
variable "load_test_configuration" {
  description = "Configuration for load testing parameters"
  type = object({
    max_concurrent_users    = number
    ramp_up_duration_minutes = number
    test_duration_minutes   = number
    target_rps             = number
  })
  default = {
    max_concurrent_users    = 100000
    ramp_up_duration_minutes = 30
    test_duration_minutes   = 60
    target_rps             = 10000
  }
}

# Content Delivery Configuration
variable "content_delivery_settings" {
  description = "Settings for content delivery optimization"
  type = object({
    enable_compression     = bool
    enable_http2          = bool
    cache_control_max_age = number
    static_asset_ttl      = number
  })
  default = {
    enable_compression     = true
    enable_http2          = true
    cache_control_max_age = 31536000  # 1 year
    static_asset_ttl      = 86400     # 24 hours
  }
}

# Security Configuration
variable "security_configuration" {
  description = "Advanced security configuration"
  type = object({
    enable_waf_logging        = bool
    waf_rate_limit           = number
    enable_ddos_protection   = bool
    ssl_security_policy      = string
    hsts_max_age            = number
  })
  default = {
    enable_waf_logging        = true
    waf_rate_limit           = 2000
    enable_ddos_protection   = true
    ssl_security_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
    hsts_max_age            = 31536000
  }
}