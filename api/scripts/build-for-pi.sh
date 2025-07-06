#!/bin/bash

# Pi Cluster Build Script
# This script builds the NoSQL Showdown API for ARM64 Pi deployment

echo "🍓 Building NoSQL Showdown API for Raspberry Pi Cluster..."

# Check if data files exist
if [ ! -f "data/kaggle-finance/users_data.csv" ] || [ ! -f "data/kaggle-finance/cards_data.csv" ] || [ ! -f "data/kaggle-finance/transactions_data.csv" ]; then
    echo "❌ Required dataset files not found in data/kaggle-finance/"
    echo "Please copy the following files:"
    echo "  - users_data.csv"
    echo "  - cards_data.csv" 
    echo "  - transactions_data.csv"
    exit 1
fi

# Display dataset info
echo "📊 Dataset files found:"
echo "  - users_data.csv: $(wc -l < data/kaggle-finance/users_data.csv) lines"
echo "  - cards_data.csv: $(wc -l < data/kaggle-finance/cards_data.csv) lines"
echo "  - transactions_data.csv: $(wc -l < data/kaggle-finance/transactions_data.csv) lines"

# Build for ARM64 (Pi architecture)
echo "🔨 Building Docker image for ARM64..."
docker buildx build --platform linux/arm64 -t nosql-showdown-api:pi-latest .

# Optional: Build for both architectures
echo "🔨 Building multi-architecture image..."
docker buildx build --platform linux/amd64,linux/arm64 -t nosql-showdown-api:multi-latest .

echo "✅ Build completed successfully!"
echo ""
echo "🚀 To deploy to Pi cluster:"
echo "  1. Save image: docker save nosql-showdown-api:pi-latest | gzip > nosql-showdown-pi.tar.gz"
echo "  2. Copy to Pi: scp nosql-showdown-pi.tar.gz pi@your-pi-ip:~/"
echo "  3. Load on Pi: docker load < nosql-showdown-pi.tar.gz"
echo "  4. Deploy: kubectl apply -f k8s/"
echo ""
echo "📋 Image includes:"
echo "  - Node.js API with all dependencies"
echo "  - Complete Kaggle dataset (~1.3GB)"
echo "  - Pi-optimized batch processing"
echo "  - Kubernetes service discovery" 