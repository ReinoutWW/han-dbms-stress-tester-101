# Raspberry Pi Cluster Deployment Guide

## 🍓 Pi Cluster Data Strategy: Docker-Embedded Dataset

Instead of using NFS or manual file placement, we embed the **complete Kaggle dataset directly into the Docker image**. This provides:

✅ **Instant availability** - Data ready on every Pi after `docker pull`  
✅ **No network dependencies** - Local data access  
✅ **Consistent deployment** - Same dataset on all nodes  
✅ **Demo-ready** - Perfect for university presentations  

## 📦 Image Structure

```
nosql-showdown-api:pi-latest
├── /app/                    # Node.js application
├── /data/kaggle-finance/    # Embedded dataset
│   ├── users_data.csv       # ~165KB
│   ├── cards_data.csv       # ~510KB
│   └── transactions_data.csv # ~1.26GB
└── /app/dist/               # Compiled TypeScript
```

**Total Image Size: ~1.55GB**

## 🚀 Deployment Process

### Step 1: Prepare Dataset

```bash
# Copy your Kaggle dataset to the build directory
cp /path/to/users_data.csv api/data/kaggle-finance/
cp /path/to/cards_data.csv api/data/kaggle-finance/
cp /path/to/transactions_data.csv api/data/kaggle-finance/
```

### Step 2: Build Pi Image

```bash
# Build ARM64 image for Pi
cd api
./scripts/build-for-pi.sh

# Or build manually
docker buildx build --platform linux/arm64 -t nosql-showdown-api:pi-latest .
```

### Step 3: Deploy to Pi Cluster

#### Option A: Registry Push/Pull (Recommended)
```bash
# Push to your registry
docker tag nosql-showdown-api:pi-latest your-registry/nosql-showdown-api:pi-latest
docker push your-registry/nosql-showdown-api:pi-latest

# On each Pi node
docker pull your-registry/nosql-showdown-api:pi-latest
```

#### Option B: Direct Transfer
```bash
# Save image to file
docker save nosql-showdown-api:pi-latest | gzip > nosql-showdown-pi.tar.gz

# Copy to each Pi
scp nosql-showdown-pi.tar.gz pi@pi-node-1:~/
scp nosql-showdown-pi.tar.gz pi@pi-node-2:~/
# ... repeat for all nodes

# Load on each Pi
ssh pi@pi-node-1 "docker load < nosql-showdown-pi.tar.gz"
ssh pi@pi-node-2 "docker load < nosql-showdown-pi.tar.gz"
# ... repeat for all nodes
```

### Step 4: Deploy Kubernetes Manifests

```bash
# Deploy to Pi cluster
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -n nosql-showdown
kubectl get services -n nosql-showdown
```

## 📊 Data Loading Process

### Automatic Data Loading on Startup

The API automatically detects the embedded dataset and provides endpoints for loading:

```bash
# Check data status
curl http://10.0.1.240:3000/api/admin/data-status

# Load data into databases
curl -X POST http://10.0.1.240:3000/api/admin/load-data \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 500, "databases": ["mongodb", "elasticsearch"]}'

# Check Pi system info
curl http://10.0.1.240:3000/api/admin/pi-info
```

### Pi-Optimized Loading

The system automatically uses Pi-friendly settings:

- **Batch Size**: 500 records (vs 5000 on servers)
- **Memory Management**: Streaming processing
- **Progress Logging**: Every 10,000 records
- **Sequential Processing**: Avoid overwhelming Pi resources

## 🎯 Demo Workflow

### Pre-Demo Setup (5 minutes)

1. **Verify Cluster Health**
   ```bash
   kubectl get nodes
   kubectl get pods -n nosql-showdown
   ```

2. **Check Data Status**
   ```bash
   curl http://10.0.1.240:3000/api/admin/data-status
   ```

3. **Load Data if Needed**
   ```bash
   curl -X POST http://10.0.1.240:3000/api/admin/load-data
   ```

### Live Demo (University Presentation)

1. **Show Pi Hardware** - Physical cluster with 6 Pi boards
2. **Demonstrate Scale** - 1.26GB dataset, millions of transactions
3. **Run Stress Tests** - MongoDB vs Elasticsearch comparison
4. **Real-time Metrics** - Grafana dashboard on projector
5. **Interactive Results** - Students can see latency, throughput

### Expected Performance

```
📊 Pi Cluster Performance Targets:
- Data Loading: ~45-60 minutes (one-time)
- Query Latency: 50-200ms average
- Throughput: 20-50 queries/second
- Concurrent Users: 10-20 students
```

## 🔧 Troubleshooting

### Common Issues

**Data Loading Timeout**
```bash
# Check Pi resources
kubectl exec -it deployment/nosql-showdown-api -- top
kubectl exec -it deployment/nosql-showdown-api -- df -h
```

**Memory Issues**
```bash
# Check Pi memory usage
kubectl top nodes
kubectl top pods -n nosql-showdown
```

**Database Connection Issues**
```bash
# Check database pods
kubectl logs deployment/mongodb -n databases
kubectl logs deployment/elasticsearch -n databases
```

### Performance Tuning

**For Better Demo Performance**
```bash
# Load subset of data for quick demos
curl -X POST http://10.0.1.240:3000/api/admin/load-data \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 100, "maxRecords": 10000}'
```

**For Full Dataset Loading**
```bash
# Use larger batches if Pi can handle it
curl -X POST http://10.0.1.240:3000/api/admin/load-data \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 1000}'
```

## 📈 Monitoring

### Real-time Monitoring

- **Grafana Dashboard**: http://10.0.1.240:3001
- **Prometheus Metrics**: http://10.0.1.240:9090
- **API Health**: http://10.0.1.240:3000/health

### Key Metrics to Watch

- **Pi CPU/Memory Usage**: Keep under 80%
- **Database Response Time**: Should be under 200ms
- **Load Balancer Status**: All nodes healthy
- **Data Loading Progress**: Track via WebSocket

## 🎓 Educational Value

This deployment strategy provides students with:

1. **Real-world Scale**: Actual financial dataset
2. **Infrastructure Concepts**: Kubernetes, Docker, databases
3. **Performance Engineering**: Query optimization, indexing
4. **Distributed Systems**: Load balancing, replication
5. **DevOps Practices**: CI/CD, monitoring, troubleshooting

## 🚀 Future Enhancements

1. **Auto-scaling**: HPA based on CPU/memory
2. **Data Streaming**: Kafka for real-time updates
3. **ML Integration**: Fraud detection models
4. **Advanced Monitoring**: Custom Pi metrics
5. **Multi-cluster**: Federation across multiple Pi clusters

---

**Perfect for university demos** - Students experience enterprise-scale database performance on affordable Pi hardware! 🎓 