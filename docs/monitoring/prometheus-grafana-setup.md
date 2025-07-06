# Prometheus & Grafana Monitoring Setup

## Overview

This guide covers the setup of comprehensive monitoring for the Epic Interactive NoSQL Showdown cluster using Prometheus for metrics collection and Grafana for visualization. The setup is optimized for ARM64 Raspberry Pi hardware.

## Prerequisites

- MicroK8s cluster with observability addon enabled
- MetalLB configured for LoadBalancer services
- Persistent storage available (hostpath-storage)
- ARM64 compatible container images

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Monitoring Stack                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Prometheus │  │   Grafana   │  │ AlertManager│            │
│  │  (Metrics)  │  │(Dashboards) │  │   (Alerts)  │            │
│  └─────┬───────┘  └─────┬───────┘  └─────────────┘            │
│        │                │                                       │
│        └────────────────┼─────────────────────────────────────┐ │
│                         │                                     │ │
│  ┌─────────────────────────────────────────────────────────┐ │ │
│  │                Target Services                          │ │ │
│  │                                                         │ │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │ │
│  │  │ Node     │ │MongoDB   │ │Elastic   │ │ App      │  │ │ │
│  │  │Exporter  │ │Exporter  │ │Metrics   │ │Metrics   │  │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │ │
│  └─────────────────────────────────────────────────────────┘ │ │
│                                                             │ │
└─────────────────────────────────────────────────────────────┼─┘
                                                              │
                    ┌─────────────────────────────────────────┘
                    │
                    ▼
            ┌─────────────────┐
            │   Raspberry Pi  │
            │    Hardware     │
            │   Monitoring    │
            └─────────────────┘
```

## Enable MicroK8s Observability

### 1. Enable Observability Addon

```bash
# Enable built-in observability stack
microk8s enable observability

# Verify deployment
kubectl get pods -n observability
kubectl get services -n observability

# Check if Prometheus and Grafana are running
kubectl get pods -n observability | grep -E "(prometheus|grafana)"
```

### 2. Configure LoadBalancer Access

```bash
# Expose Grafana via LoadBalancer
kubectl patch svc grafana -n observability -p '{"spec":{"type":"LoadBalancer","loadBalancerIP":"10.0.1.245"}}'

# Expose Prometheus via LoadBalancer
kubectl patch svc prometheus -n observability -p '{"spec":{"type":"LoadBalancer","loadBalancerIP":"10.0.1.246"}}'

# Verify services
kubectl get svc -n observability
```

## Custom Monitoring Configuration

### 1. Enhanced Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config-custom
  namespace: observability
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'pi-showdown'
        environment: 'demo'

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      # Kubernetes API Server
      - job_name: 'kubernetes-apiservers'
        kubernetes_sd_configs:
        - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
          action: keep
          regex: default;kubernetes;https

      # Kubernetes Nodes
      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
        - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/${1}/proxy/metrics

      # Node Exporter
      - job_name: 'node-exporter'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_endpoints_name]
          regex: 'node-exporter'
          action: keep

      # Kubelet cAdvisor
      - job_name: 'kubernetes-cadvisor'
        kubernetes_sd_configs:
        - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor

      # MongoDB Exporter
      - job_name: 'mongodb-exporter'
        static_configs:
        - targets: ['mongodb-exporter.mongodb-system.svc.cluster.local:9216']
        scrape_interval: 30s

      # Elasticsearch Metrics
      - job_name: 'elasticsearch'
        static_configs:
        - targets: ['showdown-es-http.elastic-system.svc.cluster.local:9200']
        metrics_path: /_prometheus/metrics
        scrape_interval: 30s

      # Application Metrics
      - job_name: 'showdown-api'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          regex: 'showdown-api'
          action: keep
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          regex: 'metrics'
          action: keep

      # Raspberry Pi Hardware Metrics
      - job_name: 'pi-hardware'
        static_configs:
        - targets:
          - 'fractal1:9100'
          - 'fractal2:9100'
          - 'fractal3:9100'
          - 'fractal4:9100'
          - 'fractal5:9100'
          - 'fractal6:9100'
        scrape_interval: 10s
        metrics_path: /metrics
EOF
```

### 2. Apply Prometheus Configuration

```bash
# Apply custom configuration
kubectl apply -f prometheus-config.yaml

# Restart Prometheus to pick up new config
kubectl rollout restart deployment/prometheus -n observability
```

## Node Exporter for Raspberry Pi

### 1. Deploy Node Exporter DaemonSet

