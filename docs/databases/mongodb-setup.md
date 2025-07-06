# MongoDB Setup on Kubernetes

## Overview

This guide covers the deployment of MongoDB on the Raspberry Pi 5 cluster using the MongoDB Kubernetes Operator. The setup includes a 3-node replica set optimized for ARM64 architecture and designed for educational demonstrations.

## Prerequisites

- MicroK8s cluster running on Raspberry Pi 5 nodes
- MetalLB configured for LoadBalancer services
- Persistent storage configured (hostpath-storage)
- At least 6GB RAM available across cluster
- SSD storage mounted on worker nodes

## MongoDB Kubernetes Operator Installation

### 1. Install MongoDB Operator

```bash
# Create namespace for MongoDB resources
kubectl create namespace mongodb-system

# Add MongoDB Helm repository
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

# Install MongoDB Kubernetes Operator
helm install mongodb-operator mongodb/mongodb-kubernetes-operator \
  --namespace mongodb-system \
  --set operator.environment=kubernetes \
  --set operator.watchNamespace="*" \
  --set operator.image.repository=mongodb/mongodb-kubernetes-operator \
  --set operator.image.tag=0.9.0

# Verify operator installation
kubectl get pods -n mongodb-system
```

### 2. Verify Operator Installation

```bash
# Check operator logs
kubectl logs -n mongodb-system -l app.kubernetes.io/name=mongodb-kubernetes-operator

# Check CRDs
kubectl get crd | grep mongodb

# Expected CRDs:
# - mongodbcommunity.mongodbcommunity.mongodb.com
# - mongodbusers.mongodbcommunity.mongodb.com
```

## ARM64 Configuration

### 1. Verify ARM64 MongoDB Images

```bash
# Check available MongoDB images for ARM64
docker manifest inspect mongo:7.0 | grep -A 10 "arm64"

# Check MongoDB Enterprise images (if using)
docker manifest inspect mongodb/mongodb-enterprise-server:7.0-ubuntu2204-arm64
```

### 2. Configure ARM64 Image Registry

```bash
# Create image pull secret (if using private registry)
kubectl create secret docker-registry mongodb-registry-secret \
  --docker-server=docker.io \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email> \
  --namespace=mongodb-system
```

## MongoDB Replica Set Configuration

### 1. Create MongoDB Replica Set

```yaml
# mongodb-replica-set.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: showdown-mongodb
  namespace: mongodb-system
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.4"
  
  # ARM64 compatible image
  additionalMongodConfig:
    storage:
      wiredTiger:
        engineConfig:
          journalCompressor: snappy
          directoryForIndexes: false
        collectionConfig:
          blockCompressor: snappy
        indexConfig:
          prefixCompression: true
    operationProfiling:
      mode: slowOp
      slowOpThresholdMs: 100
    systemLog:
      destination: stdout
      logAppend: true
      logRotate: reopen
    net:
      port: 27017
      bindIpAll: true
    replication:
      replSetName: showdown-rs
  
  # Security configuration
  security:
    authentication:
      modes: ["SCRAM"]
    tls:
      enabled: false  # Disabled for demo simplicity
  
  # User configuration
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
        key: password
      roles:
        - name: root
          db: admin
      scramCredentialsSecretName: mongodb-admin-scram
    
    - name: showdown-user
      db: showdown
      passwordSecretRef:
        name: mongodb-showdown-password
        key: password
      roles:
        - name: readWrite
          db: showdown
        - name: dbAdmin
          db: showdown
      scramCredentialsSecretName: mongodb-showdown-scram
  
  # Pod template configuration
  statefulSet:
    spec:
      template:
        spec:
          nodeSelector:
            database: mongodb
          tolerations:
          - key: node-role.kubernetes.io/control-plane
            operator: Exists
            effect: NoSchedule
          containers:
          - name: mongod
            resources:
              requests:
                memory: "1Gi"
                cpu: "500m"
              limits:
                memory: "2Gi"
                cpu: "1000m"
            env:
            - name: MONGODB_DISABLE_SYSTEM_LOG
              value: "false"
          - name: mongodb-agent
            resources:
              requests:
                memory: "200Mi"
                cpu: "100m"
              limits:
                memory: "400Mi"
                cpu: "200m"
  
  # Storage configuration
  statefulSet:
    spec:
      volumeClaimTemplates:
      - metadata:
          name: data-volume
        spec:
          accessModes:
          - ReadWriteOnce
          resources:
            requests:
              storage: 20Gi
          storageClassName: hostpath-storage
      - metadata:
          name: logs-volume
        spec:
          accessModes:
          - ReadWriteOnce
          resources:
            requests:
              storage: 2Gi
          storageClassName: hostpath-storage
EOF
```

