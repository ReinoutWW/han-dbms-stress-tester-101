# Kaggle Data Loading for NoSQL Showdown

This directory contains Kubernetes Jobs for loading the Kaggle finance dataset into MongoDB and Elasticsearch.

## Prerequisites

1. **Docker Image**: The API image must include the data loader script
   - Current version: `nosql-showdown-api:v1.1.1`
   - Script location: `/app/scripts/load-kaggle-data-direct.js`

2. **Data Files**: The CSV files must be available in the container
   - Location: `/data/kaggle-finance/`
   - Files: `users_data.csv`, `cards_data.csv`, `transactions_data.csv`

## Loading Data

### Step 1: Clean Previous ConfigMap (if exists)
```bash
kubectl delete configmap kaggle-loader-script -n nosql-showdown --ignore-not-found
```

### Step 2: Delete Previous Job (if exists)
```bash
kubectl delete job load-kaggle-data -n nosql-showdown --ignore-not-found
```

### Step 3: Run the Data Loading Job
```bash
kubectl apply -f load-kaggle-data.yaml
```

### Step 4: Monitor Progress
```bash
# Watch job status
kubectl get jobs -n nosql-showdown -w

# Follow logs
kubectl logs -n nosql-showdown job/load-kaggle-data -f

# Check data status
curl http://localhost:3000/api/admin/data-status
```

## What the Job Does

1. **Clears existing data** from both MongoDB and Elasticsearch
2. **Loads users** (2,000 records) into both databases
3. **Loads cards** (6,146 records) into both databases
4. **Loads transactions** (13.3 million records) into both databases
5. **Creates indexes** for optimal query performance

## Configuration

The job uses these environment variables:
- `MONGODB_URL`: MongoDB connection string
- `ELASTICSEARCH_URL`: Elasticsearch endpoint
- `DATA_PATH`: Location of CSV files (default: `/data/kaggle-finance`)
- `BATCH_SIZE`: Records per batch (default: 10000)
- `TRANSACTION_LIMIT`: Maximum number of transactions to load (default: 200000)

### Adjusting Transaction Limit

To load a different number of transactions, edit the `TRANSACTION_LIMIT` in the job YAML:
```yaml
- name: TRANSACTION_LIMIT
  value: "200000"  # Change this to your desired limit
```

Examples:
- `"200000"` - Load 200k transactions (default, ~3-5 minutes)
- `"1000000"` - Load 1M transactions (~15-20 minutes)
- `"13300000"` - Load all transactions (~30-60 minutes)

## Resource Requirements

- **Memory**: 1-2 GB
- **CPU**: 1-2 cores
- **Time**: ~30-60 minutes for full dataset
- **Storage**: ~1.5 GB for CSV files

## Troubleshooting

### Job Fails or Times Out
1. Check logs: `kubectl logs -n nosql-showdown job/load-kaggle-data`
2. Increase timeout in `activeDeadlineSeconds`
3. Check database connectivity

### Data Not Loading
1. Verify CSV files exist: `kubectl exec -n nosql-showdown deployment/api -- ls -la /data/kaggle-finance/`
2. Check database status: `curl http://localhost:3000/api/admin/data-status`
3. Ensure databases are running: `kubectl get pods -n databases`

### Cleaning Up
```bash
# Delete completed job
kubectl delete job load-kaggle-data -n nosql-showdown

# Or let it auto-delete after 1 hour (ttlSecondsAfterFinished: 3600)
```

## For Raspberry Pi Deployment

The job is configured to work on ARM64 architecture. Ensure:
1. The Docker image is built for ARM64
2. Sufficient resources are available on the Pi nodes
3. Data files are accessible (consider using NFS or copying to nodes)