```yaml
# node-exporter-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: observability
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      tolerations:
      - operator: Exists
        effect: NoSchedule
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        args:
        - '--path.procfs=/host/proc'
        - '--path.sysfs=/host/sys'
        - '--path.rootfs=/host'
        - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
        - '--collector.cpu.info'
        - '--collector.diskstats'
        - '--collector.filesystem'
        - '--collector.loadavg'
        - '--collector.meminfo'
        - '--collector.netdev'
        - '--collector.netstat'
        - '--collector.stat'
        - '--collector.time'
        - '--collector.thermal_zone'
        - '--collector.hwmon'
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        resources:
          requests:
            memory: 64Mi
            cpu: 50m
          limits:
            memory: 128Mi
            cpu: 100m
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: observability
  labels:
    app: node-exporter
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: node-exporter
  ports:
  - name: metrics
    port: 9100
    targetPort: 9100
EOF
```

### 2. Deploy Node Exporter

```bash
# Apply node exporter configuration
kubectl apply -f node-exporter-daemonset.yaml

# Verify deployment
kubectl get pods -n observability -l app=node-exporter
kubectl get svc node-exporter -n observability
```

## Grafana Dashboard Configuration

### 1. Access Grafana

```bash
# Get Grafana admin password
kubectl get secret grafana-admin -n observability -o jsonpath='{.data.password}' | base64 -d

# Access Grafana
echo "Grafana URL: http://10.0.1.245:3000"
echo "Username: admin"
echo "Password: $(kubectl get secret grafana-admin -n observability -o jsonpath='{.data.password}' | base64 -d)"
```

### 2. Import Raspberry Pi Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Raspberry Pi Cluster Monitoring",
    "tags": ["raspberry-pi", "cluster"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "yAxes": [{"unit": "percent", "max": 100}],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{instance}}"
          }
        ],
        "yAxes": [{"unit": "percent", "max": 100}],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Temperature",
        "type": "graph",
        "targets": [
          {
            "expr": "node_hwmon_temp_celsius",
            "legendFormat": "{{chip}} {{sensor}}"
          }
        ],
        "yAxes": [{"unit": "celsius"}],
        "thresholds": [
          {"value": 70, "color": "yellow"},
          {"value": 80, "color": "red"}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes{fstype!=\"tmpfs\"} / node_filesystem_size_bytes{fstype!=\"tmpfs\"})) * 100",
            "legendFormat": "{{instance}} {{mountpoint}}"
          }
        ],
        "yAxes": [{"unit": "percent", "max": 100}],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Network Traffic",
        "type": "graph",
        "targets": [
          {
            "expr": "irate(node_network_receive_bytes_total{device!=\"lo\"}[5m])",
            "legendFormat": "{{instance}} {{device}} RX"
          },
          {
            "expr": "irate(node_network_transmit_bytes_total{device!=\"lo\"}[5m])",
            "legendFormat": "{{instance}} {{device}} TX"
          }
        ],
        "yAxes": [{"unit": "bytes"}],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "10s"
  }
}
```

### 3. Database Performance Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Database Performance - MongoDB vs Elasticsearch",
    "tags": ["database", "performance"],
    "panels": [
      {
        "id": 1,
        "title": "MongoDB Operations/sec",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mongodb_op_counters_total[5m])",
            "legendFormat": "{{type}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Elasticsearch Query Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(elasticsearch_indices_search_query_total[5m])",
            "legendFormat": "{{node}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "MongoDB Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "mongodb_mongod_op_latencies_latency{type=\"reads\"} / mongodb_mongod_op_latencies_ops{type=\"reads\"}",
            "legendFormat": "Read Latency"
          },
          {
            "expr": "mongodb_mongod_op_latencies_latency{type=\"writes\"} / mongodb_mongod_op_latencies_ops{type=\"writes\"}",
            "legendFormat": "Write Latency"
          }
        ],
        "yAxes": [{"unit": "µs"}],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Elasticsearch Query Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(elasticsearch_indices_search_query_time_seconds[5m]) / rate(elasticsearch_indices_search_query_total[5m])",
            "legendFormat": "{{node}}"
          }
        ],
        "yAxes": [{"unit": "s"}],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ]
  }
}
```

## Alert Rules Configuration

### 1. Create Alert Rules

