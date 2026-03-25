# WhatsOpí Production Infrastructure
# Optimized for Dominican Republic deployment with 99.9% uptime requirements
# Compliant with Dominican Law 172-13 and PCI DSS Level 1

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # Configuration provided via backend-config in CI/CD
    # bucket         = "whatsopi-terraform-state"
    # key            = "production/terraform.tfstate"
    # region         = "us-east-1"
    # encrypt        = true
    # dynamodb_table = "whatsopi-terraform-locks"
  }
}

# Configure AWS Provider for primary region (closest to Dominican Republic)
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment     = var.environment
      Project         = "WhatsOpí"
      ManagedBy      = "Terraform"
      Owner          = "Armando Diaz Silverio"
      CostCenter     = "Production"
      Compliance     = "Law172-13,PCI-DSS"
      BackupRequired = "true"
    }
  }
}

# AWS Provider for disaster recovery region
provider "aws" {
  alias  = "dr"
  region = var.dr_region
  
  default_tags {
    tags = {
      Environment     = "${var.environment}-dr"
      Project         = "WhatsOpí"
      ManagedBy      = "Terraform"
      Owner          = "Armando Diaz Silverio"
      CostCenter     = "Production"
      Compliance     = "Law172-13,PCI-DSS"
      BackupRequired = "true"
    }
  }
}

# Data sources for availability zones
data "aws_availability_zones" "available" {
  state = "available"
  
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values for resource naming and configuration
locals {
  name_prefix = "whatsopi-${var.environment}"
  
  # Network configuration optimized for Caribbean latency
  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Subnets for multi-tier architecture
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
  
  # Dominican Republic specific configuration
  dominican_compliance = {
    data_residency_required = true
    encryption_required     = true
    audit_logging_required  = true
    privacy_rights_enabled  = true
  }
  
  # PCI DSS compliance requirements
  pci_compliance = {
    network_segmentation = true
    encryption_at_rest   = true
    encryption_in_transit = true
    access_logging       = true
    vulnerability_scanning = true
  }
  
  common_tags = {
    Environment        = var.environment
    Project           = "WhatsOpí"
    Owner             = "Armando Diaz Silverio"
    DominicanCompliance = "Law172-13"
    PCICompliance     = "Level1"
    NetworkOptimization = "Caribbean"
  }
}

# VPC and Network Infrastructure
module "vpc" {
  source = "../../modules/vpc"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  cidr             = local.vpc_cidr
  azs              = local.azs
  public_subnets   = local.public_subnets
  private_subnets  = local.private_subnets
  database_subnets = local.database_subnets
  
  # Enable for PCI DSS compliance
  enable_flow_logs = true
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # Caribbean network optimization
  enable_nat_gateway = true
  single_nat_gateway = false  # Multi-AZ for high availability
  
  # Compliance requirements
  enable_cloudtrail_logging = var.enable_compliance_logging
  
  tags = local.common_tags
}

# EKS Cluster for container orchestration
module "eks" {
  source = "../../modules/eks"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  public_subnet_ids     = module.vpc.public_subnet_ids
  
  # High availability configuration
  cluster_version = "1.28"
  
  # Node groups for different workload types
  node_groups = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 10
      max_size       = 50
      desired_size   = 20
      
      # Dominican market cost optimization
      enable_bootstrap_user_data = true
      
      # PCI DSS compliance
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type          = "gp3"
            encrypted            = true
            delete_on_termination = true
          }
        }
      }
      
      labels = {
        workload-type = "general"
        compliance    = "pci-dss"
      }
    }
    
    compute_intensive = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 5
      max_size       = 20
      desired_size   = 10
      
      taints = [{
        key    = "workload-type"
        value  = "compute"
        effect = "NO_SCHEDULE"
      }]
      
      labels = {
        workload-type = "compute-intensive"
        compliance    = "pci-dss"
      }
    }
    
    memory_intensive = {
      instance_types = ["r5.large", "r5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 5
      max_size       = 20
      desired_size   = 10
      
      taints = [{
        key    = "workload-type"
        value  = "memory"
        effect = "NO_SCHEDULE"
      }]
      
      labels = {
        workload-type = "memory-intensive"
        compliance    = "pci-dss"
      }
    }
    
    # Spot instances for cost optimization
    spot_compute = {
      instance_types = ["t3.medium", "t3.large", "t3.xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 10
      desired_size   = 3
      
      labels = {
        workload-type = "batch"
        cost-optimization = "spot"
      }
    }
  }
  
  # Security and compliance
  cluster_encryption_config = [{
    provider_key_arn = module.kms.cluster_key_arn
    resources        = ["secrets"]
  }]
  
  # Logging for compliance
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  # Network security
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = var.allowed_cidr_blocks
  
  tags = local.common_tags
}

