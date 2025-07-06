# Software Architecture

## System Overview

The Epic Interactive NoSQL Showdown is a distributed system designed to demonstrate real-time database performance comparison between MongoDB and Elasticsearch through interactive student participation. The system runs on a portable Kubernetes cluster using six Raspberry Pi 5 boards.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Students & Presenter                             │
│                          (Web Browsers / Mobile)                            │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │ HTTP/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │  React UI        │  │  Node.js API     │  │  PostgreSQL      │        │
│  │  (Frontend)      │  │  (Backend)       │  │  (User Data)     │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                          │                                                  │
│                          ▼                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                              │
│  │  MongoDB         │  │  Elasticsearch   │                              │
│  │  (Document DB)   │  │  (Search Engine) │                              │
│  └──────────────────┘  └──────────────────┘                              │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                              │
│  │  Prometheus      │  │  Grafana         │                              │
│  │  (Metrics)       │  │  (Dashboards)    │                              │
│  └──────────────────┘  └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Layer (React UI)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Socket.io-client for real-time communication
- React Router for navigation

**Key Features:**
- User registration and authentication
- Real-time leaderboard updates
- Interactive stress testing interface
- Responsive design for mobile and desktop

**ARM64 Compatibility:**
- Uses official `node:20-alpine` base image (multi-arch)
- All dependencies are JavaScript-based (platform-agnostic)

### 2. Backend Layer (Node.js API)

**Technology Stack:**
- Node.js 20 with TypeScript
- Express.js for HTTP server
- Socket.io for WebSocket communication
- Prisma ORM for database operations
- Prometheus client for metrics

**Core Services:**
- User management and scoring
- Real-time event broadcasting
- Database stress testing coordination
- Performance metrics collection

**ARM64 Compatibility:**
- Uses official `node:20-alpine` base image
- All Node.js dependencies are compatible with ARM64

### 3. Database Layer

#### PostgreSQL (User Data)
- **Image:** `postgres:15-alpine` (official ARM64 support)
- **Purpose:** User profiles, scores, and session data
- **Configuration:** Single instance with persistent storage

#### MongoDB (Document Database)
- **Image:** `mongo:7.0` (official ARM64 support)
- **Purpose:** Performance benchmarking target
- **Configuration:** 3-node replica set across Pi workers

#### Elasticsearch (Search Engine)
- **Image:** `docker.elastic.co/elasticsearch/elasticsearch:8.13.4` (ARM64 support)
- **Purpose:** Performance benchmarking target
- **Configuration:** 3-node cluster with ECK operator

### 4. Monitoring & Observability

#### Prometheus
- **Image:** `prom/prometheus:latest` (multi-arch)
- **Purpose:** Metrics collection and storage
- **Configuration:** Scrapes all services and infrastructure

#### Grafana
- **Image:** `grafana/grafana:latest` (multi-arch)
- **Purpose:** Visualization and dashboards
- **Configuration:** Pre-configured dashboards for demo

## Data Flow Architecture

### 1. User Registration Flow
```
Student Browser → React UI → Node.js API → PostgreSQL
                                       ↓
                              WebSocket Broadcast ← All Connected Clients
```

### 2. Stress Test Flow
```
Student Action → React UI → WebSocket → Node.js API
                                           ↓
                                    ┌─────────────┐
                                    │  Dispatcher │
                                    └─────────────┘
                                           ↓
                    ┌─────────────────────────────────────────┐
                    ▼                                         ▼
            ┌──────────────┐                         ┌──────────────┐
            │   MongoDB    │                         │ Elasticsearch │
            │   Client     │                         │   Client     │
            └──────────────┘                         └──────────────┘
                    ↓                                         ↓
            ┌──────────────┐                         ┌──────────────┐
            │   Metrics    │                         │   Metrics    │
            │ Collection   │                         │ Collection   │
            └──────────────┘                         └──────────────┘
                    ↓                                         ↓
                    └─────────────────────────────────────────┘
                                           ↓
                                    ┌─────────────┐
                                    │ Prometheus  │
                                    │   Storage   │
                                    └─────────────┘
```

### 3. Real-time Updates Flow
```
Database Response → Metrics Collection → Prometheus
                                            ↓
                                     Grafana Dashboard
                                            ↓
                                  WebSocket Broadcast
                                            ↓
                                      React UI Update
```

## Service Communication

### Internal Service Discovery
All services communicate using Kubernetes DNS:
- `api.default.svc.cluster.local:4000` - Backend API
- `postgres.default.svc.cluster.local:5432` - PostgreSQL
- `mongodb.default.svc.cluster.local:27017` - MongoDB
- `elasticsearch.default.svc.cluster.local:9200` - Elasticsearch

