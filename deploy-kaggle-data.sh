#!/bin/bash

# Deploy and load Kaggle data for NoSQL Showdown
# This script ensures reproducible deployment on Raspberry Pi cluster

set -e

echo "🚀 NoSQL Showdown - Kaggle Data Loading Script"
echo "============================================="

# Configuration
API_VERSION="v1.1.2"
NAMESPACE="nosql-showdown"
TRANSACTION_LIMIT="${TRANSACTION_LIMIT:-200000}"  # Default to 200k, can be overridden

echo ""
echo "📋 Pre-deployment checks..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if Docker is available (for building)
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
else
    echo "⚠️  Docker not found. Assuming images are pre-built."
fi

# Check namespace exists
if kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "✅ Namespace '$NAMESPACE' exists"
else
    echo "❌ Namespace '$NAMESPACE' not found. Please deploy the infrastructure first."
    exit 1
fi

echo ""
echo "🏗️  Building Docker image (if Docker available)..."
if command -v docker &> /dev/null; then
    cd api
    docker build -t nosql-showdown-api:$API_VERSION .
    cd ..
    echo "✅ Docker image built: nosql-showdown-api:$API_VERSION"
else
    echo "⏭️  Skipping Docker build (Docker not available)"
fi

echo ""
echo "🗑️  Cleaning up previous jobs..."
kubectl delete job load-kaggle-data -n $NAMESPACE --ignore-not-found
kubectl delete configmap kaggle-loader-script -n $NAMESPACE --ignore-not-found

echo ""
echo "📊 Current data status:"
if command -v curl &> /dev/null; then
    curl -s http://localhost:3000/api/admin/data-status 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "⚠️  Could not fetch data status"
fi

echo ""
echo "🚀 Deploying data loading job..."
kubectl apply -f k8s/jobs/load-kaggle-data.yaml

echo ""
echo "⏳ Waiting for job to start..."
sleep 5

echo ""
echo "📋 Job status:"
kubectl get job load-kaggle-data -n $NAMESPACE

echo ""
echo "📜 Following job logs (press Ctrl+C to stop following)..."
echo "============================================="
kubectl logs -n $NAMESPACE job/load-kaggle-data -f || true

echo ""
echo "============================================="
echo "✅ Data loading job deployed!"
echo ""
echo "📊 Useful commands:"
echo "  - Check job status:  kubectl get job load-kaggle-data -n $NAMESPACE"
echo "  - View logs:         kubectl logs -n $NAMESPACE job/load-kaggle-data"
echo "  - Check data status: curl http://localhost:3000/api/admin/data-status"
echo ""
echo "⏱️  Transaction limit: $TRANSACTION_LIMIT"
echo "    - 200k transactions: ~3-5 minutes"
echo "    - 1M transactions: ~15-20 minutes"
echo "    - 13.3M transactions: ~30-60 minutes"
echo "🧹 The job will auto-delete 1 hour after completion"
echo ""
echo "💡 To change the limit, run: TRANSACTION_LIMIT=1000000 ./deploy-kaggle-data.sh"