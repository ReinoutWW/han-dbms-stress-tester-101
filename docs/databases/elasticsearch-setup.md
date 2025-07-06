# Elasticsearch Setup with ECK

## Overview

This guide covers the deployment of Elasticsearch on the Raspberry Pi 5 cluster using the Elastic Cloud on Kubernetes (ECK) operator. The setup is optimized for ARM64 architecture and designed for educational demonstrations.

## Prerequisites

- MicroK8s cluster running on Raspberry Pi 5 nodes
- MetalLB configured for LoadBalancer services
- Persistent storage configured (hostpath-storage)
- At least 12GB RAM available across cluster
- SSD storage mounted on worker nodes

## ECK Operator Installation

### 1. Install ECK Operator

```bash
# Create namespace for Elastic resources
kubectl create namespace elastic-system

# Install ECK CRDs
kubectl apply -f https://download.elastic.co/downloads/eck/2.14.0/crds.yaml

# Install ECK operator
kubectl apply -f https://download.elastic.co/downloads/eck/2.14.0/operator.yaml

# Verify operator installation
kubectl get pods -n elastic-system
```

### 2. Verify ECK Installation

```bash
# Check operator logs
kubectl logs -n elastic-system -l control-plane=elastic-operator

# Check CRDs
kubectl get crd | grep elastic

# Expected CRDs:
# - elasticsearch.k8s.elastic.co
# - kibana.k8s.elastic.co
# - elasticsearchnode.k8s.elastic.co
```

## ARM64 Compatibility Configuration

### 1. Configure ARM64 Image Support

```bash
# Create ECK configuration for ARM64
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: elastic-operator-config
  namespace: elastic-system
data:
  eck.yml: |
    operator:
      config:
        container-registry: docker.elastic.co
        max-concurrent-reconciles: 3
        metrics-port: 8080
        webhook-cert-dir: /tmp/k8s-webhook-server/serving-certs
        operator-roles: "all"
        enable-webhook: true
        webhook-name: elastic-webhook.k8s.elastic.co
EOF
```

### 2. Verify ARM64 Support

```bash
# Check available Elasticsearch images for ARM64
docker manifest inspect docker.elastic.co/elasticsearch/elasticsearch:8.13.4 | grep -A 10 "arm64"

# Expected output should show ARM64 support
```

## Elasticsearch Cluster Configuration

### 1. Create Elasticsearch Cluster

```yaml
# elasticsearch-cluster.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: showdown-es
  namespace: elastic-system
spec:
  version: 8.13.4
  image: docker.elastic.co/elasticsearch/elasticsearch:8.13.4
  
  # Master nodes (control plane)
  nodeSets:
  - name: master
    count: 3
    config:
      node.roles: ["master"]
      cluster.initial_master_nodes: ["showdown-es-master-0", "showdown-es-master-1", "showdown-es-master-2"]
      cluster.name: showdown-cluster
      network.host: 0.0.0.0
      discovery.seed_hosts: []
      xpack.security.enabled: true
      xpack.security.transport.ssl.enabled: true
      xpack.security.transport.ssl.verification_mode: certificate
      xpack.security.transport.ssl.client_authentication: required
      xpack.security.transport.ssl.keystore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      xpack.security.transport.ssl.truststore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      xpack.security.http.ssl.enabled: true
      xpack.security.http.ssl.keystore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      
    podTemplate:
      spec:
        nodeSelector:
          hardware: pi5-8gb
        tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        containers:
        - name: elasticsearch
          env:
          - name: ES_JAVA_OPTS
            value: "-Xms1g -Xmx1g"
          resources:
            requests:
              memory: 2Gi
              cpu: 500m
            limits:
              memory: 2Gi
              cpu: 1000m
        initContainers:
        - name: sysctl
          securityContext:
            privileged: true
          command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
          
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
        storageClassName: hostpath-storage

  # Data nodes (workers with SSD)
  - name: data
    count: 3
    config:
      node.roles: ["data_hot", "data_content", "ingest", "transform"]
      cluster.name: showdown-cluster
      network.host: 0.0.0.0
      xpack.security.enabled: true
      xpack.security.transport.ssl.enabled: true
      xpack.security.transport.ssl.verification_mode: certificate
      xpack.security.transport.ssl.client_authentication: required
      xpack.security.transport.ssl.keystore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      xpack.security.transport.ssl.truststore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      xpack.security.http.ssl.enabled: true
      xpack.security.http.ssl.keystore.path: /usr/share/elasticsearch/config/certs/elastic-certificates.p12
      
    podTemplate:
      spec:
        nodeSelector:
          storage: ssd
        containers:
        - name: elasticsearch
          env:
          - name: ES_JAVA_OPTS
            value: "-Xms2g -Xmx2g"
          resources:
            requests:
              memory: 3Gi
              cpu: 1000m
            limits:
              memory: 3Gi
              cpu: 2000m
        initContainers:
        - name: sysctl
          securityContext:
            privileged: true
          command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
          
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 50Gi
        storageClassName: hostpath-storage

  # HTTP service configuration
  http:
    service:
      spec:
        type: LoadBalancer
        loadBalancerIP: 10.0.1.241
        ports:
        - name: https
          port: 9200
          protocol: TCP
          targetPort: 9200
    tls:
      selfSignedCertificate:
        disabled: false
        subjectAltNames:
        - ip: 10.0.1.241
        - dns: elasticsearch.local
        - dns: showdown-es-http.elastic-system.svc.cluster.local
EOF
```

