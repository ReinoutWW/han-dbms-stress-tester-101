# Epic Interactive NoSQL Showdown 🚀

> A distributed performance benchmarking system for MongoDB vs Elasticsearch, running on a portable Kubernetes cluster powered by Raspberry Pi 5 boards.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)](https://www.elastic.co/)

## 📸 Live Demo

<div align="center">
  <img src="docs/images/demo-screenshot.png" alt="Live Demo Screenshot" width="600">
  <p><em>Real-time performance comparison during university demonstration</em></p>
</div>

## 🎯 Overview

The **Epic Interactive NoSQL Showdown** is an educational platform designed for live university demonstrations. Students can participate in real-time database performance testing, comparing MongoDB and Elasticsearch through an engaging, gamified interface.

### Key Features

- 🎮 **Interactive Web Interface** - Students join via their phones/laptops
- ⚡ **Real-time Performance Metrics** - Live latency and throughput visualization
- 🏆 **Gamified Leaderboard** - Competitive stress testing with scores
- 📊 **Grafana Dashboards** - Professional monitoring and analytics
- 🍓 **Raspberry Pi Cluster** - Portable 6-node Kubernetes environment
- 🔄 **High Availability** - Demonstrates database resilience and failover

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "External Access"
        S[Students]
        P[Presenter]
    end
    
    subgraph "Kubernetes Cluster (6 Raspberry Pi 5)"
        subgraph "Frontend"
            UI[React UI<br/>Vite + TypeScript]
        end
        
        subgraph "Backend Services"
            API[Node.js API<br/>Express + Socket.io]
            PG[PostgreSQL<br/>User Data]
        end
        
        subgraph "NoSQL Databases"
            M[MongoDB<br/>3-node Replica Set]
            E[Elasticsearch<br/>3-node Cluster]
        end
        
        subgraph "Monitoring"
            PR[Prometheus]
            GR[Grafana]
        end
    end
    
    S -->|HTTPS| UI
    P -->|HTTPS| UI
    UI <-->|WebSocket| API
    API --> PG
    API --> M
    API --> E
    M --> PR
    E --> PR
    API --> PR
    PR --> GR
    
    style UI fill:#61DAFB,stroke:#333,stroke-width:2px
    style API fill:#43853D,stroke:#333,stroke-width:2px
    style M fill:#47A248,stroke:#333,stroke-width:2px
    style E fill:#005571,stroke:#333,stroke-width:2px
    style PR fill:#E6522C,stroke:#333,stroke-width:2px
    style GR fill:#F46800,stroke:#333,stroke-width:2px
```

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant Student
    participant React UI
    participant WebSocket
    participant Node.js API
    participant MongoDB
    participant Elasticsearch
    participant Prometheus
    participant Grafana
    
    Student->>React UI: Register Name
    React UI->>Node.js API: POST /register
    Node.js API->>PostgreSQL: Store User
    Node.js API-->>WebSocket: Broadcast New User
    
    Student->>React UI: Start Stress Test
    React UI->>WebSocket: emit('stress-test')
    WebSocket->>Node.js API: Handle Test Request
    
    par MongoDB Test
        Node.js API->>MongoDB: Execute Queries
        MongoDB-->>Node.js API: Return Results
    and Elasticsearch Test
        Node.js API->>Elasticsearch: Execute Queries
        Elasticsearch-->>Node.js API: Return Results
    end
    
    Node.js API->>Prometheus: Export Metrics
    Prometheus->>Grafana: Scrape Metrics
    Node.js API-->>WebSocket: Broadcast Results
    WebSocket-->>React UI: Update Leaderboard
    React UI-->>Student: Show Real-time Results
```


```mermaid
---
config:
  theme: default
  layout: elk
---
flowchart TB
 subgraph Internet["🌍 Internet Access"]
        Students["👥 Students<br>(Browsers/Mobile)"]
        OAuth["🔐 Google OAuth<br>(Netherlands Only)"]
  end
 subgraph ngrok["🔗 ngrok Tunnels (Geographic Restrictions)"]
    direction TB
        NGK1["🇳🇱 showdown-XXX.ngrok.io<br>(Geo-blocked + OAuth)"]
        NGK2["🇳🇱 api-XXX.ngrok.io<br>(Rate Limited)"]
        NGK3["🇳🇱 grafana-XXX.ngrok.io<br>(Monitoring)"]
        NGK4["🇳🇱 kibana-XXX.ngrok.io<br>(Elasticsearch UI)"]
  end
 subgraph Network["🌐 Network Hardware"]
        FortiGate["🛡️ FortiGate 50G<br>10.0.1.1/24<br>(Router/L3/NAT)"]
        UniFiSwitch["🔀 UniFi Lite 8 PoE<br>(L2 Switch)<br>8× Gigabit Ports"]
        AdminLaptop["💻 Admin Laptop<br>10.0.1.50<br>(ngrok host)"]
  end
 subgraph Compute["🖥️ Compute Cluster"]
        Pi1["🥧 fractal1<br>Pi 5 8 GB<br>10.0.1.3<br>Control Plane"]
        Pi2["🥧 fractal2<br>Pi 5 8 GB<br>10.0.1.4<br>Worker"]
        Pi3["🥧 fractal3<br>Pi 5 4 GB<br>10.0.1.5<br>Worker"]
        Pi4["🥧 fractal4<br>Pi 5 4 GB<br>10.0.1.6<br>Worker"]
        Pi5["🥧 fractal5<br>Pi 5 4 GB<br>10.0.1.7<br>Worker"]
        Pi6["🥧 fractal6<br>Pi 5 4 GB<br>10.0.1.8<br>Worker"]
  end
 subgraph Storage["💾 Storage"]
        SD1["64 GB MicroSD<br>(fractal1)"]
        SD2["64 GB MicroSD<br>(fractal2)"]
        SD3["64 GB MicroSD<br>(fractal3)"]
        SD4["64 GB MicroSD<br>(fractal4)"]
        SD5["64 GB MicroSD<br>(fractal5)"]
        SD6["64 GB MicroSD<br>(fractal6)"]
  end
 subgraph Hardware["🏗️ Physical Hardware Infrastructure"]
    direction TB
        Network
        Compute
        Storage
  end
 subgraph MetalLB["⚖️ MetalLB LoadBalancer Pool (10.0.1.240-250)"]
    direction TB
        LB1["🎨 React UI<br>10.0.1.243:80"]
        LB2["🔧 Node.js API<br>10.0.1.244:3000"]
        LB3["📊 Grafana<br>10.0.1.245:3000"]
        LB4["🔍 Kibana<br>10.0.1.242:5601"]
        LB5["📈 Prometheus<br>10.0.1.246:9090"]
        LB6["🎛️ K8s Dashboard<br>10.0.1.240:443"]
        LB7["🗃️ MongoDB Express<br>10.0.1.247:8081"]
        LB8["⚡ Elasticsearch<br>10.0.1.241:9200"]
  end
 subgraph ControlPlane["🎯 Control Plane (fractal1)"]
        APIServer["kube-apiserver"]
        ETCD["etcd"]
        Scheduler["kube-scheduler"]
        Controller["kube-controller"]
        CP_ANCHOR(("anchor"))
  end
 subgraph Applications["📱 Application Pods"]
        ReactApp["React Frontend<br>(Socket.io Client)"]
        NodeAPI["Node.js API<br>(Express + Socket.io)"]
        UserManagement["User Management<br>(Authentication)"]
  end
 subgraph MongoDB["🍃 MongoDB Replica Set"]
        MongoPrimary["Primary<br>(fractal1)"]
        MongoSecondary1["Secondary<br>(fractal2)"]
        MongoSecondary2["Secondary<br>(fractal3)"]
  end
 subgraph Elasticsearch["🔍 Elasticsearch Cluster"]
        ESMaster["Master<br>(fractal2)"]
        ESData1["Data Node<br>(fractal4)"]
        ESData2["Data Node<br>(fractal5)"]
        ESData3["Data Node<br>(fractal6)"]
  end
 subgraph PostgreSQL["🐘 PostgreSQL"]
        Postgres["User Data<br>(fractal1)"]
  end
 subgraph Databases["🗄️ Database Layer"]
        MongoDB
        Elasticsearch
        PostgreSQL
  end
 subgraph Exporters["📡 Metric Exporters"]
        NodeExporter["Node Exporter<br>(All Nodes)"]
        MongoExporter["MongoDB Exporter"]
        ESExporter["ES Exporter"]
  end
 subgraph Monitoring["📊 Monitoring Stack"]
        Prometheus["Prometheus<br>(Metrics Collection)"]
        Grafana["Grafana<br>(Dashboards)"]
        Kibana["Kibana<br>(ES Visualization)"]
        Exporters
  end
 subgraph NetworkPolicy["🔐 Network Policies"]
        CoreDNS["CoreDNS<br>(Service Discovery)"]
        Flannel["Flannel CNI<br>(Pod Network)"]
        MetalLBSpeaker["MetalLB Speaker<br>(Load Balancing)"]
  end
 subgraph K8s["☸️ Kubernetes Cluster (MicroK8s)"]
    direction TB
        ControlPlane
        Applications
        Databases
        Monitoring
        NetworkPolicy
        K8S_ANCHOR(("anchor"))
  end
    Pi1 -. Boot .-> SD1
    Pi2 -. Boot .-> SD2
    Pi3 -. Boot .-> SD3
    Pi4 -. Boot .-> SD4
    Pi5 -. Boot .-> SD5
    Pi6 -. Boot .-> SD6
    FortiGate -- Gigabit --- UniFiSwitch
    UniFiSwitch -- Cat6 --- Pi1 & Pi2 & Pi3 & Pi4 & Pi5 & Pi6 & AdminLaptop
    Students --> OAuth
    OAuth --> NGK1 & NGK2 & NGK3 & NGK4
    NGK1 --> AdminLaptop
    NGK2 --> AdminLaptop
    NGK3 --> AdminLaptop
    NGK4 --> AdminLaptop
    AdminLaptop --> FortiGate
    FortiGate --> UniFiSwitch
    UniFiSwitch --> LB1 & LB2 & LB3 & LB4 & LB5 & LB6 & LB7 & LB8
    LB1 --> ReactApp
    LB2 --> NodeAPI
    LB3 --> Grafana
    LB4 --> Kibana
    LB5 --> Prometheus
    LB6 --> APIServer
    LB7 --> MongoPrimary
    LB8 --> ESMaster
    ReactApp -. WebSocket .-> NodeAPI
    NodeAPI --> UserManagement & Postgres & MongoPrimary & ESMaster & Prometheus
    MongoPrimary -. Replica .-> MongoSecondary1 & MongoSecondary2
    ESMaster -. Cluster .-> ESData1 & ESData2 & ESData3
    NodeExporter --> Prometheus
    MongoExporter --> Prometheus
    ESExporter --> Prometheus
    Prometheus --> Grafana
    ESMaster --> Kibana
    Grafana -. Dashboard Updates .-> ReactApp
    NodeAPI -. Metrics .-> ReactApp
    APIServer -. Control .-> CP_ANCHOR
    ETCD -. State .-> APIServer
    Scheduler -. Pod Placement .-> Pi1 & Pi2 & Pi3 & Pi4 & Pi5 & Pi6
    CoreDNS -. DNS .-> K8S_ANCHOR
    Flannel -. CNI .-> K8S_ANCHOR
    MetalLBSpeaker -. ARP .-> FortiGate
     Students:::external
     OAuth:::external
     NGK1:::external
     NGK2:::external
     NGK3:::external
     NGK4:::external
     FortiGate:::network
     UniFiSwitch:::network
     AdminLaptop:::network
     Pi1:::hardware
     Pi2:::hardware
     Pi3:::hardware
     Pi4:::hardware
     Pi5:::hardware
     Pi6:::hardware
     SD1:::storage
     SD2:::storage
     SD3:::storage
     SD4:::storage
     SD5:::storage
     SD6:::storage
     LB1:::loadbalancer
     LB2:::loadbalancer
     LB3:::loadbalancer
     LB4:::loadbalancer
     LB5:::loadbalancer
     LB6:::loadbalancer
     LB7:::loadbalancer
     LB8:::loadbalancer
     APIServer:::k8s
     ETCD:::k8s
     Scheduler:::k8s
     Controller:::k8s
     CP_ANCHOR:::anchor
     ReactApp:::app
     NodeAPI:::app
     UserManagement:::app
     MongoPrimary:::database
     MongoSecondary1:::database
     MongoSecondary2:::database
     ESMaster:::database
     ESData1:::database
     ESData2:::database
     ESData3:::database
     Postgres:::database
     NodeExporter:::monitor
     MongoExporter:::monitor
     ESExporter:::monitor
     Prometheus:::monitor
     Grafana:::monitor
     Kibana:::monitor
     CoreDNS:::k8s
     Flannel:::k8s
     MetalLBSpeaker:::k8s
     K8S_ANCHOR:::anchor
    classDef external     fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef hardware     fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef network      fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef loadbalancer fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef app          fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef database     fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    classDef monitor      fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef k8s          fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    classDef storage      fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef anchor       fill:transparent,stroke:none,color:transparent


```

## 🛠️ Technology Stack

### Frontend
- **React 19** - Latest React with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Socket.io Client** - Real-time WebSocket communication
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization

### Backend
- **Node.js 20** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **Prisma ORM** - Type-safe database access
- **TypeScript** - Type safety and better DX

### Databases
- **PostgreSQL 15** - User management and session data
- **MongoDB 7.0** - Document database benchmarking
- **Elasticsearch 8.13** - Search engine benchmarking

### Infrastructure
- **Kubernetes** - Container orchestration (MicroK8s)
- **Docker** - Containerization
- **MetalLB** - Load balancing
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- Kubernetes cluster (or Docker Desktop with K8s)
- 6× Raspberry Pi 5 (for production deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/han-dbms-stress-tester-101.git
   cd han-dbms-stress-tester-101
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd api && npm install
   npm run prisma:generate
   npm run prisma:migrate
   
   # Frontend
   cd ../ui && npm install
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd api && npm run dev
   
   # Terminal 2 - Frontend
   cd ui && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:4000
   - PostgreSQL: localhost:5432
   - MongoDB: localhost:27017
   - Elasticsearch: http://localhost:9200

## 📦 Production Deployment

### Building for Raspberry Pi

1. **Build ARM64 Docker images**
   ```bash
   # API
   cd api
   ./scripts/build-for-pi.sh
   
   # UI
   cd ../ui
   docker buildx build --platform linux/arm64 -t nosql-showdown-ui:pi-latest .
   ```

2. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify deployment**
   ```bash
   kubectl get pods -n default
   kubectl get services -n default
   ```

### Service URLs (MetalLB)
- React UI: http://10.0.1.243
- Node.js API: http://10.0.1.244
- Grafana: http://10.0.1.245
- Prometheus: http://10.0.1.246

## 🎮 Usage Guide

### For Students

1. **Join the Competition**
   - Navigate to the showdown URL
   - Enter your name to register
   - View your position on the leaderboard

2. **Run Stress Tests**
   - Click "Start Stress Test" button
   - Watch real-time performance metrics
   - Compare MongoDB vs Elasticsearch results
   - Earn points based on test completion

### For Presenters

1. **Pre-Demo Setup**
   ```bash
   # Check cluster health
   kubectl get nodes
   kubectl get pods
   
   # Load sample data
   curl -X POST http://api-url/api/admin/load-data
   ```

2. **During Demo**
   - Show Grafana dashboards on projector
   - Demonstrate node failure and recovery
   - Highlight performance differences
   - Engage students with leaderboard

## 📊 Monitoring & Observability

### Grafana Dashboards

Access Grafana at http://10.0.1.245:3000

**Available Dashboards:**
- **System Overview** - Cluster health and resource usage
- **Database Performance** - MongoDB vs Elasticsearch metrics
- **Application Metrics** - API response times and throughput
- **User Activity** - Real-time participant tracking

### Key Metrics

```yaml
# Application Metrics
- Request Rate (req/s)
- Response Time (p50, p95, p99)
- Error Rate (%)
- Active WebSocket Connections

# Database Metrics
- Query Latency (ms)
- Throughput (ops/s)
- Connection Pool Usage
- Index Performance

# Infrastructure Metrics
- CPU Usage per Node
- Memory Usage per Node
- Network I/O
- Disk Usage
```

## 🔧 Configuration

### Environment Variables

**API Configuration** (`api/.env`):
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@postgres:5432/showdown
MONGODB_URL=mongodb://mongo-0:27017,mongo-1:27017,mongo-2:27017/showdown?replicaSet=rs0
ELASTICSEARCH_URL=http://elasticsearch:9200
```

**UI Configuration** (`ui/.env`):
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### Kubernetes ConfigMaps

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  MONGODB_REPLICAS: "3"
  ELASTICSEARCH_NODES: "3"
```

## 🐛 Troubleshooting

### Common Issues

**1. Pods not starting**
```bash
# Check pod logs
kubectl logs -f pod-name

# Describe pod for events
kubectl describe pod pod-name
```

**2. Database connection issues**
```bash
# Test MongoDB connection
kubectl exec -it mongodb-0 -- mongosh

# Test Elasticsearch
curl http://10.0.1.241:9200/_cluster/health
```

**3. High memory usage on Pi**
```bash
# Check node resources
kubectl top nodes
kubectl top pods

# Adjust resource limits in k8s manifests
```

### Performance Tuning

For Raspberry Pi deployments:
```yaml
# Reduce batch sizes for data loading
batchSize: 500  # instead of 5000

# Adjust replica counts
replicas: 2  # instead of 3

# Set appropriate resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Architecture Documentation](docs/architecture/)
- [Hardware Setup Guide](docs/hardware/)
- [Deployment Guide](docs/pi-deployment-guide.md)
- [API Documentation](docs/api/)
- [Monitoring Setup](docs/monitoring/)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier formatting
- Conventional commits
- Comprehensive testing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Kaggle** - Financial transaction dataset
- **Raspberry Pi Foundation** - Amazing hardware
- **Kubernetes Community** - Excellent documentation
- **MongoDB & Elastic** - Database technologies
- **All Contributors** - Making this project better
---

<div align="center">
  <p>Built with ❤️ for educational purposes</p>
  <p>⭐ Star us on GitHub!</p>
</div>
