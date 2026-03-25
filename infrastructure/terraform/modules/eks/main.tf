# EKS Module for WhatsOpí
# Optimized for high availability and Dominican Republic market

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "node_assume_role_policy" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# KMS Key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key for ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-kms-key"
    Type = "kms-key"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.environment}-whatsopi-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Cluster Service Role
resource "aws_iam_role" "cluster" {
  name               = "${var.environment}-whatsopi-eks-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-cluster-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSVPCResourceController" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.cluster.name
}

# EKS Cluster Security Group
resource "aws_security_group" "cluster" {
  name_prefix = "${var.environment}-whatsopi-eks-cluster-"
  vpc_id      = var.vpc_id

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-cluster-sg"
    Type = "security-group"
  })
}

# Security group rules for cluster
resource "aws_security_group_rule" "cluster_ingress_workstation_https" {
  cidr_blocks       = var.cluster_endpoint_public_access_cidrs
  description       = "Allow workstation to communicate with the cluster API Server"
  from_port         = 443
  protocol          = "tcp"
  security_group_id = aws_security_group.cluster.id
  to_port           = 443
  type              = "ingress"
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.environment}-whatsopi-eks"
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    endpoint_config {
      private_access = var.cluster_endpoint_private_access
      public_access  = var.cluster_endpoint_public_access
      public_access_cidrs = var.cluster_endpoint_public_access_cidrs
    }

    security_group_ids = [aws_security_group.cluster.id]
    subnet_ids         = var.subnet_ids
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = var.cluster_enabled_log_types

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
    aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController,
    aws_cloudwatch_log_group.cluster,
  ]

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks"
    Type = "eks-cluster"
  })
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.environment}-whatsopi-eks/cluster"
  retention_in_days = var.cluster_log_retention_in_days

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-logs"
    Type = "log-group"
  })
}

# EKS Node Group IAM Role
resource "aws_iam_role" "node" {
  name               = "${var.environment}-whatsopi-eks-node-role"
  assume_role_policy = data.aws_iam_policy_document.node_assume_role_policy.json

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-node-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy_attachment" "node_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node.name
}

# Additional IAM policies for WhatsOpí specific needs
resource "aws_iam_role_policy" "node_additional" {
  name = "${var.environment}-whatsopi-eks-node-additional"
  role = aws_iam_role.node.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::whatsopi-${var.environment}-*",
          "arn:aws:s3:::whatsopi-${var.environment}-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:whatsopi/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/whatsopi/${var.environment}/*"
      }
    ]
  })
}

# Node Group Security Group
resource "aws_security_group" "node" {
  name_prefix = "${var.environment}-whatsopi-eks-node-"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow nodes to communicate with each other"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Allow worker Kubelets and pods to receive communication from the cluster control plane"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.cluster.id]
  }

  ingress {
    description     = "Allow pods running extension API servers on port 443 to receive communication from cluster control plane"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-node-sg"
    Type = "security-group"
  })
}

# Allow cluster to communicate with nodes
resource "aws_security_group_rule" "cluster_ingress_node_https" {
  description              = "Allow pods to communicate with the cluster API Server"
  from_port                = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.node.id
  to_port                  = 443
  type                     = "ingress"
}

# EKS Node Groups
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-whatsopi-general"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.node_subnet_ids

  capacity_type  = "ON_DEMAND"
  instance_types = var.node_groups.general.instance_types

  scaling_config {
    desired_size = var.node_groups.general.desired_size
    max_size     = var.node_groups.general.max_size
    min_size     = var.node_groups.general.min_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  ami_type       = "AL2_x86_64"
  disk_size      = var.node_groups.general.disk_size
  
  labels = {
    role = "general"
    environment = var.environment
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-general-nodes"
    Type = "eks-node-group"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]
}

resource "aws_eks_node_group" "compute_intensive" {
  count = var.environment == "production" ? 1 : 0

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-whatsopi-compute"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.node_subnet_ids

  capacity_type  = "ON_DEMAND"
  instance_types = var.node_groups.compute_intensive.instance_types

  scaling_config {
    desired_size = var.node_groups.compute_intensive.desired_size
    max_size     = var.node_groups.compute_intensive.max_size
    min_size     = var.node_groups.compute_intensive.min_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  ami_type       = "AL2_x86_64"
  disk_size      = var.node_groups.compute_intensive.disk_size

  taint {
    key    = "workload-type"
    value  = "compute"
    effect = "NO_SCHEDULE"
  }

  labels = {
    role = "compute"
    environment = var.environment
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-compute-nodes"
    Type = "eks-node-group"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]
}

resource "aws_eks_node_group" "memory_intensive" {
  count = var.environment == "production" ? 1 : 0

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-whatsopi-memory"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.node_subnet_ids

  capacity_type  = "ON_DEMAND"
  instance_types = var.node_groups.memory_intensive.instance_types

  scaling_config {
    desired_size = var.node_groups.memory_intensive.desired_size
    max_size     = var.node_groups.memory_intensive.max_size
    min_size     = var.node_groups.memory_intensive.min_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  ami_type       = "AL2_x86_64"
  disk_size      = var.node_groups.memory_intensive.disk_size

  taint {
    key    = "workload-type"
    value  = "memory"
    effect = "NO_SCHEDULE"
  }

  labels = {
    role = "memory"
    environment = var.environment
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-memory-nodes"
    Type = "eks-node-group"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]
}

# EKS Addons
resource "aws_eks_addon" "vpc_cni" {
  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "vpc-cni"
  addon_version            = var.addons.vpc_cni_version
  resolve_conflicts        = "OVERWRITE"
  service_account_role_arn = aws_iam_role.vpc_cni.arn

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-vpc-cni"
    Type = "eks-addon"
  })
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "kube-proxy"
  addon_version     = var.addons.kube_proxy_version
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-kube-proxy"
    Type = "eks-addon"
  })
}

resource "aws_eks_addon" "coredns" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "coredns"
  addon_version     = var.addons.coredns_version
  resolve_conflicts = "OVERWRITE"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-coredns"
    Type = "eks-addon"
  })
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name             = aws_eks_cluster.main.name
  addon_name               = "aws-ebs-csi-driver"
  addon_version            = var.addons.ebs_csi_version
  resolve_conflicts        = "OVERWRITE"
  service_account_role_arn = aws_iam_role.ebs_csi.arn

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-ebs-csi"
    Type = "eks-addon"
  })
}

# IAM role for VPC CNI addon
resource "aws_iam_role" "vpc_cni" {
  name = "${var.environment}-whatsopi-eks-vpc-cni-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-node"
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-vpc-cni-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy_attachment" "vpc_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.vpc_cni.name
}

# IAM role for EBS CSI addon
resource "aws_iam_role" "ebs_csi" {
  name = "${var.environment}-whatsopi-eks-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.cluster.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
            "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-ebs-csi-role"
    Type = "iam-role"
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/Amazon_EBS_CSI_DriverPolicy"
  role       = aws_iam_role.ebs_csi.name
}

# OIDC Identity Provider
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(var.common_tags, {
    Name = "${var.environment}-whatsopi-eks-oidc"
    Type = "oidc-provider"
  })
}