### 2. Apply Elasticsearch Configuration

```bash
# Apply the Elasticsearch cluster configuration
kubectl apply -f elasticsearch-cluster.yaml

# Monitor cluster creation
kubectl get elasticsearch -n elastic-system
kubectl get pods -n elastic-system -l elasticsearch.k8s.elastic.co/cluster-name=showdown-es
```

### 3. Wait for Cluster Ready

```bash
# Wait for cluster to be ready (may take 5-10 minutes)
kubectl wait --for=condition=Ready elasticsearch/showdown-es -n elastic-system --timeout=600s

# Check cluster health
kubectl get elasticsearch showdown-es -n elastic-system -o yaml
```

## Kibana Setup

### 1. Create Kibana Instance

```yaml
# kibana.yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: showdown-kibana
  namespace: elastic-system
spec:
  version: 8.13.4
  image: docker.elastic.co/kibana/kibana:8.13.4
  count: 1
  
  elasticsearchRef:
    name: showdown-es
    namespace: elastic-system
    
  podTemplate:
    spec:
      nodeSelector:
        hardware: pi5-8gb
      containers:
      - name: kibana
        env:
        - name: NODE_OPTIONS
          value: "--max-old-space-size=1800"
        resources:
          requests:
            memory: 2Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 1000m
  
  http:
    service:
      spec:
        type: LoadBalancer
        loadBalancerIP: 10.0.1.242
        ports:
        - name: https
          port: 5601
          protocol: TCP
          targetPort: 5601
    tls:
      selfSignedCertificate:
        disabled: false
        subjectAltNames:
        - ip: 10.0.1.242
        - dns: kibana.local
        - dns: showdown-kibana-kb-http.elastic-system.svc.cluster.local
  
  config:
    server.publicBaseUrl: "https://10.0.1.242:5601"
    server.host: "0.0.0.0"
    elasticsearch.requestTimeout: 120000
    elasticsearch.shardTimeout: 60000
    kibana.index: ".kibana"
    logging.appenders.default.type: "console"
    logging.appenders.default.layout.type: "json"
    logging.loggers.plugins.type: "json"
    logging.root.level: "info"
EOF
```

### 2. Deploy Kibana

```bash
# Apply Kibana configuration
kubectl apply -f kibana.yaml

# Wait for Kibana to be ready
kubectl wait --for=condition=Ready kibana/showdown-kibana -n elastic-system --timeout=600s

# Check Kibana status
kubectl get kibana showdown-kibana -n elastic-system
```

## Access Configuration

### 1. Get Elasticsearch Credentials

```bash
# Get the elastic user password
kubectl get secret showdown-es-elastic-user -n elastic-system -o jsonpath='{.data.elastic}' | base64 -d

# Store credentials for later use
ES_PASSWORD=$(kubectl get secret showdown-es-elastic-user -n elastic-system -o jsonpath='{.data.elastic}' | base64 -d)
echo "Elasticsearch Password: $ES_PASSWORD"
```

### 2. Test Elasticsearch Connection

```bash
# Test connection (ignore certificate warnings for demo)
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200"

# Check cluster health
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_cluster/health?pretty"
```

### 3. Access Kibana

