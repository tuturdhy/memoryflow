#!/bin/bash
set -e

# MemoryFlow AWS Lambda Deployment Script

echo "🚀 MemoryFlow AWS Lambda Deployment"
echo "===================================="

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

if ! command -v zip &> /dev/null; then
    echo "❌ zip command not found. Please install it first."
    exit 1
fi

# Configuration
FUNCTION_NAME=${1:-"MemoryFlow"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
RUNTIME="nodejs18.x"

echo "📦 Building application..."
npm run build

echo "📦 Installing production dependencies..."
rm -rf node_modules
npm ci --only=production

echo "📦 Creating deployment package..."
rm -f lambda-deployment.zip
zip -r lambda-deployment.zip . \
    -x "*.git*" \
    ".env*" \
    ".next/cache/*" \
    "node_modules/aws-sdk/*" \
    "scripts/*" \
    "README.md" \
    ".gitignore"

echo "📤 Uploading to AWS Lambda..."

# Check if function exists
if aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" 2>/dev/null; then
    echo "📝 Updating existing function..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://lambda-deployment.zip \
        --region "$AWS_REGION"
else
    echo "✨ Creating new function..."
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
        --handler .next/server/pages/api.handler \
        --zip-file fileb://lambda-deployment.zip \
        --region "$AWS_REGION" \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            DATABASE_URL=$DATABASE_URL,
            GROQ_API_KEY=$GROQ_API_KEY,
            AWS_REGION=$AWS_REGION,
            NEXT_PUBLIC_APP_URL=https://<your-api-gateway-url>
        }"
fi

echo "🔐 Configuring environment variables..."
aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment Variables="{
        DATABASE_URL=$DATABASE_URL,
        GROQ_API_KEY=$GROQ_API_KEY,
        AWS_REGION=$AWS_REGION
    }" \
    --region "$AWS_REGION"

echo "✅ Deployment successful!"
echo ""
echo "Next steps:"
echo "1. Create an API Gateway to expose the Lambda function"
echo "2. Configure CloudFront for CDN"
echo "3. Deploy static assets to S3"
echo ""
echo "Function Name: $FUNCTION_NAME"
echo "Region: $AWS_REGION"
echo ""
echo "View logs:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow"
