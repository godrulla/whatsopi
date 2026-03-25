# Database Module for WhatsOpí
# PostgreSQL with encryption and Dominican Republic compliance

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}

# Random password for RDS master user
resource "random_password" "master" {
  length  = 32
  special = true
}

# KMS key for database encryption (Dominican Law 172-13 compliance)
resource "aws_kms_key" "database" {
  description             = "KMS key for WhatsOpí database encryption - ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Service"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-database-kms"
    Type = "kms-key"
    Compliance = "Law-172-13"
  })
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.environment}-whatsopi-database"
  target_key_id = aws_kms_key.database.key_id
}

# Secrets Manager for database credentials
resource "aws_secretsmanager_secret" "database_credentials" {
  name                    = "whatsopi/${var.environment}/database/credentials"
  description             = "Database credentials for WhatsOpí ${var.environment}"
  kms_key_id              = aws_kms_key.database.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-credentials"
    Type = "secret"
    Compliance = "Law-172-13"
  })
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "postgres"
    host     = aws_rds_cluster.main.endpoint
    port     = aws_rds_cluster.main.port
    dbname   = aws_rds_cluster.main.database_name
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-whatsopi-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-subnet-group"
    Type = "db-subnet-group"
  })
}

# RDS Parameter Group for PostgreSQL optimization
resource "aws_rds_cluster_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "${var.environment}-whatsopi-cluster-params"

  # Dominican Republic specific optimizations
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pg_hint_plan"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "timezone"
    value = "America/Santo_Domingo"
  }

  parameter {
    name  = "datestyle"
    value = "ISO, DMY"  # Dominican date format
  }

  parameter {
    name  = "lc_monetary"
    value = "es_DO.UTF-8"  # Dominican peso formatting
  }

  parameter {
    name  = "lc_numeric"
    value = "es_DO.UTF-8"  # Dominican number formatting
  }

  # Performance optimizations for Caribbean network conditions
  parameter {
    name  = "max_connections"
    value = var.db_config.max_connections
  }

  parameter {
    name  = "work_mem"
    value = "32MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "256MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "2GB"
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-cluster-params"
    Type = "db-parameter-group"
  })
}

resource "aws_db_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "${var.environment}-whatsopi-db-params"

  # Additional instance-level parameters
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-params"
    Type = "db-parameter-group"
  })
}

# Security Group for RDS
resource "aws_security_group" "database" {
  name_prefix = "${var.environment}-whatsopi-db-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  # Allow connections from EKS nodes
  ingress {
    description = "PostgreSQL from EKS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-sg"
    Type = "security-group"
    Tier = "database"
  })
}

# RDS Aurora PostgreSQL Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier              = "${var.environment}-whatsopi-db"
  engine                         = "aurora-postgresql"
  engine_version                 = var.db_config.engine_version
  database_name                  = var.database_name
  master_username                = var.master_username
  master_password                = random_password.master.result
  
  # Network configuration
  db_subnet_group_name           = aws_db_subnet_group.main.name
  vpc_security_group_ids         = [aws_security_group.database.id]
  
  # Backup configuration for Dominican compliance
  backup_retention_period        = var.db_config.backup_retention_period
  preferred_backup_window        = "06:00-07:00"  # 2-3 AM Dominican time
  preferred_maintenance_window   = "sun:07:00-sun:08:00"  # 3-4 AM Dominican time Sunday
  copy_tags_to_snapshot         = true
  delete_automated_backups      = false
  deletion_protection           = var.environment == "production"
  
  # Encryption (required for Dominican Law 172-13)
  storage_encrypted             = true
  kms_key_id                   = aws_kms_key.database.arn
  
  # Monitoring and logging
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval            = 60
  monitoring_role_arn           = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled   = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  performance_insights_retention_period = var.environment == "production" ? 731 : 7
  
  # Parameter groups
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  
  # Skip final snapshot for non-production
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-whatsopi-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  # Enable backtrack for production (point-in-time recovery)
  backtrack_window = var.environment == "production" ? 72 : 0
  
  # Apply changes immediately for non-production
  apply_immediately = var.environment != "production"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-cluster"
    Type = "rds-cluster"
    Engine = "postgresql"
    Compliance = "Law-172-13"
  })

  lifecycle {
    ignore_changes = [master_password]
  }
}