```bash
# Get Kibana URL
echo "Kibana URL: https://10.0.1.242:5601"
echo "Username: elastic"
echo "Password: $ES_PASSWORD"

# Open in browser (ignore certificate warnings)
```

## Index Templates and Mappings

### 1. Create Transaction Index Template

```bash
# Create index template for financial transactions
curl -k -u "elastic:$ES_PASSWORD" -X PUT "https://10.0.1.241:9200/_index_template/financial-transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["financial-transactions-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.refresh_interval": "5s",
        "index.max_result_window": 50000
      },
      "mappings": {
        "properties": {
          "transaction_id": {
            "type": "keyword"
          },
          "user_id": {
            "type": "keyword"
          },
          "amount": {
            "type": "scaled_float",
            "scaling_factor": 100
          },
          "currency": {
            "type": "keyword"
          },
          "timestamp": {
            "type": "date",
            "format": "strict_date_optional_time"
          },
          "description": {
            "type": "text",
            "analyzer": "standard"
          },
          "category": {
            "type": "keyword"
          },
          "location": {
            "type": "geo_point"
          },
          "merchant": {
            "type": "object",
            "properties": {
              "name": {
                "type": "text",
                "fields": {
                  "keyword": {
                    "type": "keyword"
                  }
                }
              },
              "category": {
                "type": "keyword"
              }
            }
          }
        }
      }
    }
  }'
```

### 2. Create Initial Index

```bash
# Create initial index
curl -k -u "elastic:$ES_PASSWORD" -X PUT "https://10.0.1.241:9200/financial-transactions-$(date +%Y%m%d)"

# Verify index creation
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_cat/indices?v"
```

## Sample Data Ingestion

### 1. Create Sample Transaction Data

```bash
# Create sample data script
cat <<'EOF' > generate-sample-data.py
#!/usr/bin/env python3
import json
import random
import datetime
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import ssl

# Elasticsearch connection
es = Elasticsearch(
    ['https://10.0.1.241:9200'],
    http_auth=('elastic', '$ES_PASSWORD'),
    verify_certs=False,
    ssl_show_warn=False
)

# Sample data generators
def generate_transaction():
    return {
        'transaction_id': f'tx_{random.randint(1000000, 9999999)}',
        'user_id': f'user_{random.randint(1000, 9999)}',
        'amount': round(random.uniform(5.0, 1000.0), 2),
        'currency': random.choice(['USD', 'EUR', 'GBP', 'JPY']),
        'timestamp': datetime.datetime.now() - datetime.timedelta(
            days=random.randint(0, 365),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        ),
        'description': random.choice([
            'Coffee purchase',
            'Gas station',
            'Grocery shopping',
            'Online subscription',
            'Restaurant bill',
            'ATM withdrawal',
            'Transfer to savings',
            'Utility payment'
        ]),
        'category': random.choice([
            'food_and_drink',
            'transportation',
            'shopping',
            'entertainment',
            'utilities',
            'transfer'
        ]),
        'location': {
            'lat': random.uniform(40.0, 41.0),
            'lon': random.uniform(-74.0, -73.0)
        },
        'merchant': {
            'name': random.choice([
                'Starbucks',
                'Shell',
                'Walmart',
                'Amazon',
                'McDonald\'s',
                'Target',
                'Best Buy'
            ]),
            'category': random.choice([
                'coffee_shop',
                'gas_station',
                'retail',
                'online',
                'restaurant',
                'department_store',
                'electronics'
            ])
        }
    }

# Generate and index sample data
def index_sample_data(count=1000):
    actions = []
    index_name = f'financial-transactions-{datetime.datetime.now().strftime("%Y%m%d")}'
    
    for i in range(count):
        doc = generate_transaction()
        action = {
            '_index': index_name,
            '_source': doc
        }
        actions.append(action)
        
        if len(actions) >= 100:
            bulk(es, actions)
            actions = []
            print(f'Indexed {i+1} documents...')
    
    if actions:
        bulk(es, actions)
    
    print(f'Finished indexing {count} documents to {index_name}')

if __name__ == '__main__':
    index_sample_data(10000)
EOF

# Make script executable
chmod +x generate-sample-data.py

# Install required Python packages
pip3 install elasticsearch

# Run sample data generation
python3 generate-sample-data.py
```

## Performance Optimization