```yaml
# alert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: observability
data:
  alerts.yml: |
    groups:
    - name: raspberry-pi
      rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% on {{ $labels.instance }} for more than 5 minutes."

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% on {{ $labels.instance }}."

      - alert: HighTemperature
        expr: node_hwmon_temp_celsius > 75
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High temperature on {{ $labels.instance }}"
          description: "Temperature is {{ $value }}°C on {{ $labels.instance }}."

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk usage is above 90% on {{ $labels.instance }} {{ $labels.mountpoint }}."

    - name: kubernetes
      rules:
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
          description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} has been restarting frequently."

      - alert: NodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node {{ $labels.node }} is not ready"
          description: "Node {{ $labels.node }} has been not ready for more than 5 minutes."

    - name: databases
      rules:
      - alert: MongoDBDown
        expr: up{job="mongodb-exporter"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB is down"
          description: "MongoDB exporter has been down for more than 2 minutes."

      - alert: ElasticsearchDown
        expr: up{job="elasticsearch"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Elasticsearch is down"
          description: "Elasticsearch has been down for more than 2 minutes."
EOF
```

### 2. Apply Alert Rules

```bash
# Apply alert rules
kubectl apply -f alert-rules.yaml

# Reload Prometheus configuration
kubectl exec -n observability deployment/prometheus -- killall -HUP prometheus
```

## Application Metrics Integration

### 1. Add Metrics to Node.js API

```typescript
// services/api/src/metrics.ts
import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const databaseOperationDuration = new promClient.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations',
  labelNames: ['operation', 'database', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseOperationDuration);

export { register, httpRequestDuration, httpRequestTotal, activeConnections, databaseOperationDuration };
```

### 2. Add Metrics Endpoint

```typescript
// services/api/src/index.ts
import express from 'express';
import { register } from './metrics';

const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

## Performance Testing Dashboard

### 1. Load Testing Metrics

```bash
# Create load testing dashboard
cat <<EOF > load-testing-dashboard.json
{
  "dashboard": {
    "title": "Load Testing - MongoDB vs Elasticsearch",
    "panels": [
      {
        "title": "Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"showdown-api\"}[1m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_bucket{job=\"showdown-api\"}[1m])",
            "legendFormat": "{{le}}"
          }
        ]
      },
      {
        "title": "Database Operation Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(database_operation_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile - {{database}} {{operation}}"
          },
          {
            "expr": "histogram_quantile(0.50, rate(database_operation_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile - {{database}} {{operation}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
EOF
```

## Maintenance and Backup

### 1. Prometheus Data Retention

```bash
# Configure Prometheus retention
kubectl patch deployment prometheus -n observability -p '{"spec":{"template":{"spec":{"containers":[{"name":"prometheus","args":["--config.file=/etc/prometheus/prometheus.yml","--storage.tsdb.path=/prometheus/data","--storage.tsdb.retention.time=30d","--web.console.libraries=/usr/share/prometheus/console_libraries","--web.console.templates=/usr/share/prometheus/consoles"]}]}}}}'
```

### 2. Grafana Backup

```bash
# Backup Grafana dashboards and datasources
kubectl exec -n observability deployment/grafana -- sqlite3 /var/lib/grafana/grafana.db ".backup /tmp/grafana-backup.db"
kubectl cp observability/grafana-pod:/tmp/grafana-backup.db ./grafana-backup-$(date +%Y%m%d).db
```

## Troubleshooting

### 1. Common Issues

**Metrics not appearing:**
```bash
# Check Prometheus targets
kubectl port-forward -n observability svc/prometheus 9090:9090
# Access http://localhost:9090/targets

# Check if exporters are running
kubectl get pods -n observability -l app=node-exporter
kubectl get pods -n mongodb-system -l app=mongodb-exporter
```

**High resource usage:**
```bash
# Reduce Prometheus scrape interval
kubectl edit configmap prometheus-config-custom -n observability
# Change scrape_interval from 15s to 30s

# Limit Grafana dashboard refresh rate
# Set minimum refresh interval to 30s in Grafana settings
```

### 2. Performance Optimization

```bash
# Optimize Prometheus for Raspberry Pi
kubectl patch deployment prometheus -n observability -p '{"spec":{"template":{"spec":{"containers":[{"name":"prometheus","resources":{"requests":{"memory":"512Mi","cpu":"250m"},"limits":{"memory":"1Gi","cpu":"500m"}}}]}}}}'

# Optimize Grafana for Raspberry Pi
kubectl patch deployment grafana -n observability -p '{"spec":{"template":{"spec":{"containers":[{"name":"grafana","resources":{"requests":{"memory":"256Mi","cpu":"100m"},"limits":{"memory":"512Mi","cpu":"200m"}}}]}}}}'
```

This monitoring setup provides comprehensive observability for the Epic Interactive NoSQL Showdown system, optimized for ARM64 Raspberry Pi hardware with detailed metrics for both infrastructure and application performance. 