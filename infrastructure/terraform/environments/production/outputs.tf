# WhatsOpí Production Infrastructure Outputs
# Provides essential information for application deployment and monitoring

# Network Infrastructure Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = local.azs
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "node_groups" {
  description = "EKS node groups information"
  value       = module.eks.node_groups
  sensitive   = true
}

# Database Outputs
output "database_cluster_id" {
  description = "RDS cluster identifier"
  value       = module.database.cluster_id
}

output "database_cluster_arn" {
  description = "RDS cluster ARN"
  value       = module.database.cluster_arn
}

output "database_cluster_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.database.cluster_endpoint
}

output "database_cluster_reader_endpoint" {
  description = "RDS cluster reader endpoint"
  value       = module.database.cluster_reader_endpoint
}

output "database_cluster_port" {
  description = "RDS cluster port"
  value       = module.database.cluster_port
}

output "database_cluster_database_name" {
  description = "RDS cluster database name"
  value       = module.database.cluster_database_name
}

output "database_cluster_master_username" {
  description = "RDS cluster master username"
  value       = module.database.cluster_master_username
  sensitive   = true
}

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = module.vpc.database_security_group_id
}

# Database Replica (DR) Outputs
output "database_replica_cluster_id" {
  description = "DR region RDS cluster identifier"
  value       = module.database_replica.cluster_id
}

output "database_replica_cluster_endpoint" {
  description = "DR region RDS cluster endpoint"
  value       = module.database_replica.cluster_endpoint
}

# Redis Cache Outputs
output "redis_cluster_id" {
  description = "ElastiCache Redis cluster ID"
  value       = aws_elasticache_replication_group.redis.id
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "Security group ID for Redis cluster"
  value       = aws_security_group.redis.id
}

# Load Balancer Outputs
output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID of the Application Load Balancer"
  value       = module.alb.security_group_id
}

output "target_group_arns" {
  description = "ARNs of the target groups"
  value       = module.alb.target_group_arns
}

# CloudFront CDN Outputs
output "cloudfront_distribution_ids" {
  description = "CloudFront distribution IDs"
  value = {
    main  = module.cloudfront.distributions["main"].id
    media = module.cloudfront.distributions["media"].id
  }
}

output "cloudfront_domain_names" {
  description = "CloudFront distribution domain names"
  value = {
    main  = module.cloudfront.distributions["main"].domain_name
    media = module.cloudfront.distributions["media"].domain_name
  }
}

output "cloudfront_hosted_zone_ids" {
  description = "CloudFront distribution hosted zone IDs"
  value = {
    main  = module.cloudfront.distributions["main"].hosted_zone_id
    media = module.cloudfront.distributions["media"].hosted_zone_id
  }
}

# S3 Bucket Outputs
output "s3_bucket_ids" {
  description = "S3 bucket IDs"
  value       = module.s3.bucket_ids
}

output "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  value       = module.s3.bucket_arns
}

output "s3_bucket_domain_names" {
  description = "S3 bucket domain names"
  value       = module.s3.bucket_domain_names
}

output "s3_static_assets_bucket" {
  description = "Static assets S3 bucket name"
  value       = module.s3.bucket_ids["static_assets"]
}

output "s3_user_uploads_bucket" {
  description = "User uploads S3 bucket name"
  value       = module.s3.bucket_ids["user_uploads"]
}

# Route53 DNS Outputs
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.route53.zone_id
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = module.route53.zone_name
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = module.route53.name_servers
}

# SSL Certificate Outputs
output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = module.acm.certificate_arn
}

output "acm_certificate_domain_validation_options" {
  description = "Domain validation options for the certificate"
  value       = module.acm.domain_validation_options
  sensitive   = true
}

# KMS Key Outputs
output "kms_key_arns" {
  description = "ARNs of KMS keys"
  value       = module.kms.key_arns
  sensitive   = true
}

output "kms_key_ids" {
  description = "IDs of KMS keys"
  value       = module.kms.key_ids
  sensitive   = true
}

# WAF Outputs
output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = module.waf.web_acl_arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = module.waf.web_acl_id
}

# Secrets Manager Outputs
output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.application_secrets.arn
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.application_secrets.name
}

# SNS Topic Outputs
output "sns_topic_arns" {
  description = "ARNs of SNS topics"
  value       = module.sns.topic_arns
}

output "alert_topic_arn" {
  description = "ARN of the alerts SNS topic"
  value       = module.sns.topic_arns["alerts"]
}

output "compliance_topic_arn" {
  description = "ARN of the compliance SNS topic"
  value       = module.sns.topic_arns["compliance"]
}

# CloudWatch Log Groups
output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value       = module.monitoring.log_group_names
}

output "application_log_group" {
  description = "Application log group name"
  value       = module.monitoring.log_group_names["application"]
}

output "audit_log_group" {
  description = "Audit log group name"
  value       = module.monitoring.log_group_names["audit"]
}

# Regional Information
output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "disaster_recovery_region" {
  description = "Disaster recovery region"
  value       = var.dr_region
}

