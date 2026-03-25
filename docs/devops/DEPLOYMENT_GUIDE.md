# WhatsOpí Deployment Guide
**Production-Ready Infrastructure for the Dominican Republic Market**

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Application Deployment](#application-deployment)
6. [Database Migration](#database-migration)
7. [Monitoring Setup](#monitoring-setup)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Disaster Recovery](#disaster-recovery)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedures](#rollback-procedures)

## Overview

WhatsOpí is deployed using a modern, cloud-native architecture optimized for the Dominican Republic market. The infrastructure is designed to support:

- **High Availability**: 99.9% uptime target
- **Scalability**: 0-100,000+ concurrent users
- **Security**: Dominican Law 172-13 compliance
- **Performance**: Sub-second response times on Caribbean networks
- **Cultural Appropriateness**: Dominican Spanish and Haitian Creole support

### Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│  Load Balancer   │────│   EKS Cluster   │
│   (CDN/WAF)     │    │     (ALB)        │    │  (Kubernetes)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             │
                       │   RDS Aurora     │─────────────┘
                       │  (PostgreSQL)    │
                       └──────────────────┘
```

## Prerequisites

### Required Tools

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Terraform v1.5+
brew install terraform

# kubectl v1.28+
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm v3.12+
brew install helm

# Docker
brew install docker

# jq for JSON processing
brew install jq
```

### AWS Permissions

Your AWS IAM user/role needs these permissions:
- `AmazonEKSClusterPolicy`
- `AmazonEKSWorkerNodePolicy`
- `AmazonEKS_CNI_Policy`
- `AmazonEC2ContainerRegistryReadOnly`
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`
- `AmazonRoute53FullAccess`
- `CloudWatchFullAccess`
- `IAMFullAccess` (for service roles)

### Dominican Republic Specific Requirements

- **Data Residency**: All data must remain in approved AWS regions
- **Encryption**: AES-256 encryption at rest and TLS 1.2+ in transit
- **Compliance**: Dominican Law 172-13 data protection requirements
- **Network**: Optimized for Caribbean network conditions

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/whatsopi.git
cd whatsopi
```

### 2. Configure AWS Profile

```bash
aws configure --profile whatsopi-prod
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-1
# Default output format: json

export AWS_PROFILE=whatsopi-prod
```

### 3. Environment Variables

Create environment-specific `.env` files:

```bash
# .env.production
NODE_ENV=production
AWS_REGION=us-east-1
ENVIRONMENT=production

# Dominican Republic specific settings
DEFAULT_LANGUAGE=es-DO
DEFAULT_CURRENCY=DOP
DEFAULT_COUNTRY=DO
TIMEZONE=America/Santo_Domingo
CULTURAL_CONTEXT=dominican

# Security settings
ENCRYPTION_ENABLED=true
COMPLIANCE_MODE=law-172-13
AUDIT_LOG_LEVEL=comprehensive

# Performance settings
CDN_ENABLED=true
CACHE_ENABLED=true
EDGE_LOCATIONS=miami,atlanta,dallas

# WhatsApp Business API
WHATSAPP_BUSINESS_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=[secure-token]

# Payment providers
TPAGO_API_URL=https://api.tpago.do
PAYPAL_API_URL=https://api.paypal.com
```

## Infrastructure Deployment

### 1. Terraform State Backend

First, create S3 bucket and DynamoDB table for Terraform state:

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://whatsopi-terraform-state-$(date +%s) --region us-east-1

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name whatsopi-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform/environments/production

# Initialize Terraform
terraform init \
  -backend-config="bucket=whatsopi-terraform-state-[timestamp]" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=whatsopi-terraform-locks"
```

### 3. Plan Infrastructure

```bash
# Review the deployment plan
terraform plan -var-file="production.tfvars" -out=production.tfplan

# Verify the plan includes:
# - VPC with 3 AZs
# - EKS cluster with node groups
# - RDS Aurora PostgreSQL cluster
# - CloudFront distribution
# - WAF configuration
# - KMS keys for encryption
```

### 4. Deploy Infrastructure

```bash
# Apply the infrastructure
terraform apply production.tfplan

# This will create:
# - Network infrastructure (15-20 minutes)
# - EKS cluster (10-15 minutes)
# - RDS cluster (15-25 minutes)
# - Total deployment time: ~45-60 minutes
```

### 5. Verify Infrastructure

```bash
# Verify EKS cluster
aws eks describe-cluster --name production-whatsopi-eks --region us-east-1

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name production-whatsopi-eks

# Verify nodes
kubectl get nodes

# Verify RDS cluster
aws rds describe-db-clusters --db-cluster-identifier production-whatsopi-db
```

## Application Deployment

### 1. Container Registry Setup

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account-id].dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name whatsopi/frontend --region us-east-1
aws ecr create-repository --repository-name whatsopi/api --region us-east-1
```

### 2. Build and Push Images

```bash
# Build frontend image
docker build -f docker/Dockerfile.frontend -t whatsopi-frontend:latest .
docker tag whatsopi-frontend:latest [account-id].dkr.ecr.us-east-1.amazonaws.com/whatsopi/frontend:latest
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/whatsopi/frontend:latest

# Build API image
docker build -f docker/Dockerfile.api -t whatsopi-api:latest .
docker tag whatsopi-api:latest [account-id].dkr.ecr.us-east-1.amazonaws.com/whatsopi/api:latest
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/whatsopi/api:latest
```

### 3. Kubernetes Configuration

Create namespace and secrets:

```bash
# Create namespace
kubectl create namespace whatsopi

# Create database secret (from Terraform output)
kubectl create secret generic database-credentials \
  --from-literal=host=[rds-endpoint] \
  --from-literal=port=5432 \
  --from-literal=database=whatsopi \
  --from-literal=username=[username] \
  --from-literal=password=[password] \
  --namespace whatsopi

# Create API secrets
kubectl create secret generic api-secrets \
  --from-literal=jwt-secret=[secure-jwt-secret] \
  --from-literal=whatsapp-token=[whatsapp-token] \
  --from-literal=tpago-api-key=[tpago-key] \
  --from-literal=paypal-client-id=[paypal-id] \
  --from-literal=paypal-client-secret=[paypal-secret] \
  --namespace whatsopi
```

### 4. Helm Chart Deployment

```bash
cd helm

# Install WhatsOpí application
helm upgrade --install whatsopi ./whatsopi \
  --namespace whatsopi \
  --values values-production.yaml \
  --set image.frontend.tag=latest \
  --set image.api.tag=latest \
  --set environment=production \
  --set region=us-east-1 \
  --wait --timeout 600s
```

### 5. Ingress Configuration

```bash
# Verify ingress controller
kubectl get pods -n kube-system | grep alb

# Check ingress status
kubectl get ingress -n whatsopi

# Verify SSL certificate
kubectl describe ingress whatsopi-ingress -n whatsopi
```

## Database Migration

### 1. Database Initialization

```bash
# Port forward to database (for initial setup)
kubectl port-forward svc/whatsopi-api 3000:3000 -n whatsopi &

# Run database migrations
npm run db:migrate:production

# Seed initial data
npm run db:seed:production

# Verify database setup
npm run db:status:production
```

### 2. Database Security

```bash
# Verify encryption at rest
aws rds describe-db-clusters \
  --db-cluster-identifier production-whatsopi-db \
  --query 'DBClusters[0].StorageEncrypted'

# Check backup configuration
aws rds describe-db-clusters \
  --db-cluster-identifier production-whatsopi-db \
  --query 'DBClusters[0].BackupRetentionPeriod'
```

## Monitoring Setup

### 1. Prometheus and Grafana

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus-values.yaml

# Install Grafana
helm upgrade --install grafana grafana/grafana \
  --namespace monitoring \
  --values monitoring/grafana-values.yaml
```

### 2. Import Dashboards

```bash
# Import WhatsOpí dashboard
kubectl apply -f monitoring/grafana-dashboards.json -n monitoring

# Verify dashboard import
kubectl get configmaps -n monitoring | grep dashboard
```

### 3. Alert Manager Configuration

```bash
# Configure alerts for Dominican Republic specific metrics
kubectl apply -f monitoring/alertmanager-config.yaml -n monitoring

# Verify alert rules
kubectl get prometheusrules -n monitoring
```

## Security Configuration

### 1. WAF Rules

The WAF is configured automatically via Terraform with rules for:
- Rate limiting (2000 requests/5min per IP)
- Geographic blocking of high-risk countries
- SQL injection protection
- XSS protection
- Common exploit protection

### 2. Network Security

```bash
# Verify security groups
aws ec2 describe-security-groups \
  --filters "Name=tag:Environment,Values=production" \
  --query 'SecurityGroups[?contains(GroupName, `whatsopi`)].{Name:GroupName,ID:GroupId}'

# Check VPC Flow Logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/vpc/flowlogs"
```

### 3. Certificate Management

```bash
# Verify SSL certificates
aws acm list-certificates \
  --certificate-statuses ISSUED \
  --query 'CertificateSummaryList[?contains(DomainName, `whatsopi`)].{Domain:DomainName,Arn:CertificateArn}'
```

## Performance Optimization

### 1. CDN Configuration

CloudFront is configured for optimal Dominican Republic performance:
- Edge locations: Miami, Atlanta, Dallas
- Cache policies optimized for static assets
- Compression enabled for text content
- HTTP/2 support enabled

### 2. Database Performance

```bash
# Monitor database performance
aws rds describe-db-cluster-parameters \
  --db-cluster-parameter-group-name production-whatsopi-cluster-params \
  --query 'Parameters[?contains(ParameterName, `work_mem`)]'

# Check Performance Insights
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier [db-resource-id] \
  --metric-queries file://monitoring/db-metrics.json
```

### 3. Auto Scaling

```bash
# Verify HPA configuration
kubectl get hpa -n whatsopi

# Check cluster autoscaler
kubectl get pods -n kube-system | grep cluster-autoscaler

# Monitor scaling events
kubectl get events --sort-by=.metadata.creationTimestamp -n whatsopi
```

## Disaster Recovery

### 1. Backup Verification

```bash
# Verify automated backups
aws rds describe-db-cluster-automated-backups \
  --db-cluster-identifier production-whatsopi-db

# Check cross-region replication
aws s3api get-bucket-replication \
  --bucket whatsopi-production-assets

# Verify EBS snapshots
aws ec2 describe-snapshots \
  --owner-ids self \
  --filters "Name=tag:Environment,Values=production"
```

### 2. Disaster Recovery Testing

```bash
# Test database restore (in staging)
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier test-restore-cluster \
  --snapshot-identifier [snapshot-id] \
  --engine aurora-postgresql

# Test cross-region failover
# This should be done during maintenance windows
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n whatsopi

# View pod logs
kubectl logs -f deployment/whatsopi-api -n whatsopi

# Describe pod for events
kubectl describe pod [pod-name] -n whatsopi

# Common fixes:
# - Check image pull secrets
# - Verify resource limits
# - Check environment variables
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/whatsopi-api -n whatsopi -- \
  psql -h [db-endpoint] -p 5432 -U [username] -d whatsopi

# Check security groups
aws ec2 describe-security-groups \
  --group-ids [db-security-group-id]

# Verify secrets
kubectl get secret database-credentials -n whatsopi -o yaml
```

#### 3. Load Balancer Issues

```bash
# Check ALB status
kubectl describe ingress whatsopi-ingress -n whatsopi

# View ALB target groups
aws elbv2 describe-target-groups \
  --names [target-group-name]

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn [target-group-arn]
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top pods -n whatsopi
kubectl top nodes

# Monitor database performance
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier production-whatsopi-db

# CloudFront cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=[distribution-id] \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### Dominican Republic Specific Issues

#### Voice Processing Accuracy

```bash
# Check voice service health
kubectl logs -f deployment/whatsopi-voice -n whatsopi

# Monitor Dominican Spanish accuracy
curl -X POST https://api.whatsopi.do/voice/test \
  -H "Content-Type: application/json" \
  -d '{"text":"Klk tiguer, busco pollo barato","language":"es-DO"}'
```

#### Payment Integration Issues

```bash
# Test tPago integration
curl -X POST https://api.whatsopi.do/payments/test/tpago \
  -H "Authorization: Bearer [token]"

# Check PayPal DOP conversion
curl -X GET https://api.whatsopi.do/payments/exchange-rate/USD/DOP
```

## Rollback Procedures

### 1. Application Rollback

```bash
# Rollback to previous Helm release
helm rollback whatsopi -n whatsopi

# Or rollback to specific revision
helm rollback whatsopi 2 -n whatsopi

# Verify rollback
helm history whatsopi -n whatsopi
kubectl get pods -n whatsopi
```

### 2. Database Rollback

```bash
# For major issues, restore from backup
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier production-whatsopi-db \
  --db-cluster-identifier production-whatsopi-db-restored \
  --restore-to-time [timestamp]

# Switch application to restored database
kubectl patch deployment whatsopi-api -n whatsopi \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","env":[{"name":"DB_HOST","value":"[new-endpoint]"}]}]}}}}'
```

### 3. Infrastructure Rollback

```bash
# Rollback Terraform changes
cd infrastructure/terraform/environments/production
terraform plan -destroy -target=[resource] -var-file="production.tfvars"

# For complete rollback
terraform destroy -var-file="production.tfvars"
```

### 4. Emergency Procedures

#### Circuit Breaker Activation

```bash
# Enable maintenance mode
kubectl patch ingress whatsopi-ingress -n whatsopi \
  --type='json' \
  -p='[{"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1default-backend", "value": "maintenance-service"}]'
```

#### Traffic Diversion

```bash
# Divert traffic to static page
aws route53 change-resource-record-sets \
  --hosted-zone-id [zone-id] \
  --change-batch file://emergency-dns-change.json
```

## Health Checks and Monitoring

### Application Health

```bash
# API health check
curl -f https://api.whatsopi.do/health

# Frontend health check  
curl -f https://whatsopi.do/health

# Database health check
kubectl exec -it deployment/whatsopi-api -n whatsopi -- \
  npm run health:database
```

### Infrastructure Health

```bash
# EKS cluster health
kubectl get componentstatuses

# RDS cluster health
aws rds describe-db-clusters \
  --db-cluster-identifier production-whatsopi-db \
  --query 'DBClusters[0].Status'

# CloudFront distribution health
aws cloudfront get-distribution \
  --id [distribution-id] \
  --query 'Distribution.Status'
```

## Performance Benchmarks

### Dominican Republic Targets

- **API Response Time**: < 500ms (95th percentile)
- **Page Load Time**: < 2 seconds on 3G networks
- **Voice Processing**: < 2 seconds for Dominican Spanish
- **Database Query Time**: < 100ms average
- **CDN Cache Hit Rate**: > 90%

### Monitoring Commands

```bash
# Run performance tests
npm run test:performance:production

# Generate load test report
npm run test:load:dominican-network

# Voice accuracy test
npm run test:voice:dominican-spanish
```

---

## Support and Contacts

### Technical Support
- **DevOps Team**: devops@whatsopi.do
- **Security Team**: security@whatsopi.do
- **Database Team**: dba@whatsopi.do

### Emergency Contacts
- **Production Issues**: +1-809-XXX-XXXX
- **Security Incidents**: security-emergency@whatsopi.do
- **Escalation**: cto@whatsopi.do

### Documentation Updates
This guide is maintained by the DevOps team and updated monthly. For the latest version, check the repository's main branch.

**Last Updated**: January 2024  
**Version**: 1.0  
**Next Review**: April 2024