# RDS Aurora PostgreSQL for primary database
module "database" {
  source = "../../modules/database"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_id             = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.vpc.database_security_group_id]
  
  # High availability configuration
  engine         = "aurora-postgresql"
  engine_version = "15.3"
  instance_class = "db.r6g.2xlarge"
  
  # Scaling configuration
  instances = {
    writer = {
      instance_class      = "db.r6g.2xlarge"
      publicly_accessible = false
    }
    reader1 = {
      instance_class      = "db.r6g.xlarge"
      publicly_accessible = false
    }
    reader2 = {
      instance_class      = "db.r6g.xlarge"
      publicly_accessible = false
    }
  }
  
  # Auto-scaling for read replicas
  autoscaling_enabled      = true
  autoscaling_min_capacity = 2
  autoscaling_max_capacity = 5
  
  # Security and compliance
  storage_encrypted   = true
  kms_key_id          = module.kms.database_key_arn
  master_password     = var.database_password
  manage_master_user_password = false
  
  # Dominican Law 172-13 compliance
  backup_retention_period = 30  # Extended for compliance
  backup_window          = "03:00-04:00"  # Dominican timezone consideration
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Cross-region backup for disaster recovery
  copy_tags_to_snapshot = true
  
  # Performance monitoring
  performance_insights_enabled = true
  performance_insights_retention_period = 31
  
  # Monitoring and alerting
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Security group rules
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  tags = merge(local.common_tags, {
    Compliance = "Law172-13,PCI-DSS"
    DataType   = "Financial,Personal"
  })
}

# Cross-region read replica for disaster recovery
module "database_replica" {
  source = "../../modules/database"
  
  providers = {
    aws = aws.dr
  }
  
  name_prefix = "${local.name_prefix}-replica"
  environment = "${var.environment}-dr"
  
  # This will be configured as a cross-region read replica
  create_cross_region_replica = true
  source_cluster_arn = module.database.cluster_arn
  
  # Minimal configuration for DR
  instance_class = "db.r6g.xlarge"
  
  tags = merge(local.common_tags, {
    Purpose = "DisasterRecovery"
    Region  = var.dr_region
  })
}

# ElastiCache Redis for caching and sessions
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids
  
  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "Redis cluster for WhatsOpí production"
  
  node_type                  = "cache.r6g.xlarge"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security and compliance
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = module.kms.redis_key_arn
  
  # Backup configuration
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  tags = local.common_tags
}

# KMS keys for encryption
module "kms" {
  source = "../../modules/kms"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Multiple keys for different data types (PCI DSS best practice)
  keys = {
    cluster = {
      description = "EKS cluster encryption key"
      policy      = data.aws_iam_policy_document.kms_cluster.json
    }
    database = {
      description = "Database encryption key"
      policy      = data.aws_iam_policy_document.kms_database.json
    }
    redis = {
      description = "Redis encryption key"
      policy      = data.aws_iam_policy_document.kms_redis.json
    }
    s3 = {
      description = "S3 bucket encryption key"
      policy      = data.aws_iam_policy_document.kms_s3.json
    }
    secrets = {
      description = "Secrets Manager encryption key"
      policy      = data.aws_iam_policy_document.kms_secrets.json
    }
  }
  
  tags = local.common_tags
}

# S3 buckets for various purposes
module "s3" {
  source = "../../modules/s3"
  
  name_prefix = local.name_prefix
  environment = var.environment
  account_id  = data.aws_caller_identity.current.account_id
  
