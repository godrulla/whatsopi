# Database Module Outputs

output "cluster_identifier" {
  description = "RDS cluster identifier"
  value       = aws_rds_cluster.main.cluster_identifier
}

output "cluster_endpoint" {
  description = "RDS cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  description = "RDS cluster reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "cluster_port" {
  description = "RDS cluster port"
  value       = aws_rds_cluster.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_rds_cluster.main.database_name
}

output "master_username" {
  description = "Master username"
  value       = aws_rds_cluster.main.master_username
  sensitive   = true
}

output "cluster_arn" {
  description = "RDS cluster ARN"
  value       = aws_rds_cluster.main.arn
}

output "cluster_resource_id" {
  description = "RDS cluster resource ID"
  value       = aws_rds_cluster.main.cluster_resource_id
}

output "cluster_members" {
  description = "List of RDS instances that are part of this cluster"
  value       = aws_rds_cluster.main.cluster_members
}

# Security Group outputs
output "security_group_id" {
  description = "Security group ID for the database"
  value       = aws_security_group.database.id
}

# KMS Key outputs
output "kms_key_id" {
  description = "KMS key ID for database encryption"
  value       = aws_kms_key.database.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN for database encryption"
  value       = aws_kms_key.database.arn
}

# Secrets Manager outputs
output "credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.database_credentials.arn
}

output "credentials_secret_name" {
  description = "Name of the Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.database_credentials.name
}

# RDS Proxy outputs (conditional)
output "proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = var.enable_proxy ? aws_db_proxy.main[0].endpoint : null
}

output "proxy_arn" {
  description = "RDS Proxy ARN"
  value       = var.enable_proxy ? aws_db_proxy.main[0].arn : null
}

output "proxy_security_group_id" {
  description = "Security group ID for the RDS Proxy"
  value       = var.enable_proxy ? aws_security_group.proxy[0].id : null
}

# CloudWatch Log Group
output "log_group_name" {
  description = "CloudWatch log group name for database logs"
  value       = aws_cloudwatch_log_group.database.name
}

# SNS Topic for alerts
output "alerts_topic_arn" {
  description = "SNS topic ARN for database alerts"
  value       = aws_sns_topic.database_alerts.arn
}

# Connection information for applications
output "connection_info" {
  description = "Database connection information"
  value = {
    # Use proxy endpoint if available, otherwise use cluster endpoint
    endpoint = var.enable_proxy ? aws_db_proxy.main[0].endpoint : aws_rds_cluster.main.endpoint
    port     = aws_rds_cluster.main.port
    database = aws_rds_cluster.main.database_name
    # Applications should use Secrets Manager to get credentials
    secret_arn = aws_secretsmanager_secret.database_credentials.arn
  }
  sensitive = false  # Connection info is not sensitive (credentials are in Secrets Manager)
}

# Instance-specific outputs
output "cluster_instances" {
  description = "Information about cluster instances"
  value = {
    for i, instance in aws_rds_cluster_instance.main : instance.identifier => {
      endpoint         = instance.endpoint
      identifier      = instance.identifier
      instance_class  = instance.instance_class
      writer         = instance.writer
      availability_zone = instance.availability_zone
    }
  }
}

# Monitoring outputs
output "monitoring_role_arn" {
  description = "ARN of the IAM role for RDS monitoring"
  value       = aws_iam_role.rds_monitoring.arn
}

# Backup information
output "backup_info" {
  description = "Database backup configuration"
  value = {
    retention_period = aws_rds_cluster.main.backup_retention_period
    backup_window   = aws_rds_cluster.main.preferred_backup_window
    maintenance_window = aws_rds_cluster.main.preferred_maintenance_window
    encrypted       = aws_rds_cluster.main.storage_encrypted
    kms_key_id     = aws_rds_cluster.main.kms_key_id
  }
}