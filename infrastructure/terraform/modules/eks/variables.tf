# EKS Module Variables

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
  description = "VPC ID where the cluster will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "node_subnet_ids" {
  description = "List of subnet IDs for EKS worker nodes"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "cluster_endpoint_private_access" {
  description = "Enable private API server endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the public endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_enabled_log_types" {
  description = "List of enabled EKS cluster log types"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_in_days" {
  description = "Retention period for EKS cluster logs"
  type        = number
  default     = 30
}

variable "node_groups" {
  description = "EKS Node Groups configuration"
  type = object({
    general = object({
      instance_types = list(string)
      min_size       = number
      max_size       = number
      desired_size   = number
      disk_size      = number
    })
    compute_intensive = object({
      instance_types = list(string)
      min_size       = number
      max_size       = number
      desired_size   = number
      disk_size      = number
    })
    memory_intensive = object({
      instance_types = list(string)
      min_size       = number
      max_size       = number
      desired_size   = number
      disk_size      = number
    })
  })
  default = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
    }
    compute_intensive = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
    }
    memory_intensive = {
      instance_types = ["r5.large", "r5.xlarge"]
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
    }
  }
}

variable "addons" {
  description = "EKS addons configuration"
  type = object({
    vpc_cni_version     = string
    kube_proxy_version  = string
    coredns_version     = string
    ebs_csi_version     = string
  })
  default = {
    vpc_cni_version     = "v1.15.1-eksbuild.1"
    kube_proxy_version  = "v1.28.2-eksbuild.2"
    coredns_version     = "v1.10.1-eksbuild.5"
    ebs_csi_version     = "v1.24.0-eksbuild.1"
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