### External Access
Services are exposed via MetalLB LoadBalancer internally:
- `10.0.1.240` - Kubernetes Dashboard
- `10.0.1.241` - Elasticsearch
- `10.0.1.242` - Kibana
- `10.0.1.243` - React UI
- `10.0.1.244` - Node.js API
- `10.0.1.245` - Grafana
- `10.0.1.246` - Prometheus

Student access is provided through ngrok tunnels:
- React UI: `https://showdown-XXX.ngrok.io`
- API: `https://api-XXX.ngrok.io`
- Monitoring: `https://grafana-XXX.ngrok.io`

## Security Architecture

### Network Security
- **NetworkPolicies:** Restrict pod-to-pod communication
- **Service Mesh:** Optional Istio for advanced traffic management
- **TLS:** All external communications encrypted

### Authentication & Authorization
- **Student Access:** Simple name-based registration
- **Admin Access:** Kubernetes RBAC with ServiceAccount tokens
- **Database Access:** Internal credentials via Kubernetes Secrets

## Scalability Design

### Horizontal Scaling
- **Frontend:** Stateless React containers (scale to N replicas)
- **Backend:** Stateless Node.js API (scale to N replicas)
- **Databases:** Cluster-native scaling (MongoDB replica sets, Elasticsearch clusters)

### Resource Management
- **CPU Limits:** All containers have resource limits
- **Memory Limits:** Prevents OOM kills during demos
- **Storage:** Persistent volumes for database data

## Deployment Architecture

### Container Images
All images are built for ARM64 architecture:
```dockerfile
# Example multi-arch build
FROM --platform=linux/arm64 node:20-alpine
```

### Kubernetes Manifests
- **Namespaces:** Logical separation of components
- **Deployments:** Application workloads
- **Services:** Network exposure
- **PersistentVolumes:** Data storage
- **ConfigMaps:** Configuration management
- **Secrets:** Sensitive data management

## Performance Considerations

### Resource Allocation
- **Pi 5 8GB:** Control plane + master database nodes
- **Pi 5 4GB:** Worker nodes + data replicas
- **CPU:** Balanced allocation across workloads
- **Memory:** Reserved for database caches

### Network Optimization
- **CNI:** Flannel for simplicity and ARM64 compatibility
- **Load Balancing:** MetalLB Layer 2 mode
- **Service Mesh:** Optional for advanced scenarios

## ARM64 Compatibility Matrix

| Component | Base Image | ARM64 Support | Notes |
|-----------|------------|---------------|-------|
| React UI | `node:20-alpine` | ✅ Native | Official multi-arch |
| Node.js API | `node:20-alpine` | ✅ Native | Official multi-arch |
| PostgreSQL | `postgres:15-alpine` | ✅ Native | Official multi-arch |
| MongoDB | `mongo:7.0` | ✅ Native | Official multi-arch |
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch:8.13.4` | ✅ Native | Official ARM64 |
| Prometheus | `prom/prometheus:latest` | ✅ Native | Official multi-arch |
| Grafana | `grafana/grafana:latest` | ✅ Native | Official multi-arch |
| Nginx | `nginx:alpine` | ✅ Native | Official multi-arch |

## High Availability Design

### Database Resilience
- **MongoDB:** 3-node replica set with automatic failover
- **Elasticsearch:** 3-node cluster with shard replication
- **PostgreSQL:** Single instance with persistent storage backup

### Application Resilience
- **Multiple Replicas:** Frontend and backend run with 2+ replicas
- **Health Checks:** Kubernetes liveness and readiness probes
- **Graceful Shutdown:** Proper signal handling for clean restarts

### Infrastructure Resilience
- **Node Failure:** Workloads automatically reschedule
- **Network Partition:** Service mesh routing around failures
- **Storage Failure:** Persistent volume redundancy

## Monitoring Architecture

### Metrics Collection
- **Node Metrics:** CPU, memory, disk, network per Pi
- **Application Metrics:** Request rates, response times, error rates
- **Database Metrics:** Query performance, connection counts, replica lag

### Alerting
- **Threshold-based:** CPU, memory, disk usage alerts
- **Anomaly Detection:** Unusual patterns in request rates
- **Service Health:** Pod restart and failure notifications

### Visualization
- **Real-time Dashboards:** Live performance metrics
- **Historical Analysis:** Trend analysis and capacity planning
- **Demo Mode:** Simplified views for presentation

This architecture ensures a robust, scalable, and ARM64-compatible system that can effectively demonstrate database performance characteristics while providing an engaging interactive experience for students. 