# Application Configuration Outputs
output "application_config" {
  description = "Configuration values for application deployment"
  value = {
    environment           = var.environment
    domain_name          = var.domain_name
    api_domain_name      = var.api_domain_name
    dominican_timezone   = var.dominican_timezone
    supported_languages  = var.supported_languages
    feature_flags        = var.feature_flags
  }
}

# Kubernetes Configuration
output "kubernetes_config" {
  description = "Kubernetes configuration for application deployment"
  value = {
    cluster_name     = module.eks.cluster_id
    cluster_endpoint = module.eks.cluster_endpoint
    namespace       = "production"
    service_account = "${local.name_prefix}-service-account"
  }
  sensitive = true
}

# Database Connection Information
output "database_connection_config" {
  description = "Database connection configuration"
  value = {
    host     = module.database.cluster_endpoint
    port     = module.database.cluster_port
    database = module.database.cluster_database_name
    username = module.database.cluster_master_username
    # Password is stored in Secrets Manager
    secret_arn = aws_secretsmanager_secret.application_secrets.arn
  }
  sensitive = true
}

# Cache Connection Information
output "cache_connection_config" {
  description = "Cache connection configuration"
  value = {
    host = aws_elasticache_replication_group.redis.configuration_endpoint
    port = aws_elasticache_replication_group.redis.port
    # Auth token is stored in Secrets Manager
    secret_arn = aws_secretsmanager_secret.application_secrets.arn
  }
  sensitive = true
}

# Compliance and Security Information
output "compliance_info" {
  description = "Compliance and security configuration information"
  value = {
    pci_dss_level                = var.pci_dss_level
    dominican_law_compliance     = var.enable_compliance_logging
    data_retention_years         = var.data_retention_years
    audit_log_retention_years    = var.audit_log_retention_years
    privacy_officer             = var.privacy_officer_contact
    encryption_at_rest_enabled  = true
    encryption_in_transit_enabled = true
  }
}

# Monitoring and Alerting Configuration
output "monitoring_config" {
  description = "Monitoring and alerting configuration"
  value = {
    cloudwatch_log_groups    = module.monitoring.log_group_names
    sns_alert_topic         = module.sns.topic_arns["alerts"]
    sns_compliance_topic    = module.sns.topic_arns["compliance"]
    performance_insights    = var.performance_insights_retention_days
    monitoring_enabled      = var.monitoring_enabled
  }
}

# Cost Optimization Information
output "cost_optimization_config" {
  description = "Cost optimization configuration"
  value = {
    spot_instances_enabled      = var.use_spot_instances
    reserved_instance_percentage = var.reserved_instance_percentage
    auto_scaling_enabled        = var.auto_scaling_enabled
    cost_optimization_enabled   = var.enable_cost_optimization
  }
}

# Network Security Configuration
output "network_security_config" {
  description = "Network security configuration"
  value = {
    vpc_flow_logs_enabled     = true
    waf_enabled              = true
    ddos_protection_enabled  = var.security_configuration.enable_ddos_protection
    ssl_security_policy      = var.security_configuration.ssl_security_policy
    rate_limiting_enabled    = true
    geo_blocking_enabled     = true
  }
}

# Backup and Disaster Recovery Configuration
output "backup_dr_config" {
  description = "Backup and disaster recovery configuration"
  value = {
    cross_region_backup_enabled   = var.cross_region_backup_enabled
    database_backup_retention     = var.database_backup_retention_days
    point_in_time_recovery       = var.point_in_time_recovery_enabled
    backup_schedule             = var.backup_schedule
    dr_region                   = var.dr_region
    maintenance_window          = var.maintenance_window
    backup_window              = var.backup_window
  }
}

# Performance Configuration
output "performance_config" {
  description = "Performance optimization configuration"
  value = {
    cdn_enabled                = true
    cdn_price_class           = var.cdn_price_class
    cache_cluster_size        = var.cache_cluster_size
    content_compression       = var.content_delivery_settings.enable_compression
    http2_enabled            = var.content_delivery_settings.enable_http2
    static_asset_ttl         = var.content_delivery_settings.static_asset_ttl
  }
}

# External Integration Endpoints
output "external_integrations" {
  description = "External API endpoints for integrations"
  value       = var.external_api_endpoints
}

# Load Testing Configuration
output "load_test_config" {
  description = "Load testing configuration parameters"
  value       = var.load_test_configuration
}

# Resource Tags
output "resource_tags" {
  description = "Common resource tags applied to all resources"
  value       = merge(local.common_tags, var.additional_tags)
}

# Deployment Summary
output "deployment_summary" {
  description = "Summary of the production deployment"
  value = {
    environment_name         = var.environment
    deployment_region       = var.aws_region
    disaster_recovery_region = var.dr_region
    domain_name            = var.domain_name
    cluster_name           = module.eks.cluster_id
    database_engine        = "aurora-postgresql"
    cache_engine          = "redis"
    cdn_enabled           = true
    waf_enabled           = true
    ssl_enabled           = true
    monitoring_enabled    = var.monitoring_enabled
    compliance_enabled    = var.enable_compliance_logging
    auto_scaling_enabled  = var.auto_scaling_enabled
    backup_enabled        = true
    dr_enabled           = var.cross_region_backup_enabled
    deployment_timestamp = timestamp()
  }
}