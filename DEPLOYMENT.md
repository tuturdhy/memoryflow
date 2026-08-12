# MemoryFlow Deployment Guide

Complete deployment instructions for AWS Lambda and other cloud platforms.

## Table of Contents

1. [Local Development](#local-development)
2. [AWS Lambda Deployment](#aws-lambda-deployment)
3. [CockroachDB Cloud Setup](#cockroachdb-cloud-setup)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/memoryflow.git
cd memoryflow

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Edit .env.local with your credentials
nano .env.local

# 5. Initialize database
npm run db:init

# 6. Start development server
npm run dev
```

### Verify Installation

- Open http://localhost:3000
- Try Chat: http://localhost:3000/chat
- Try Dashboard: http://localhost:3000/dashboard

---

## AWS Lambda Deployment

### Architecture

```
CloudFront (CDN)
    ↓
API Gateway
    ↓
Lambda (API Layer)
    ↓
CockroachDB (Memory Layer)
```

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker (optional, for local testing)
- Permissions: Lambda, API Gateway, CloudWatch, IAM

### Step 1: Prepare Application

```bash
# Build for production
npm run build

# Create deployment package
zip -r lambda-deploy.zip . \
  -x "*.git*" ".env*" "node_modules/*" "scripts/*"
```

### Step 2: Create IAM Role

```bash
# Create Lambda execution role
aws iam create-role \
  --role-name MemoryFlowLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name MemoryFlowLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name MemoryFlowLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess
```

### Step 3: Create Lambda Function

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create function
aws lambda create-function \
  --function-name memoryflow-api \
  --runtime nodejs18.x \
  --role arn:aws:iam::${ACCOUNT_ID}:role/MemoryFlowLambdaRole \
  --handler .next/server/pages/api.handler \
  --zip-file fileb://lambda-deploy.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{
    DATABASE_URL=postgresql://...,
    GROQ_API_KEY=...,
    NODE_ENV=production
  }"
```

### Step 4: Set Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name memoryflow-api \
  --environment Variables="{
    DATABASE_URL=${DATABASE_URL},
    GROQ_API_KEY=${GROQ_API_KEY},
    AWS_REGION=us-east-1,
    NODE_ENV=production
  }"
```

### Step 5: Create API Gateway

```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api \
  --name "MemoryFlow API" \
  --description "API for MemoryFlow agent" \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[0].id' \
  --output text)

# Create resource for /api/{proxy+}
PROXY_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part '{proxy+}' \
  --query 'id' \
  --output text)

# Create method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $PROXY_ID \
  --http-method ANY \
  --authorization-type NONE

# Create Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $PROXY_ID \
  --http-method ANY \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:memoryflow-api/invocations

# Deploy API
STAGE=$(aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --query 'id' \
  --output text)

echo "API Endpoint: https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod"
```

### Step 6: Lambda Permissions

```bash
# Allow API Gateway to invoke Lambda
aws lambda add-permission \
  --function-name memoryflow-api \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*/*
```

### Step 7: Deploy Frontend to S3

```bash
# Create S3 bucket
S3_BUCKET="memoryflow-frontend-$(date +%s)"
aws s3 mb s3://${S3_BUCKET} --region us-east-1

# Configure for static website hosting
aws s3 website s3://${S3_BUCKET} \
  --index-document index.html \
  --error-document 404.html

# Build and upload
npm run build
aws s3 sync out/ s3://${S3_BUCKET} \
  --delete \
  --cache-control max-age=86400

echo "Frontend URL: http://${S3_BUCKET}.s3-website-us-east-1.amazonaws.com"
```

### Step 8: CloudFront Distribution (Optional)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name ${S3_BUCKET}.s3.amazonaws.com \
  --default-root-object index.html
```

---

## CockroachDB Cloud Setup

### Create Free Cluster

1. Go to https://cockroachlabs.cloud
2. Click "Create Cluster"
3. Choose "Serverless" (free tier)
4. Select region (use same as Lambda for lower latency)
5. Name your cluster "memoryflow"

### Get Connection String

1. In cluster details, click "Connect"
2. Select "General connection string"
3. Copy the full connection string
4. Set as `DATABASE_URL` environment variable

### Enable Vector Support

```sql
-- Connect to your CockroachDB cluster via SQL shell
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

### Create Database User

```bash
# Using CockroachDB CLI
ccloud cluster sql --cluster=memoryflow

-- In SQL shell
CREATE USER apiuser WITH PASSWORD 'strong_password';
GRANT ALL ON DATABASE memoryflow TO apiuser;
```

### Network Security

1. Go to Cluster Settings
2. Click "Network"
3. Add IP address(es) allowed to connect:
   - Your office/home IP
   - Lambda security group CIDR
   - API Gateway IP range (if static)

---

## Environment Configuration

### Production Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:26257/memoryflow?sslmode=require

# AI Model
GROQ_API_KEY=gsk_...

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=memoryflow-assets

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Feature Flags
ENABLE_DEBUG_MODE=false
MAX_MEMORY_CONTEXTS=5
MEMORY_IMPORTANCE_THRESHOLD=2
EMBEDDING_MODEL=nomic-embed-text-v1.5
```

### Secrets Management (AWS Secrets Manager)

```bash
# Create secret
aws secretsmanager create-secret \
  --name memoryflow/prod \
  --secret-string '{
    "DATABASE_URL": "postgresql://...",
    "GROQ_API_KEY": "gsk_..."
  }'

# Reference in Lambda
aws lambda update-function-configuration \
  --function-name memoryflow-api \
  --environment Variables="{KEY=value}"
```

---

## Monitoring & Logging

### CloudWatch Logs

```bash
# View logs in real-time
aws logs tail /aws/lambda/memoryflow-api --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/memoryflow-api \
  --filter-pattern "ERROR"

# Get metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=memoryflow-api \
  --statistics Sum \
  --start-time 2026-08-01T00:00:00Z \
  --end-time 2026-08-08T00:00:00Z \
  --period 3600
```

### CloudWatch Alarms

```bash
# Alert on Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name MemoryFlowLambdaErrors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=memoryflow-api
```

### Database Monitoring

In CockroachDB Cloud Console:
- View query performance
- Monitor connection count
- Check storage usage
- Review transaction statistics

---

## Troubleshooting

### Lambda Execution Timeout

**Problem:** Function times out after 60 seconds

**Solution:**
```bash
aws lambda update-function-configuration \
  --function-name memoryflow-api \
  --timeout 300  # Increase to 5 minutes
```

### Database Connection Fails

**Problem:** Can't connect to CockroachDB

**Solutions:**
1. Verify connection string: `psql $DATABASE_URL`
2. Check IP whitelist in CockroachDB Cloud
3. Verify SSL requirements match
4. Check connection pooling limits

### Cold Start Performance

**Problem:** First request takes 10+ seconds

**Solutions:**
- Increase memory: 512MB → 1024MB
- Use Lambda Layers for dependencies
- Pre-warm function with scheduled invocations
- Consider Provisioned Concurrency

### Groq API Rate Limiting

**Problem:** Getting rate limit errors

**Solutions:**
- Check your API quota at console.groq.com
- Implement exponential backoff retry
- Cache responses when possible
- Switch to different model if available

### Logs Not Appearing

**Problem:** CloudWatch logs empty

**Solutions:**
```bash
# Verify IAM permissions
aws iam get-role-policy \
  --role-name MemoryFlowLambdaRole \
  --policy-name AWSLambdaBasicExecutionRole

# Check function configuration
aws lambda get-function-configuration \
  --function-name memoryflow-api
```

---

## Scaling Considerations

### Database Scaling

CockroachDB handles automatic scaling. Monitor:
- Storage usage
- Request rate
- Query latency

### Lambda Scaling

- Concurrent executions: Default 1000
- Reserved concurrency: Set if needed
- Memory: 128MB - 10240MB
- Timeout: Up to 15 minutes

### Cost Optimization

- Use Lambda free tier (1M requests/month)
- CockroachDB serverless pricing
- S3 storage costs
- Data transfer costs (minimize cross-region)

---

## Security Checklist

- [ ] Enable VPC endpoints for CockroachDB
- [ ] Use IAM roles with least privilege
- [ ] Enable CloudTrail logging
- [ ] Rotate API keys regularly
- [ ] Use Secrets Manager for sensitive data
- [ ] Enable Lambda logging
- [ ] Set up CloudWatch alarms
- [ ] Regular security audits
- [ ] Enable MFA for AWS console
- [ ] Use separate staging/production environments

---

## Rollback Procedure

```bash
# Get previous function version
aws lambda list-versions-by-function \
  --function-name memoryflow-api

# Switch to previous version
aws lambda update-alias \
  --function-name memoryflow-api \
  --name prod \
  --function-version 5

# Or rollback S3 frontend
aws s3 sync s3://backup-bucket/ s3://memoryflow-bucket/
```

---

## Support & Documentation

- AWS Lambda: https://docs.aws.amazon.com/lambda/
- CockroachDB: https://www.cockroachlabs.com/docs/
- API Gateway: https://docs.aws.amazon.com/apigateway/
- Groq: https://console.groq.com/docs/

---

**Last Updated:** August 2026  
**Status:** Production Ready