### 1. Optimize JVM Settings

```bash
# Update Elasticsearch JVM settings for Pi hardware
kubectl patch elasticsearch showdown-es -n elastic-system --type='merge' -p='{
  "spec": {
    "nodeSets": [
      {
        "name": "master",
        "podTemplate": {
          "spec": {
            "containers": [
              {
                "name": "elasticsearch",
                "env": [
                  {
                    "name": "ES_JAVA_OPTS",
                    "value": "-Xms512m -Xmx512m -XX:+UseG1GC -XX:G1HeapRegionSize=4m -XX:+UseStringDeduplication"
                  }
                ]
              }
            ]
          }
        }
      }
    ]
  }
}'
```

### 2. Configure Index Settings

```bash
# Optimize index settings for performance
curl -k -u "elastic:$ES_PASSWORD" -X PUT "https://10.0.1.241:9200/_template/performance-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["financial-transactions-*"],
    "settings": {
      "index.refresh_interval": "30s",
      "index.number_of_shards": 3,
      "index.number_of_replicas": 1,
      "index.translog.flush_threshold_size": "1gb",
      "index.merge.policy.max_merged_segment": "2gb"
    }
  }'
```

## Monitoring and Alerting

### 1. Enable Cluster Monitoring

```bash
# Check cluster stats
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_cluster/stats?pretty"

# Monitor node performance
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_nodes/stats?pretty"
```

### 2. Set Up Kibana Monitoring

```bash
# Configure Kibana monitoring
kubectl patch kibana showdown-kibana -n elastic-system --type='merge' -p='{
  "spec": {
    "config": {
      "monitoring.ui.container.elasticsearch.enabled": true,
      "monitoring.ui.container.logstash.enabled": true,
      "xpack.monitoring.collection.enabled": true
    }
  }
}'
```

## Backup and Recovery

### 1. Configure Snapshot Repository

```bash
# Create snapshot repository
curl -k -u "elastic:$ES_PASSWORD" -X PUT "https://10.0.1.241:9200/_snapshot/backup-repo" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/backup",
      "compress": true
    }
  }'
```

### 2. Create Manual Snapshot

```bash
# Create snapshot
curl -k -u "elastic:$ES_PASSWORD" -X PUT "https://10.0.1.241:9200/_snapshot/backup-repo/snapshot-$(date +%Y%m%d-%H%M%S)" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "financial-transactions-*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

## Troubleshooting

### 1. Common Issues

**Pod Stuck in Pending:**
```bash
# Check node resources
kubectl describe nodes
kubectl get pods -n elastic-system -o wide

# Check events
kubectl get events -n elastic-system --sort-by='.lastTimestamp'
```

**Out of Memory Errors:**
```bash
# Reduce JVM heap size
kubectl patch elasticsearch showdown-es -n elastic-system --type='merge' -p='{
  "spec": {
    "nodeSets": [
      {
        "name": "data",
        "podTemplate": {
          "spec": {
            "containers": [
              {
                "name": "elasticsearch",
                "env": [
                  {
                    "name": "ES_JAVA_OPTS",
                    "value": "-Xms1g -Xmx1g"
                  }
                ]
              }
            ]
          }
        }
      }
    ]
  }
}'
```

### 2. Diagnostic Commands

```bash
# Check cluster health
kubectl get elasticsearch -n elastic-system
kubectl logs -n elastic-system -l elasticsearch.k8s.elastic.co/cluster-name=showdown-es

# Check ECK operator
kubectl logs -n elastic-system -l control-plane=elastic-operator

# Check node performance
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_cat/nodes?v"
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/_cat/health?v"
```

## Demo Queries

### 1. Basic Search Queries

```bash
# Search all transactions
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/financial-transactions-*/_search?pretty"

# Search by amount range
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/financial-transactions-*/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "amount": {
          "gte": 100,
          "lte": 500
        }
      }
    }
  }'
```

### 2. Aggregation Queries

```bash
# Aggregate by category
curl -k -u "elastic:$ES_PASSWORD" "https://10.0.1.241:9200/financial-transactions-*/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "size": 0,
    "aggs": {
      "categories": {
        "terms": {
          "field": "category"
        }
      }
    }
  }'
```

This Elasticsearch setup provides a robust, ARM64-compatible search engine optimized for the Epic Interactive NoSQL Showdown demonstration system. 