  buckets = {
    static_assets = {
      purpose = "Static website assets (CSS, JS, images)"
      versioning = true
      lifecycle_rules = [{
        id     = "transition_to_ia"
        status = "Enabled"
        transition = [{
          days          = 90
          storage_class = "STANDARD_IA"
        }]
      }]
      cors_rules = [{
        allowed_headers = ["*"]
        allowed_methods = ["GET", "HEAD"]
        allowed_origins = [
          "https://${var.domain_name}",
          "https://${var.api_domain_name}"
        ]
        max_age_seconds = 3600
      }]
    }
    
    user_uploads = {
      purpose = "User documents, KYC files, receipts"
      versioning = true
      encryption_key_arn = module.kms.s3_key_arn
      
      # Dominican Law 172-13 compliance
      lifecycle_rules = [{
        id     = "personal_data_retention"
        status = "Enabled"
        expiration = {
          days = 2555  # 7 years as required by law
        }
      }]
      
      # Strict access controls for personal data
      public_access_block = true
      notification_configuration = {
        lambda_function = {
          lambda_function_arn = module.compliance_scanner.function_arn
          events             = ["s3:ObjectCreated:*"]
        }
      }
    }
    
    media = {
      purpose = "Product images, videos, audio files"
      versioning = false
      cdn_enabled = true
      
      lifecycle_rules = [{
        id     = "media_optimization"
        status = "Enabled"
        transition = [{
          days          = 180
          storage_class = "STANDARD_IA"
        }]
      }]
    }
    
    backups = {
      purpose = "Database backups, application backups"
      versioning = true
      encryption_key_arn = module.kms.s3_key_arn
      storage_class = "GLACIER"
      
      lifecycle_rules = [{
        id     = "backup_retention"
        status = "Enabled"
        expiration = {
          days = 1825  # 5 years retention
        }
      }]
    }
    
    ml_data = {
      purpose = "Machine learning training data and models"
      versioning = true
      intelligent_tiering = true
    }
    
    audit_logs = {
      purpose = "Compliance and audit logs"
      versioning = true
      encryption_key_arn = module.kms.s3_key_arn
      
      # Extended retention for compliance
      lifecycle_rules = [{
        id     = "audit_retention"
        status = "Enabled"
        expiration = {
          days = 2555  # 7 years
        }
      }]
      
      # Strict access controls
      public_access_block = true
      mfa_delete = true
    }
  }
  
  # Cross-region replication for critical buckets
  replication_configuration = {
    destination_region = var.dr_region
    replicate_buckets = ["user_uploads", "backups", "audit_logs"]
  }
  
  tags = local.common_tags
}

# CloudFront CDN for global content delivery
module "cloudfront" {
  source = "../../modules/cloudfront"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Primary distribution for web application
  distributions = {
    main = {
      domain_names = [var.domain_name, "www.${var.domain_name}"]
      
      origins = [
        {
          domain_name = module.alb.dns_name
          origin_id   = "ALB-main"
          custom_origin_config = {
            http_port              = 80
            https_port             = 443
            origin_protocol_policy = "https-only"
            origin_ssl_protocols   = ["TLSv1.2"]
          }
        },
        {
          domain_name = module.s3.bucket_domain_names["static_assets"]
          origin_id   = "S3-static"
          s3_origin_config = {
            origin_access_identity = module.s3.cloudfront_oai_iam_arn
          }
        }
      ]
      
      behaviors = [
        {
          path_pattern     = "/api/*"
          target_origin_id = "ALB-main"
          cache_policy_id  = data.aws_cloudfront_cache_policy.caching_disabled.id
          
          # Security headers for API requests
          response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
        },
        {
          path_pattern     = "/static/*"
          target_origin_id = "S3-static"
          cache_policy_id  = data.aws_cloudfront_cache_policy.caching_optimized.id
          compress         = true
        },
        {
          path_pattern     = "/*"
          target_origin_id = "ALB-main"
          cache_policy_id  = data.aws_cloudfront_cache_policy.caching_optimized_uncompressed.id
          
          # Dominican user optimization
          viewer_protocol_policy = "redirect-to-https"
          compress              = true
        }
      ]
      
      # Caribbean network optimization
      price_class = "PriceClass_200"  # US, Canada, Europe, Asia
      
      # SSL certificate
      acm_certificate_arn = module.acm.certificate_arn
      ssl_support_method  = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
    
    # Separate distribution for media content
    media = {
      domain_names = ["media.${var.domain_name}"]
      
      origins = [{
        domain_name = module.s3.bucket_domain_names["media"]
        origin_id   = "S3-media"
        s3_origin_config = {
          origin_access_identity = module.s3.cloudfront_oai_iam_arn
        }
      }]
      
      behaviors = [{
        path_pattern     = "/*"
        target_origin_id = "S3-media"
        cache_policy_id  = data.aws_cloudfront_cache_policy.caching_optimized.id
        compress         = true
        
        # Long cache times for media
        default_ttl = 86400
        max_ttl     = 31536000
      }]
      
      price_class = "PriceClass_100"  # More restrictive for media
    }
  }
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "../../modules/alb"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  
  # Security configuration
  security_group_rules = {
    ingress = [
      {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP from internet"
      },
      {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTPS from internet"
      }
    ]
  }
  
  # SSL configuration
  certificate_arn = module.acm.certificate_arn
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  
  # Target groups for different services
  target_groups = {
    frontend = {
      port                 = 3000
      protocol            = "HTTP"
      health_check_path   = "/health"
      health_check_matcher = "200"
    }
    backend = {
      port                 = 8080
      protocol            = "HTTP"
      health_check_path   = "/api/health"
      health_check_matcher = "200"
    }
  }
  
  # WAF association for security
  web_acl_arn = module.waf.web_acl_arn
  
  tags = local.common_tags
}

# Web Application Firewall
module "waf" {
  source = "../../modules/waf"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # PCI DSS and security rules
  rules = {
    rate_limiting = {
      priority = 1
      action   = "BLOCK"
      statement = {
        rate_based_statement = {
          limit              = 2000
          aggregate_key_type = "IP"
        }
      }
    }
    
    geo_blocking = {
      priority = 2
      action   = "BLOCK"
      statement = {
        geo_match_statement = {
          # Block high-risk countries
          country_codes = ["CN", "RU", "KP", "IR"]
        }
      }
    }
    
    sql_injection = {
      priority = 3
      action   = "BLOCK"
      statement = {
        managed_rule_group_statement = {
          vendor_name = "AWS"
          name        = "AWSManagedRulesSQLiRuleSet"
        }
      }
    }
    
    xss_protection = {
      priority = 4
      action   = "BLOCK"
      statement = {
        managed_rule_group_statement = {
          vendor_name = "AWS"
          name        = "AWSManagedRulesCommonRuleSet"
        }
      }
    }
    
    # Dominican Republic allow rule
    dominican_allowlist = {
      priority = 5
      action   = "ALLOW"
      statement = {
        geo_match_statement = {
          country_codes = ["DO", "US", "CA"]
        }
      }
    }
  }
  
