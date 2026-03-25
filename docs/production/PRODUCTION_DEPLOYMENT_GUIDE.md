# WhatsOpí Production Deployment Guide
*Comprehensive Guide for 99.9% Uptime Deployment in Dominican Republic*

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Security Configuration](#security-configuration)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Monitoring and Observability](#monitoring-and-observability)
8. [Blue-Green Deployment Process](#blue-green-deployment-process)
9. [Security Automation](#security-automation)
10. [Compliance Verification](#compliance-verification)
11. [Disaster Recovery](#disaster-recovery)
12. [Cost Optimization](#cost-optimization)
13. [Maintenance Procedures](#maintenance-procedures)
14. [Troubleshooting](#troubleshooting)

## Overview

WhatsOpí is a fintech platform designed for the Dominican Republic's informal economy, requiring:

- **99.9% uptime SLA** (8.77 hours downtime/year maximum)
- **PCI DSS Level 1 compliance** for payment processing
- **Dominican Law 172-13 compliance** for data protection
- **Sub-2-second response times** optimized for Caribbean networks
- **Zero-downtime deployments** with instant rollback capability

### Architecture Summary

```
Internet → CloudFront CDN → AWS WAF → ALB → EKS Cluster
                                              ├─ Frontend Pods
                                              ├─ Backend Pods
                                              └─ Supporting Services
                                                  ├─ PostgreSQL (RDS Aurora)
                                                  ├─ Redis (ElastiCache)
                                                  └─ Monitoring Stack
```

## Prerequisites

### Required Tools

```bash
# Install required tools
brew install aws-cli
brew install kubectl
brew install terraform
brew install helm
brew install docker

# Install GitHub CLI
brew install gh

# Install k9s for Kubernetes management
brew install k9s
```

### AWS Account Setup

1. **AWS Account Requirements**:
   - Root account with MFA enabled
   - IAM user with AdministratorAccess policy
   - AWS CLI configured with appropriate credentials
   - Service limits increased for production workloads

2. **Domain Configuration**:
   - `whatsopi.do` domain registered and managed in Route53
   - SSL certificates provisioned via ACM
   - DNS propagation verified

3. **Compliance Prerequisites**:
   - PCI DSS Level 1 assessment scheduled
   - Dominican Law 172-13 legal review completed
   - Data Protection Officer (DPO) appointed

### Repository Setup

```bash
# Clone the repository
git clone https://github.com/exxede/whatsopi.git
cd whatsopi

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with production values

# Verify all dependencies
npm install
cd src/api && npm install && cd ../..
```

## Infrastructure Setup

### Step 1: Terraform State Management

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://whatsopi-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket whatsopi-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name whatsopi-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### Step 2: Deploy Infrastructure

```bash
# Navigate to Terraform directory
cd infrastructure/terraform/environments/production

# Initialize Terraform
terraform init

# Review the plan
terraform plan \
  -var="database_password=${DATABASE_PASSWORD}" \
  -var="redis_auth_token=${REDIS_AUTH_TOKEN}" \
  -var="domain_name=whatsopi.do"

# Apply infrastructure (this takes 20-30 minutes)
terraform apply

# Verify outputs
terraform output
```

### Step 3: Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name whatsopi-prod-eks

# Verify cluster access
kubectl get nodes
kubectl get namespaces

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=whatsopi-prod-eks \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## Security Configuration

### Step 1: Secrets Management

```bash
# Create AWS Secrets Manager secrets
aws secretsmanager create-secret \
  --name "whatsopi/production/database" \
  --description "Production database credentials" \
  --secret-string '{"password":"'${DATABASE_PASSWORD}'"}'

aws secretsmanager create-secret \
  --name "whatsopi/production/redis" \
  --description "Production Redis auth token" \
  --secret-string '{"auth_token":"'${REDIS_AUTH_TOKEN}'"}'

# Create application secrets
aws secretsmanager create-secret \
  --name "whatsopi/production/application" \
  --description "Application secrets" \
  --secret-string '{
    "jwt_secret":"'${JWT_SECRET}'",
    "encryption_key":"'${ENCRYPTION_KEY}'",
    "whatsapp_token":"'${WHATSAPP_TOKEN}'",
    "payment_api_key":"'${PAYMENT_API_KEY}'"
  }'
```

### Step 2: Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace production

# Create Kubernetes secrets from AWS Secrets Manager
kubectl create secret generic whatsopi-secrets \
  --namespace=production \
  --from-literal=DATABASE_URL="postgresql://whatsopi:${DATABASE_PASSWORD}@${DB_ENDPOINT}:5432/whatsopi" \
  --from-literal=REDIS_URL="redis://:${REDIS_AUTH_TOKEN}@${REDIS_ENDPOINT}:6379" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  --from-literal=WHATSAPP_TOKEN="${WHATSAPP_TOKEN}" \
  --from-literal=PAYMENT_API_KEY="${PAYMENT_API_KEY}"
```

### Step 3: Security Policies

```bash
# Apply Pod Security Standards
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
EOF

# Apply Network Policies
kubectl apply -f k8s/production/network-policies.yaml
```

## Database Setup

### Step 1: Database Initialization

```bash
# Connect to RDS instance
export DB_ENDPOINT=$(terraform output -raw database_cluster_endpoint)
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id whatsopi/production/database --query SecretString --output text | jq -r .password)

# Connect via psql (from bastion host or authorized IP)
psql -h $DB_ENDPOINT -U whatsopi -d whatsopi

# Run initial schema
psql -h $DB_ENDPOINT -U whatsopi -d whatsopi -f database/schema.sql

# Create necessary indexes for performance
psql -h $DB_ENDPOINT -U whatsopi -d whatsopi -f database/indexes.sql

# Set up audit logging
CREATE EXTENSION IF NOT EXISTS pg_audit;
```

### Step 2: Database Security Configuration

```sql
-- Create read-only user for monitoring
CREATE USER postgres_exporter WITH PASSWORD 'secure_monitoring_password';
GRANT CONNECT ON DATABASE whatsopi TO postgres_exporter;
GRANT USAGE ON SCHEMA public TO postgres_exporter;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres_exporter;

-- Create backup user
CREATE USER backup_user WITH PASSWORD 'secure_backup_password';
GRANT CONNECT ON DATABASE whatsopi TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- Enable row level security for sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_data_policy ON users FOR ALL TO whatsopi USING (true);

-- Set up audit policies
SELECT pg_audit.log_catalog = on;
SELECT pg_audit.log = 'all';
```

### Step 3: Database Performance Optimization

```sql
-- Optimize for Dominican Republic workload
ALTER SYSTEM SET timezone = 'America/Santo_Domingo';
ALTER SYSTEM SET log_timezone = 'America/Santo_Domingo';

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- Reload configuration
SELECT pg_reload_conf();
```

## Application Deployment

### Step 1: Container Images

```bash
# Build and push container images
docker build -f docker/Dockerfile.frontend -t whatsopi/frontend:v1.0.0 .
docker build -f docker/Dockerfile.api -t whatsopi/backend:v1.0.0 .

# Tag and push to ECR
export ECR_REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

docker tag whatsopi/frontend:v1.0.0 $ECR_REGISTRY/whatsopi-frontend:v1.0.0
docker tag whatsopi/backend:v1.0.0 $ECR_REGISTRY/whatsopi-backend:v1.0.0

docker push $ECR_REGISTRY/whatsopi-frontend:v1.0.0
docker push $ECR_REGISTRY/whatsopi-backend:v1.0.0
```

### Step 2: Deploy to Kubernetes

```bash
# Apply blue-green deployment manifests
kubectl apply -f k8s/production/blue-green-deployment.yaml

# Verify deployments
kubectl get deployments -n production
kubectl get pods -n production
kubectl get services -n production

# Check pod status
kubectl describe pods -n production -l app=whatsopi-frontend
kubectl describe pods -n production -l app=whatsopi-backend
```

### Step 3: Verify Application Health

```bash
# Check application health
kubectl port-forward -n production svc/whatsopi-frontend 8080:80 &
curl http://localhost:8080/health

kubectl port-forward -n production svc/whatsopi-backend 8081:80 &
curl http://localhost:8081/api/health

# Verify external access
curl -I https://whatsopi.do/health
curl -I https://api.whatsopi.do/health
```

## Monitoring and Observability

### Step 1: Deploy Monitoring Stack

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus/values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword=${GRAFANA_ADMIN_PASSWORD} \
  --values monitoring/grafana/values.yaml
```

### Step 2: Configure Alerting

```bash
# Apply Prometheus rules
kubectl apply -f monitoring/prometheus/rules/

# Configure Alertmanager
kubectl create secret generic alertmanager-config \
  --namespace monitoring \
  --from-file=monitoring/alertmanager/alertmanager.yml

# Restart Alertmanager
kubectl rollout restart statefulset/alertmanager-prometheus-kube-prometheus-alertmanager -n monitoring
```

### Step 3: Import Dashboards

```bash
# Get Grafana admin password
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Access Grafana
kubectl port-forward --namespace monitoring svc/grafana 3000:80

# Import dashboards via API or UI
curl -X POST \
  http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana-dashboards.json
```

## Blue-Green Deployment Process

### Initial Deployment (Blue Environment)

```bash
# Verify blue environment is running
kubectl get deployments -n production -l version=blue

# Check service routing
kubectl describe service whatsopi-frontend -n production
kubectl describe service whatsopi-backend -n production
```

### Deploy New Version (Green Environment)

```bash
# Update image tags for green deployment
kubectl set image deployment/whatsopi-frontend-green \
  whatsopi-frontend=$ECR_REGISTRY/whatsopi-frontend:v1.0.1 \
  -n production

kubectl set image deployment/whatsopi-backend-green \
  whatsopi-backend=$ECR_REGISTRY/whatsopi-backend:v1.0.1 \
  -n production

# Scale up green environment
kubectl scale deployment/whatsopi-frontend-green --replicas=3 -n production
kubectl scale deployment/whatsopi-backend-green --replicas=5 -n production

# Wait for green environment to be ready
kubectl rollout status deployment/whatsopi-frontend-green -n production
kubectl rollout status deployment/whatsopi-backend-green -n production
```

### Traffic Switch (Blue to Green)

```bash
# Update service selectors to point to green
kubectl patch service whatsopi-frontend -n production -p '{"spec":{"selector":{"version":"green"}}}'
kubectl patch service whatsopi-backend -n production -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic is flowing to green
kubectl get endpoints -n production
```

### Verification and Cleanup

```bash
# Monitor green environment for 15 minutes
kubectl top pods -n production -l version=green
kubectl logs -f deployment/whatsopi-frontend-green -n production
kubectl logs -f deployment/whatsopi-backend-green -n production

# Run smoke tests
npm run test:production-smoke

# If all good, scale down blue environment
kubectl scale deployment/whatsopi-frontend-blue --replicas=0 -n production
kubectl scale deployment/whatsopi-backend-blue --replicas=0 -n production
```

### Rollback Procedure (if needed)

```bash
# Immediate rollback to blue
kubectl patch service whatsopi-frontend -n production -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl patch service whatsopi-backend -n production -p '{"spec":{"selector":{"version":"blue"}}}'

# Scale up blue environment
kubectl scale deployment/whatsopi-frontend-blue --replicas=3 -n production
kubectl scale deployment/whatsopi-backend-blue --replicas=5 -n production

# Verify rollback
curl -f https://whatsopi.do/health
curl -f https://api.whatsopi.do/health
```

## Security Automation

### Step 1: Container Security Scanning

```bash
# Install Trivy for container scanning
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan images before deployment
trivy image --severity HIGH,CRITICAL $ECR_REGISTRY/whatsopi-frontend:v1.0.0
trivy image --severity HIGH,CRITICAL $ECR_REGISTRY/whatsopi-backend:v1.0.0

# Set up automated scanning in ECR
aws ecr put-image-scanning-configuration \
  --repository-name whatsopi-frontend \
  --image-scanning-configuration scanOnPush=true

aws ecr put-image-scanning-configuration \
  --repository-name whatsopi-backend \
  --image-scanning-configuration scanOnPush=true
```

### Step 2: Compliance Scanning

```bash
# Run PCI DSS compliance checks
./scripts/pci-dss-scan.sh

# Run Dominican Law 172-13 compliance checks
./scripts/law-172-13-scan.sh

# Generate compliance reports
./scripts/generate-compliance-report.sh
```

### Step 3: Security Monitoring

```bash
# Install Falco for runtime security
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco-system \
  --create-namespace \
  --set falco.grpc.enabled=true \
  --set falco.grpcOutput.enabled=true

# Apply security monitoring rules
kubectl apply -f security/falco-rules.yaml
```

## Compliance Verification

### PCI DSS Level 1 Verification

```bash
# Network segmentation check
./scripts/verify-network-segmentation.sh

# Encryption verification
./scripts/verify-encryption.sh

# Access control audit
./scripts/audit-access-controls.sh

# Generate PCI DSS report
./scripts/generate-pci-report.sh
```

### Dominican Law 172-13 Verification

```bash
# Data processing audit
./scripts/audit-data-processing.sh

# Privacy rights verification
./scripts/verify-privacy-rights.sh

# Consent management check
./scripts/verify-consent-management.sh

# Generate privacy compliance report
./scripts/generate-privacy-report.sh
```

## Disaster Recovery

### Database Backup Verification

```bash
# Verify automated backups
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier whatsopi-prod-cluster \
  --query 'DBClusterSnapshots[0]'

# Test point-in-time recovery
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier whatsopi-test-restore \
  --source-db-cluster-identifier whatsopi-prod-cluster \
  --restore-to-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S.000Z)
```

### Cross-Region Replication

```bash
# Verify read replica in DR region
aws rds describe-db-clusters \
  --region us-east-2 \
  --db-cluster-identifier whatsopi-prod-replica

# Test failover procedure
./scripts/test-dr-failover.sh
```

### S3 Cross-Region Replication

```bash
# Verify replication
aws s3 ls s3://whatsopi-static-assets-replica/ --region us-east-2
aws s3 ls s3://whatsopi-backups-replica/ --region us-east-2
```

## Cost Optimization

### Reserved Instances

```bash
# Purchase Reserved Instances for consistent workloads
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 10

# Monitor RI utilization
aws ce get-reservation-utilization \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Auto-Scaling Configuration

```bash
# Verify HPA is working
kubectl get hpa -n production

# Monitor scaling events
kubectl describe hpa whatsopi-frontend-hpa -n production
kubectl describe hpa whatsopi-backend-hpa -n production

# Configure cluster autoscaler
kubectl apply -f k8s/cluster-autoscaler.yaml
```

### Cost Monitoring

```bash
# Set up cost alerts
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://cost-monitoring/budget.json
```

## Maintenance Procedures

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash
# Update system packages
kubectl apply -f k8s/maintenance/

# Database maintenance
psql -h $DB_ENDPOINT -U whatsopi -d whatsopi -c "VACUUM ANALYZE;"

# Clean up old container images
aws ecr list-images --repository-name whatsopi-frontend --filter tagStatus=UNTAGGED \
  --query 'imageIds[?imageDigest!=null]' | jq '.[] | select(.imagePushedAt < (now - 86400 * 7))' | \
  aws ecr batch-delete-image --repository-name whatsopi-frontend --image-ids file:///dev/stdin

# Generate weekly reports
./scripts/generate-weekly-report.sh
```

### Security Updates

```bash
# Update Kubernetes cluster
aws eks update-cluster-version \
  --name whatsopi-prod-eks \
  --version 1.28

# Update node groups
aws eks update-nodegroup-version \
  --cluster-name whatsopi-prod-eks \
  --nodegroup-name general-workloads

# Update application dependencies
npm audit fix
cd src/api && npm audit fix && cd ../..
```

## Troubleshooting

### Common Issues

#### High Latency from Dominican Republic

```bash
# Check CloudFront cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Test from Dominican Republic
curl -w "@curl-format.txt" -o /dev/null -s https://whatsopi.do
```

#### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it deployment/whatsopi-backend -n production -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Monitor database connections
kubectl exec -it deployment/whatsopi-backend -n production -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pooling
kubectl logs -f deployment/whatsopi-backend -n production | grep -i connection
```

#### Payment Processing Failures

```bash
# Check payment service logs
kubectl logs -f deployment/whatsopi-backend -n production | grep -i payment

# Verify payment provider connectivity
kubectl exec -it deployment/whatsopi-backend -n production -- \
  curl -f https://api.payment-provider.com/health

# Check PCI DSS compliance status
./scripts/verify-pci-compliance.sh
```

### Emergency Procedures

#### Complete System Outage

```bash
# 1. Check ALB health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# 2. Check EKS cluster status
aws eks describe-cluster --name whatsopi-prod-eks

# 3. Scale up all deployments
kubectl scale deployment --all --replicas=5 -n production

# 4. Activate disaster recovery
./scripts/activate-dr.sh

# 5. Notify stakeholders
./scripts/send-outage-notification.sh
```

#### Security Incident Response

```bash
# 1. Isolate affected systems
kubectl apply -f security/incident-response/network-isolation.yaml

# 2. Collect evidence
kubectl logs --all-containers=true -n production > incident-logs.txt
./scripts/collect-security-evidence.sh

# 3. Notify authorities (if required by Dominican Law 172-13)
./scripts/notify-data-protection-authority.sh

# 4. Begin remediation
./scripts/incident-remediation.sh
```

## Production Checklist

### Pre-Deployment Checklist

- [ ] All security scans passed (Trivy, Semgrep)
- [ ] PCI DSS compliance verified
- [ ] Dominican Law 172-13 compliance verified
- [ ] Database backups verified
- [ ] Disaster recovery tested
- [ ] Monitoring and alerting configured
- [ ] Load testing completed
- [ ] Dominican network performance tested
- [ ] Stakeholder approval obtained

### Post-Deployment Checklist

- [ ] Application health verified
- [ ] Performance metrics within SLA
- [ ] Security monitoring active
- [ ] Compliance reports generated
- [ ] Backup verification completed
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] User communication sent (if needed)

### Go-Live Checklist

- [ ] DNS propagation complete
- [ ] SSL certificates valid
- [ ] CDN configuration optimized
- [ ] Payment processing tested
- [ ] WhatsApp integration verified
- [ ] Dominican user testing completed
- [ ] Support team briefed
- [ ] Runbooks updated
- [ ] Success metrics baseline established

---

## Contact Information

- **DevOps Lead**: devops@whatsopi.do
- **Security Officer**: security@whatsopi.do
- **Data Protection Officer**: dpo@whatsopi.do
- **Armando Diaz Silverio (CEO)**: armando@exxede.com
- **Emergency Hotline**: +1-809-555-0123

## Documentation Updates

This document should be reviewed and updated:
- After every major deployment
- Quarterly for compliance requirements
- Annually for comprehensive review
- Immediately after any security incidents

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Version**: 1.0.0