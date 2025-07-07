# 🍓 Raspberry Pi ARM64 Cluster Deployment Guide

## Complete Setup Guide for NoSQL Showdown on Pi Cluster

This guide provides step-by-step instructions to deploy the Epic Interactive NoSQL Showdown on a 6-node Raspberry Pi 5 cluster.

## 📋 Prerequisites

### Hardware Requirements
- 6x Raspberry Pi 5 boards (2x 8GB, 4x 4GB)
- MicroSD cards with Raspberry Pi OS (64-bit)
- Gigabit network switch
- Ethernet cables
- Adequate power supply for all Pis

### Software Requirements
- MicroK8s installed on all Pi nodes
- Docker installed on build machine
- kubectl configured to access the cluster
- Git for cloning the repository

## 🏗️ Phase 1: Prepare the Codebase

### 1.1 Clone the Repository
```bash
git clone https://github.com/your-org/han-dbms-stress-tester-101.git
cd han-dbms-stress-tester-101
```

### 1.2 Prepare the Kaggle Dataset
```bash
# Create data directory
mkdir -p api/data/kaggle-finance

# Copy your Kaggle finance dataset files
cp /path/to/users_data.csv api/data/kaggle-finance/
cp /path/to/cards_data.csv api/data/kaggle-finance/
cp /path/to/transactions_data.csv api/data/kaggle-finance/

# Verify files (should show ~1.3GB for transactions)
ls -lh api/data/kaggle-finance/
```

## 🐳 Phase 2: Build ARM64 Docker Images

### 2.1 Setup Docker Buildx
```bash
# Create buildx builder for multi-arch
docker buildx create --name pi-builder --use
docker buildx inspect pi-builder --bootstrap
```

### 2.2 Build Images Using the Script
```bash
# Run the build script
./scripts/build-arm64-images.sh

# Choose option 1 to build and push to registry
# OR option 3 to build and save for offline transfer
```

### 2.3 Manual Build (Alternative)
```bash
# Build API image
cd api
docker buildx build \
  --platform linux/arm64,linux/amd64 \
  --tag nosql-showdown/api:pi-1.0.0 \
  --file Dockerfile.arm64 \
  --push .
cd ..

# Build UI image
cd ui
docker buildx build \
  --platform linux/arm64,linux/amd64 \
  --tag nosql-showdown/ui:pi-1.0.0 \
  --file Dockerfile.arm64 \
  --push .
cd ..
```

### 2.4 Transfer Images to Pi Cluster (if built locally)
```bash
# Save images
docker save nosql-showdown/api:pi-1.0.0 | gzip > api-pi.tar.gz
docker save nosql-showdown/ui:pi-1.0.0 | gzip > ui-pi.tar.gz

# Copy to each Pi node
for i in {3..8}; do
  scp api-pi.tar.gz ui-pi.tar.gz pi@10.0.1.$i:~/
done

# Load on each Pi node
for i in {3..8}; do
  ssh pi@10.0.1.$i "docker load < api-pi.tar.gz && docker load < ui-pi.tar.gz"
done
```

## 🚀 Phase 3: Deploy to Kubernetes

### 3.1 Configure MicroK8s Cluster
```bash
# On control plane node (fractal1)
microk8s enable dns storage
microk8s enable metallb:10.0.1.240-10.0.1.250

# Verify cluster status
microk8s kubectl get nodes
```

### 3.2 Run Automated Deployment
```bash
# Run the deployment script
./scripts/deploy-to-pi-cluster.sh

# This will:
# - Create namespaces
# - Deploy databases
# - Deploy application
# - Initialize schemas
# - Optionally load sample data
```

### 3.3 Manual Deployment (Alternative)
```bash
# Create namespaces
kubectl create namespace nosql-showdown
kubectl apply -f k8s/namespaces/databases-namespace.yaml

# Deploy databases
kubectl apply -f k8s/databases/mongodb-deployment-pi.yaml
kubectl apply -f k8s/databases/elasticsearch-deployment-pi.yaml
kubectl apply -f k8s/deployments/postgres-deployment.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=mongodb -n databases --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n databases --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n nosql-showdown --timeout=300s

# Deploy application
kubectl apply -f k8s/deployments/api-deployment-pi.yaml
kubectl apply -f k8s/services/api-service.yaml
kubectl apply -f k8s/deployments/ui-deployment-pi.yaml
```

## 📊 Phase 4: Load Data

### 4.1 Quick Test Data (Recommended for demos)
```bash
# Load 200k transactions (3-5 minutes)
kubectl apply -f k8s/jobs/load-kaggle-data.yaml

# Monitor progress
kubectl logs -n nosql-showdown job/load-kaggle-data -f
```