### 2. Create MongoDB Secrets

```bash
# Create admin password secret
kubectl create secret generic mongodb-admin-password \
  --from-literal=password=admin123 \
  --namespace=mongodb-system

# Create showdown user password secret
kubectl create secret generic mongodb-showdown-password \
  --from-literal=password=showdown123 \
  --namespace=mongodb-system

# Verify secrets
kubectl get secrets -n mongodb-system
```

### 3. Deploy MongoDB Replica Set

```bash
# Apply MongoDB configuration
kubectl apply -f mongodb-replica-set.yaml

# Monitor deployment
kubectl get mongodb -n mongodb-system
kubectl get pods -n mongodb-system -l app=showdown-mongodb-svc

# Wait for replica set to be ready (may take 5-10 minutes)
kubectl wait --for=condition=Ready pod/showdown-mongodb-0 -n mongodb-system --timeout=600s
kubectl wait --for=condition=Ready pod/showdown-mongodb-1 -n mongodb-system --timeout=600s
kubectl wait --for=condition=Ready pod/showdown-mongodb-2 -n mongodb-system --timeout=600s
```

## MongoDB Service Configuration

### 1. Create LoadBalancer Service

```yaml
# mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-external
  namespace: mongodb-system
spec:
  type: LoadBalancer
  loadBalancerIP: 10.0.1.247
  ports:
  - name: mongodb
    port: 27017
    targetPort: 27017
    protocol: TCP
  selector:
    app: showdown-mongodb-svc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: mongodb-system
spec:
  clusterIP: None
  ports:
  - name: mongodb
    port: 27017
    targetPort: 27017
    protocol: TCP
  selector:
    app: showdown-mongodb-svc
EOF
```

### 2. Apply Service Configuration

```bash
# Apply service configuration
kubectl apply -f mongodb-service.yaml

# Verify service creation
kubectl get services -n mongodb-system
kubectl get endpoints -n mongodb-system
```

## MongoDB Configuration and Tuning

### 1. Optimize MongoDB Configuration

```bash
# Connect to MongoDB primary
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin

# MongoDB shell commands
# Configure replica set settings
rs.conf()
rs.status()

# Optimize for demonstrations
db.adminCommand({
  "setParameter": 1,
  "cursorTimeoutMillis": 600000,
  "maxTransactionLockRequestTimeoutMillis": 10000,
  "wiredTigerConcurrentReadTransactions": 64,
  "wiredTigerConcurrentWriteTransactions": 64
})

# Configure profiling
db.setProfilingLevel(1, { slowms: 100 })
```

### 2. Create Database and Collections

```javascript
// Switch to showdown database
use showdown

// Create collections with validation
db.createCollection("transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["transaction_id", "user_id", "amount", "timestamp"],
      properties: {
        transaction_id: {
          bsonType: "string",
          description: "Unique transaction identifier"
        },
        user_id: {
          bsonType: "string",
          description: "User identifier"
        },
        amount: {
          bsonType: "double",
          minimum: 0,
          description: "Transaction amount"
        },
        currency: {
          bsonType: "string",
          description: "Currency code"
        },
        timestamp: {
          bsonType: "date",
          description: "Transaction timestamp"
        },
        description: {
          bsonType: "string",
          description: "Transaction description"
        },
        category: {
          bsonType: "string",
          description: "Transaction category"
        },
        location: {
          bsonType: "object",
          properties: {
            latitude: { bsonType: "double" },
            longitude: { bsonType: "double" }
          }
        },
        merchant: {
          bsonType: "object",
          properties: {
            name: { bsonType: "string" },
            category: { bsonType: "string" }
          }
        }
      }
    }
  }
})

// Create indexes for performance
db.transactions.createIndex({ "transaction_id": 1 }, { unique: true })
db.transactions.createIndex({ "user_id": 1 })
db.transactions.createIndex({ "timestamp": -1 })
db.transactions.createIndex({ "amount": 1 })
db.transactions.createIndex({ "category": 1 })
db.transactions.createIndex({ "location": "2dsphere" })
db.transactions.createIndex({ "merchant.name": 1 })

// Create compound indexes
db.transactions.createIndex({ "user_id": 1, "timestamp": -1 })
db.transactions.createIndex({ "category": 1, "timestamp": -1 })
```

## Sample Data Generation

### 1. Generate Sample Transaction Data