# RDS Cluster Instances
resource "aws_rds_cluster_instance" "main" {
  count              = var.db_config.instance_count
  identifier         = "${var.environment}-whatsopi-db-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.db_config.instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  
  # Parameter group
  db_parameter_group_name = aws_db_parameter_group.main.name
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  
  # Auto minor version upgrades
  auto_minor_version_upgrade = var.environment != "production"
  
  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-instance-${count.index + 1}"
    Type = "rds-instance"
    Role = count.index == 0 ? "writer" : "reader"
  })
}

# IAM role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-whatsopi-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-rds-monitoring-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Groups for database logs
resource "aws_cloudwatch_log_group" "database" {
  name              = "/aws/rds/cluster/${aws_rds_cluster.main.cluster_identifier}/postgresql"
  retention_in_days = var.db_config.log_retention_days
  kms_key_id        = aws_kms_key.database.arn

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-logs"
    Type = "log-group"
    Compliance = "Law-172-13"
  })
}

# RDS Proxy for connection pooling and security
resource "aws_db_proxy" "main" {
  count                  = var.enable_proxy ? 1 : 0
  name                   = "${var.environment}-whatsopi-db-proxy"
  engine_family         = "POSTGRESQL"
  
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.database_credentials.arn
  }
  
  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = var.subnet_ids
  vpc_security_group_ids = [aws_security_group.proxy[0].id]
  
  # Proxy configuration optimized for Dominican market
  idle_client_timeout    = 1800  # 30 minutes
  max_connections_percent = 100
  max_idle_connections_percent = 50
  require_tls = true
  
  # Debugging for non-production
  debug_logging = var.environment != "production"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-proxy"
    Type = "db-proxy"
  })
}

resource "aws_db_proxy_default_target_group" "main" {
  count         = var.enable_proxy ? 1 : 0
  db_proxy_name = aws_db_proxy.main[0].name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  count                 = var.enable_proxy ? 1 : 0
  db_cluster_identifier = aws_rds_cluster.main.cluster_identifier
  db_proxy_name         = aws_db_proxy.main[0].name
  target_group_name     = aws_db_proxy_default_target_group.main[0].name
}

# IAM role for RDS Proxy
resource "aws_iam_role" "proxy" {
  count = var.enable_proxy ? 1 : 0
  name  = "${var.environment}-whatsopi-db-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-proxy-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy" "proxy" {
  count = var.enable_proxy ? 1 : 0
  name  = "${var.environment}-whatsopi-db-proxy-policy"
  role  = aws_iam_role.proxy[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetResourcePolicy",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = aws_secretsmanager_secret.database_credentials.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.database.arn
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Security Group for RDS Proxy
resource "aws_security_group" "proxy" {
  count       = var.enable_proxy ? 1 : 0
  name_prefix = "${var.environment}-whatsopi-db-proxy-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from application through proxy"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  ingress {
    description = "PostgreSQL from EKS through proxy"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-proxy-sg"
    Type = "security-group"
    Tier = "database-proxy"
  })
}

# CloudWatch alarms for database monitoring
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.environment}-whatsopi-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.database_alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-cpu-alarm"
    Type = "cloudwatch-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.environment}-whatsopi-db-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.db_config.max_connections * 0.8
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.database_alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-db-connections-alarm"
    Type = "cloudwatch-alarm"
  })
}

# SNS topic for database alerts
resource "aws_sns_topic" "database_alerts" {
  name              = "${var.environment}-whatsopi-database-alerts"
  kms_master_key_id = aws_kms_key.database.arn

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-database-alerts"
    Type = "sns-topic"
  })
}