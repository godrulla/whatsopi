# EKS Module Outputs

output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "Security group ID attached to the EKS node groups"
  value       = aws_security_group.node.id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster OIDC Issuer"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider"
  value       = aws_iam_openid_connect_provider.cluster.arn
}

# Node group outputs
output "node_groups" {
  description = "EKS node groups"
  value = {
    general = {
      arn         = aws_eks_node_group.general.arn
      status      = aws_eks_node_group.general.status
      capacity_type = aws_eks_node_group.general.capacity_type
    }
    compute_intensive = var.environment == "production" ? {
      arn         = aws_eks_node_group.compute_intensive[0].arn
      status      = aws_eks_node_group.compute_intensive[0].status
      capacity_type = aws_eks_node_group.compute_intensive[0].capacity_type
    } : null
    memory_intensive = var.environment == "production" ? {
      arn         = aws_eks_node_group.memory_intensive[0].arn
      status      = aws_eks_node_group.memory_intensive[0].status
      capacity_type = aws_eks_node_group.memory_intensive[0].capacity_type
    } : null
  }
}

# IAM role outputs
output "cluster_iam_role_arn" {
  description = "IAM role ARN of the EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "node_iam_role_arn" {
  description = "IAM role ARN of the EKS node group"
  value       = aws_iam_role.node.arn
}

# KMS key output
output "kms_key_arn" {
  description = "ARN of the KMS key used for EKS cluster encryption"
  value       = aws_kms_key.eks.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for EKS cluster encryption"
  value       = aws_kms_key.eks.key_id
}

# CloudWatch log group
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for EKS cluster logs"
  value       = aws_cloudwatch_log_group.cluster.name
}

# Kubeconfig command
output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}