```javascript
// MongoDB shell script to generate sample data
function generateSampleData(count) {
    const categories = [
        'food_and_drink', 'transportation', 'shopping', 
        'entertainment', 'utilities', 'transfer'
    ];
    
    const descriptions = [
        'Coffee purchase', 'Gas station', 'Grocery shopping',
        'Online subscription', 'Restaurant bill', 'ATM withdrawal',
        'Transfer to savings', 'Utility payment'
    ];
    
    const merchants = [
        {name: 'Starbucks', category: 'coffee_shop'},
        {name: 'Shell', category: 'gas_station'},
        {name: 'Walmart', category: 'retail'},
        {name: 'Amazon', category: 'online'},
        {name: 'McDonald\'s', category: 'restaurant'},
        {name: 'Target', category: 'department_store'},
        {name: 'Best Buy', category: 'electronics'}
    ];
    
    const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
    
    const batch = [];
    
    for (let i = 0; i < count; i++) {
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const transaction = {
            transaction_id: `tx_${Math.floor(Math.random() * 9000000) + 1000000}`,
            user_id: `user_${Math.floor(Math.random() * 9000) + 1000}`,
            amount: Math.round((Math.random() * 995 + 5) * 100) / 100,
            currency: currencies[Math.floor(Math.random() * currencies.length)],
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            location: {
                latitude: 40.0 + Math.random(),
                longitude: -74.0 + Math.random()
            },
            merchant: merchant
        };
        
        batch.push(transaction);
        
        if (batch.length >= 1000) {
            db.transactions.insertMany(batch);
            batch.length = 0;
            print(`Inserted ${i + 1} transactions...`);
        }
    }
    
    if (batch.length > 0) {
        db.transactions.insertMany(batch);
    }
    
    print(`Finished inserting ${count} transactions`);
}

// Generate 50,000 sample transactions
generateSampleData(50000);
```

### 2. Create Sample Data Script

```bash
# Create sample data generation script
cat <<'EOF' > generate-mongodb-data.js
// Connect to MongoDB
conn = new Mongo("mongodb://showdown-user:showdown123@localhost:27017/showdown");
db = conn.getDB("showdown");

// Import the sample data generation function
load('sample-data-generator.js');

// Generate sample data
generateSampleData(50000);

// Show statistics
print("Collection stats:");
print(db.transactions.stats());

print("\nSample documents:");
printjson(db.transactions.findOne());

print("\nIndex information:");
db.transactions.getIndexes().forEach(printjson);
EOF

# Execute the script
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u showdown-user -p showdown123 --authenticationDatabase showdown < generate-mongodb-data.js
```

## Performance Monitoring

### 1. Enable MongoDB Monitoring

```bash
# Create monitoring user
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin --eval '
db.createUser({
  user: "monitoring",
  pwd: "monitoring123",
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})'
```

### 2. Configure Prometheus MongoDB Exporter

```yaml
# mongodb-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-exporter
  namespace: mongodb-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-exporter
  template:
    metadata:
      labels:
        app: mongodb-exporter
    spec:
      containers:
      - name: mongodb-exporter
        image: percona/mongodb_exporter:0.39.0
        ports:
        - containerPort: 9216
        env:
        - name: MONGODB_URI
          value: "mongodb://monitoring:monitoring123@showdown-mongodb-0.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017,showdown-mongodb-1.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017,showdown-mongodb-2.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017/?authSource=admin&replicaSet=showdown-rs"
        - name: MONGODB_COLLECT_ALL
          value: "true"
        - name: MONGODB_COLLECT_OPLOG
          value: "true"
        - name: MONGODB_COLLECT_REPLSET
          value: "true"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-exporter
  namespace: mongodb-system
  labels:
    app: mongodb-exporter
spec:
  selector:
    app: mongodb-exporter
  ports:
  - name: metrics
    port: 9216
    targetPort: 9216
EOF
```

### 3. Deploy MongoDB Exporter

```bash
# Apply exporter configuration
kubectl apply -f mongodb-exporter.yaml

# Verify exporter deployment
kubectl get pods -n mongodb-system -l app=mongodb-exporter

# Test metrics endpoint
kubectl port-forward -n mongodb-system svc/mongodb-exporter 9216:9216 &
curl http://localhost:9216/metrics
```

## Backup and Recovery

### 1. Configure Backup Strategy

```bash
# Create backup script
cat <<'EOF' > mongodb-backup.sh
#!/bin/bash
BACKUP_DIR="/opt/backup/mongodb-$(date +%Y%m%d-%H%M%S)"
MONGODB_HOST="10.0.1.247"
MONGODB_PORT="27017"
MONGODB_USER="admin"
MONGODB_PASSWORD="admin123"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create dump
mongodump --host $MONGODB_HOST:$MONGODB_PORT \
  --username $MONGODB_USER \
  --password $MONGODB_PASSWORD \
  --authenticationDatabase admin \
  --out $BACKUP_DIR

# Compress backup
tar -czf $BACKUP_DIR.tar.gz -C $BACKUP_DIR .
rm -rf $BACKUP_DIR

echo "Backup completed: $BACKUP_DIR.tar.gz"
EOF

chmod +x mongodb-backup.sh
```

