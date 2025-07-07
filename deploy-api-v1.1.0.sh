#!/bin/bash

# Build and deploy the new API version v1.1.0 with Kaggle data loading improvements

echo "📦 Building Docker image for API v1.1.0..."
cd api
docker build -t nosql-showdown-api:v1.1.0 .

echo "🏷️  Tagging image for registry (if using a registry)..."
# docker tag nosql-showdown-api:v1.1.0 your-registry/nosql-showdown-api:v1.1.0
# docker push your-registry/nosql-showdown-api:v1.1.0

echo "📝 Updating Kubernetes deployment..."
cd ../k8s/deployments

# Create a backup of the current deployment
cp api-deployment.yaml api-deployment.yaml.backup

# Update the deployment with the new image version
sed -i 's|image: nosql-showdown-api:.*|image: nosql-showdown-api:v1.1.0|' api-deployment.yaml

echo "🚀 Applying the updated deployment..."
kubectl apply -f api-deployment.yaml

echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/api -n nosql-showdown

echo "✅ Deployment complete! Checking pod status..."
kubectl get pods -n nosql-showdown -l app=api

echo "📊 Checking deployment details..."
kubectl describe deployment api -n nosql-showdown | grep Image

echo "🎉 API v1.1.0 deployed successfully!"
echo ""
echo "New features in v1.1.0:"
echo "- Proper Kaggle dataset loading (13.3M transactions)"
echo "- Socket.io progress tracking for data loading"
echo "- Optimized batch processing (10k records)"
echo "- Parallel MongoDB and Elasticsearch operations"
echo "- Removed old fraud detection test data endpoint"