### 4.2 Full Dataset (Optional)
```bash
# Edit the job to load all data
kubectl edit job/load-kaggle-data -n nosql-showdown
# Change TRANSACTION_LIMIT to 13300000

# This will take 30-60 minutes on Pi hardware
```

## 🌐 Phase 5: Configure Access

### 5.1 Local Network Access
```bash
# Get service IPs
kubectl get svc -A | grep LoadBalancer

# Access points:
# UI: http://10.0.1.243
# API: http://10.0.1.244:3000
```

### 5.2 External Access via ngrok
```bash
# On admin laptop connected to Pi network
# Install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xvzf ngrok-v3-stable-linux-arm64.tgz
sudo mv ngrok /usr/local/bin/

# Configure ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Start tunnels
ngrok http 10.0.1.243:80  # For UI
ngrok http 10.0.1.244:3000  # For API
```

## 🏥 Phase 6: Health Checks

### 6.1 Verify Deployment
```bash
# Check all pods
kubectl get pods -A

# Check services
kubectl get svc -A

# Test API health
curl http://10.0.1.244:3000/health

# Check database connections
curl http://10.0.1.244:3000/api/stress-test/database/status
```

### 6.2 Monitor Resources
```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -A

# Check Pi temperature
for i in {3..8}; do
  echo "=== fractal$((i-2)) ==="
  ssh pi@10.0.1.$i "vcgencmd measure_temp"
done
```

## 🛠️ Troubleshooting

### Common Issues

#### Pods Stuck in Pending
```bash
# Check node resources
kubectl describe nodes

# Check events
kubectl get events -A --sort-by='.lastTimestamp'
```

#### Image Pull Errors
```bash
# Verify images exist locally
docker images | grep nosql-showdown

# Check image pull policy
kubectl describe pod <pod-name> -n <namespace>
```

#### Memory Issues
```bash
# Reduce replicas
kubectl scale deployment api --replicas=1 -n nosql-showdown
kubectl scale deployment ui --replicas=1 -n nosql-showdown

# Adjust resource limits
kubectl edit deployment api -n nosql-showdown
```

#### Database Connection Failures
```bash
# Check DNS resolution
kubectl exec -it deployment/api -n nosql-showdown -- nslookup mongodb.databases.svc.cluster.local

# Test direct connection
kubectl exec -it deployment/api -n nosql-showdown -- curl http://elasticsearch.databases.svc.cluster.local:9200
```

## 📈 Performance Optimization

### For Raspberry Pi Hardware

1. **Limit Concurrent Operations**
   - Set operations to 10-25 per test
   - Use 1-2 concurrent threads

2. **Optimize Database Settings**
   - MongoDB: Limit cache to 512MB
   - Elasticsearch: Disable ML features
   - Use single-node configurations

3. **Resource Allocation**
   - Place databases on 8GB nodes
   - Distribute services across nodes
   - Monitor temperature and throttling

## 🎓 Demo Preparation

### Pre-Demo Checklist
- [ ] All pods running and ready
- [ ] Sample data loaded (200k transactions)
- [ ] ngrok tunnels active (if needed)
- [ ] Grafana dashboards configured
- [ ] Network connectivity verified
- [ ] Backup power connected

### Demo URLs
- Main UI: `http://showdown.local` or `http://10.0.1.243`
- API Health: `http://10.0.1.244:3000/health`
- Database Status: `http://10.0.1.244:3000/api/stress-test/database/status`

### Quick Commands
```bash
# Start a stress test via API
curl -X POST http://10.0.1.244:3000/api/stress-test/run \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "operations": 25, "concurrency": 2}'

# Check leaderboard
curl http://10.0.1.244:3000/api/users/

# Monitor real-time logs
kubectl logs -f deployment/api -n nosql-showdown
```

## 🚨 Emergency Recovery

### If Things Go Wrong
```bash
# Quick reset
kubectl delete namespace nosql-showdown databases

# Restart from scratch
./scripts/deploy-to-pi-cluster.sh

# Emergency access
kubectl port-forward svc/ui 8080:80 -n nosql-showdown
kubectl port-forward svc/api 3000:3000 -n nosql-showdown
```

## 📚 Additional Resources

- [MicroK8s Documentation](https://microk8s.io/docs)
- [Raspberry Pi Kubernetes Guide](https://ubuntu.com/tutorials/how-to-kubernetes-cluster-on-raspberry-pi)
- [Project README](../README.md)
- [Hardware Specifications](hardware/hardware-inventory.md)

---

**🎉 Your Raspberry Pi cluster is now ready for the Epic Interactive NoSQL Showdown!**