### 2. Create Backup CronJob

```yaml
# mongodb-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb-system
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7.0
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_DIR="/backup/mongodb-$(date +%Y%m%d-%H%M%S)"
              mkdir -p $BACKUP_DIR
              mongodump --host showdown-mongodb-0.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017 \
                --username admin \
                --password admin123 \
                --authenticationDatabase admin \
                --out $BACKUP_DIR
              tar -czf $BACKUP_DIR.tar.gz -C $BACKUP_DIR .
              rm -rf $BACKUP_DIR
              echo "Backup completed: $BACKUP_DIR.tar.gz"
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: mongodb-backup-pvc
          restartPolicy: OnFailure
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-backup-pvc
  namespace: mongodb-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: hostpath-storage
EOF
```

## Troubleshooting

### 1. Common Issues

**Replica Set Not Forming:**
```bash
# Check pod logs
kubectl logs -n mongodb-system showdown-mongodb-0 -c mongod

# Check replica set status
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin --eval 'rs.status()'

# Force reconfiguration if needed
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin --eval '
rs.reconfig({
  "_id": "showdown-rs",
  "members": [
    {"_id": 0, "host": "showdown-mongodb-0.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017"},
    {"_id": 1, "host": "showdown-mongodb-1.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017"},
    {"_id": 2, "host": "showdown-mongodb-2.showdown-mongodb-svc.mongodb-system.svc.cluster.local:27017"}
  ]
}, {force: true})'
```

**High Memory Usage:**
```bash
# Check memory usage
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin --eval 'db.serverStatus().mem'

# Adjust WiredTiger cache size
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u admin -p admin123 --authenticationDatabase admin --eval '
db.adminCommand({
  "setParameter": 1,
  "wiredTigerEngineRuntimeConfig": "cache_size=1G"
})'
```

### 2. Performance Testing

```bash
# Test connection from external client
mongosh "mongodb://showdown-user:showdown123@10.0.1.247:27017/showdown"

# Run performance tests
kubectl exec -it showdown-mongodb-0 -n mongodb-system -- mongosh --host localhost:27017 -u showdown-user -p showdown123 --authenticationDatabase showdown --eval '
// Insert performance test
var start = new Date();
for (let i = 0; i < 1000; i++) {
  db.transactions.insertOne({
    transaction_id: "test_" + i,
    user_id: "user_test",
    amount: Math.random() * 100,
    timestamp: new Date()
  });
}
var end = new Date();
print("Insert 1000 docs: " + (end - start) + "ms");

// Query performance test
start = new Date();
for (let i = 0; i < 100; i++) {
  db.transactions.find({user_id: "user_test"}).limit(10).toArray();
}
end = new Date();
print("Query 100 times: " + (end - start) + "ms");
'
```

## Demo Queries

### 1. Basic Operations

```javascript
// Find transactions by user
db.transactions.find({user_id: "user_1234"}).sort({timestamp: -1}).limit(10);

// Find transactions by amount range
db.transactions.find({
  amount: {$gte: 100, $lte: 500}
}).sort({timestamp: -1});

// Find transactions by category
db.transactions.find({category: "food_and_drink"}).count();
```

### 2. Aggregation Examples

```javascript
// Total spending by user
db.transactions.aggregate([
  {$group: {
    _id: "$user_id",
    total_amount: {$sum: "$amount"},
    transaction_count: {$sum: 1}
  }},
  {$sort: {total_amount: -1}},
  {$limit: 10}
]);

// Spending by category
db.transactions.aggregate([
  {$group: {
    _id: "$category",
    total_amount: {$sum: "$amount"},
    avg_amount: {$avg: "$amount"}
  }},
  {$sort: {total_amount: -1}}
]);

// Monthly spending trends
db.transactions.aggregate([
  {$group: {
    _id: {
      year: {$year: "$timestamp"},
      month: {$month: "$timestamp"}
    },
    total_amount: {$sum: "$amount"},
    transaction_count: {$sum: 1}
  }},
  {$sort: {"_id.year": 1, "_id.month": 1}}
]);
```

This MongoDB setup provides a robust, ARM64-compatible document database optimized for the Epic Interactive NoSQL Showdown demonstration system. 