  tags = local.common_tags
}

# Route53 DNS configuration
module "route53" {
  source = "../../modules/route53"
  
  domain_name = var.domain_name
  
  zones = {
    primary = {
      name = var.domain_name
      records = [
        {
          name = ""
          type = "A"
          alias = {
            name    = module.cloudfront.distributions["main"].domain_name
            zone_id = module.cloudfront.distributions["main"].hosted_zone_id
          }
        },
        {
          name = "www"
          type = "CNAME"
          ttl  = 300
          records = [var.domain_name]
        },
        {
          name = "api"
          type = "A"
          alias = {
            name    = module.alb.dns_name
            zone_id = module.alb.zone_id
          }
        },
        {
          name = "media"
          type = "A"
          alias = {
            name    = module.cloudfront.distributions["media"].domain_name
            zone_id = module.cloudfront.distributions["media"].hosted_zone_id
          }
        }
      ]
    }
  }
  
  # Health checks for high availability
  health_checks = {
    primary = {
      fqdn                            = var.domain_name
      port                            = 443
      type                            = "HTTPS"
      resource_path                   = "/health"
      failure_threshold               = 3
      request_interval                = 30
      cloudwatch_alarm_region         = var.aws_region
      insufficient_data_health_status = "Failure"
    }
  }
  
  tags = local.common_tags
}

# ACM SSL certificates
module "acm" {
  source = "../../modules/acm"
  
  domain_name = var.domain_name
  
  # Multi-domain certificate for all subdomains
  subject_alternative_names = [
    "*.${var.domain_name}",
    var.api_domain_name,
    "www.${var.domain_name}",
    "media.${var.domain_name}"
  ]
  
  # DNS validation
  validation_method = "DNS"
  route53_zone_id   = module.route53.zone_id
  
  tags = local.common_tags
}

# Monitoring and observability
module "monitoring" {
  source = "../../modules/monitoring"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # CloudWatch configuration
  log_groups = {
    application = {
      name              = "/aws/eks/${local.name_prefix}-cluster/application"
      retention_in_days = 30
      kms_key_id        = module.kms.secrets_key_arn
    }
    
    audit = {
      name              = "/aws/eks/${local.name_prefix}-cluster/audit"
      retention_in_days = 2555  # 7 years for compliance
      kms_key_id        = module.kms.secrets_key_arn
    }
    
    vpc_flow_logs = {
      name              = "/aws/vpc/flowlogs"
      retention_in_days = 90
      kms_key_id        = module.kms.secrets_key_arn
    }
  }
  
