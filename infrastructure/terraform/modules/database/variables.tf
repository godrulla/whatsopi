# Database Module Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID where the database will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the database"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access the database"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the database"
  type        = list(string)
  default     = []
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "whatsopi"
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "whatsopi_admin"
}

variable "enable_proxy" {
  description = "Whether to enable RDS Proxy"
  type        = bool
  default     = true
}

variable "db_config" {
  description = "Database configuration"
  type = object({
    engine_version           = string
    instance_class          = string
    instance_count          = number
    max_connections         = number
    backup_retention_period = number
    log_retention_days      = number
  })
  default = {
    engine_version           = "15.3"
    instance_class          = "db.r6g.large"
    instance_count          = 2
    max_connections         = 100
    backup_retention_period = 7
    log_retention_days      = 30
  }
}

variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "WhatsOpí"
    ManagedBy   = "Terraform"
    Environment = ""
    Region      = "DominicanRepublic"
    Compliance  = "Law-172-13"
  }
}