  # Custom metrics and alarms
  custom_metrics = {
    # Business metrics
    transaction_volume = {
      namespace   = "WhatsOpi/Business"
      metric_name = "TransactionVolume"
      unit        = "Count"
    }
    
    user_registrations = {
      namespace   = "WhatsOpi/Business"
      metric_name = "UserRegistrations"
      unit        = "Count"
    }
    
    # Performance metrics
    api_latency = {
      namespace   = "WhatsOpi/Performance"
      metric_name = "APILatency"
      unit        = "Milliseconds"
    }
    
    error_rate = {
      namespace   = "WhatsOpi/Performance"
      metric_name = "ErrorRate"
      unit        = "Percent"
    }
  }
  
  # Critical alarms
  alarms = {
    high_error_rate = {
      alarm_name          = "${local.name_prefix}-high-error-rate"
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = "2"
      metric_name         = "ErrorRate"
      namespace           = "WhatsOpi/Performance"
      period              = "300"
      statistic           = "Average"
      threshold           = "5"
      alarm_description   = "High error rate detected"
      alarm_actions       = [module.sns.topic_arns["alerts"]]
    }
    
    database_cpu_high = {
      alarm_name          = "${local.name_prefix}-database-cpu-high"
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = "2"
      metric_name         = "CPUUtilization"
      namespace           = "AWS/RDS"
      period              = "300"
      statistic           = "Average"
      threshold           = "80"
      alarm_description   = "Database CPU utilization high"
      alarm_actions       = [module.sns.topic_arns["alerts"]]
      
      dimensions = {
        DBClusterIdentifier = module.database.cluster_id
      }
    }
  }
  
  tags = local.common_tags
}

# SNS topics for notifications
module "sns" {
  source = "../../modules/sns"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  topics = {
    alerts = {
      name         = "${local.name_prefix}-alerts"
      display_name = "WhatsOpí Production Alerts"
      
      subscriptions = [
        {
          protocol = "email"
          endpoint = var.alert_email
        },
        {
          protocol = "sms"
          endpoint = var.emergency_phone
        }
      ]
    }
    
    compliance = {
      name         = "${local.name_prefix}-compliance"
      display_name = "WhatsOpí Compliance Notifications"
      
      subscriptions = [{
        protocol = "email"
        endpoint = var.compliance_email
      }]
    }
  }
  
  tags = local.common_tags
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "application_secrets" {
  name        = "${local.name_prefix}-application-secrets"
  description = "Application secrets for WhatsOpí production"
  
  kms_key_id = module.kms.secrets_key_arn
  
  # Automatic rotation
  rotation_rules {
    automatically_after_days = 90
  }
  
  tags = merge(local.common_tags, {
    Purpose = "ApplicationSecrets"
  })
}

resource "aws_secretsmanager_secret_version" "application_secrets" {
  secret_id = aws_secretsmanager_secret.application_secrets.id
  
  secret_string = jsonencode({
    database_url     = "postgresql://${module.database.cluster_endpoint}:5432/whatsopi"
    redis_url        = "redis://${aws_elasticache_replication_group.redis.configuration_endpoint}:6379"
    jwt_secret       = var.jwt_secret
    encryption_key   = var.encryption_key
    whatsapp_token   = var.whatsapp_token
    payment_api_key  = var.payment_api_key
  })
}

# Security groups
resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for Redis cluster"
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
    description     = "Redis access from EKS cluster"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${local.name_prefix}-redis/slow-log"
  retention_in_days = 30
  kms_key_id        = module.kms.secrets_key_arn
  
  tags = local.common_tags
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "${local.name_prefix}-rds-monitoring"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudFront response headers policy for security
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${local.name_prefix}-security-headers"
  
  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
    }
    
    content_type_options {
      override = true
    }
    
    frame_options {
      frame_option = "DENY"
    }
    
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
    }
  }
  
  # PCI DSS compliance headers
  custom_headers_config {
    items {
      header   = "X-PCI-DSS-Compliant"
      value    = "true"
      override = false
    }
  }
}

# Data sources for CloudFront cache policies
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_optimized_uncompressed" {
  name = "Managed-CachingOptimizedForUncompressedObjects"
}

# KMS key policies
data "aws_iam_policy_document" "kms_cluster" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
  
  statement {
    sid    = "Allow EKS service"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_database" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
  
  statement {
    sid    = "Allow RDS service"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:CreateGrant"
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_redis" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_s3" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
  
  statement {
    sid    = "Allow S3 service"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_secrets" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }
  
  statement {
    sid    = "Allow Secrets Manager service"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["secretsmanager.amazonaws.com"]
    }
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = ["*"]
  }
}