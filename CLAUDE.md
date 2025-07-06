# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Epic Interactive NoSQL Showdown** - a distributed system for live university database performance demonstrations. The system runs on a portable Kubernetes cluster using Raspberry Pi 5 boards and enables real-time comparison between MongoDB and Elasticsearch through interactive student participation.

## Architecture

### Multi-Service System
- **API Backend** (`api/`): Node.js + TypeScript + Express + Socket.io
- **UI Frontend** (`ui/`): React + TypeScript + Vite + Tailwind CSS
- **Databases**: PostgreSQL (user data), MongoDB (stress testing), Elasticsearch (stress testing)
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Docker containers + Kubernetes manifests

### Key Components
- **Real-time Communication**: Socket.io for live updates and leaderboards
- **Database Stress Testing**: Coordinated performance testing against MongoDB and Elasticsearch
- **User Management**: Prisma ORM with PostgreSQL for registration and scoring
- **Metrics Collection**: Prometheus client for performance monitoring
- **ARM64 Compatibility**: All services designed for Raspberry Pi deployment

## Development Commands

### API Backend (`api/`)
```bash
# Development
npm run dev                 # Start development server with hot reload
npm run build              # Build TypeScript to JavaScript
npm run start              # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations (dev)
npm run prisma:deploy      # Deploy migrations (production)

# Testing
npm test                   # Run Jest tests
```

### UI Frontend (`ui/`)
```bash
# Development
npm run dev                # Start Vite development server
npm run build              # Build for production
npm run preview            # Preview production build

# Linting
npm run lint               # Run ESLint
```

### Docker Compose (Local Development)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f postgres

# Stop services
docker-compose down
```

### Kubernetes Deployment
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n default
kubectl get services -n default

# View logs
kubectl logs -f deployment/api-deployment
```

## Database Configuration

### PostgreSQL (Primary Database)
- **Purpose**: User profiles, scores, test results
- **ORM**: Prisma with TypeScript
- **Migrations**: Located in `api/prisma/migrations/`
- **Schema**: `api/prisma/schema.prisma`

### MongoDB (Stress Test Target)
- **Purpose**: Performance benchmarking and stress testing
- **Driver**: Native MongoDB Node.js driver
- **Configuration**: Replica set for high availability

### Elasticsearch (Stress Test Target)
- **Purpose**: Search performance benchmarking
- **Driver**: @elastic/elasticsearch official client
- **Configuration**: 3-node cluster with ECK operator

## Environment Variables

### API Backend
```bash
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
MONGODB_URL=mongodb://user:pass@localhost:27017/dbname
ELASTICSEARCH_URL=http://localhost:9200
```

### Docker Compose
All environment variables are configured in `docker-compose.yml` with secure defaults.

## Key File Locations

### Configuration
- `api/src/config/index.ts` - Centralized configuration management
- `api/prisma/schema.prisma` - Database schema definitions
- `docker-compose.yml` - Local development stack
- `k8s/` - Kubernetes deployment manifests

### Application Logic
- `api/src/routes/stress-test.ts` - Database stress testing endpoints
- `api/src/socket/handlers.ts` - Real-time Socket.io event handlers
- `api/src/monitoring/metrics.ts` - Prometheus metrics collection
- `ui/src/components/` - React components for UI

### Data and Scripts
- `api/data/kaggle-finance/` - Sample financial transaction dataset
- `api/scripts/build-for-pi.sh` - ARM64 build script for Raspberry Pi
- `k8s/jobs/` - Database initialization jobs

## Testing and Quality

### Running Tests
```bash
# API tests
cd api && npm test

# UI linting
cd ui && npm run lint

# TypeScript compilation
cd api && npm run build
cd ui && npm run build
```

### Code Quality
- **TypeScript**: Strict configuration in both API and UI
- **ESLint**: Configured for React and TypeScript
- **Prisma**: Type-safe database access
- **Error Handling**: Comprehensive error logging and monitoring

## Deployment Architecture

### Local Development
- Uses `docker-compose.yml` for multi-service local environment
- Hot reload enabled for both API and UI
- Integrated with local databases

### Production (Kubernetes)
- ARM64-compatible container images
- Kubernetes manifests in `k8s/` directory
- MetalLB for load balancing
- Persistent volumes for database storage
- Prometheus monitoring with Grafana dashboards

## Important Notes

### ARM64 Compatibility
- All base images support ARM64 architecture
- Build processes configured for multi-platform deployment
- Raspberry Pi 5 optimized configurations

### Real-time Features
- Socket.io for live leaderboard updates
- WebSocket connections for instant feedback
- Event-driven architecture for scalability

### Security
- Helmet.js for security headers
- CORS configured for cross-origin requests
- Kubernetes NetworkPolicies for pod isolation
- No hardcoded credentials (uses environment variables)

## Monitoring and Debugging

### Metrics
- Prometheus metrics exposed on `/metrics` endpoint
- Grafana dashboards for visualization
- Custom metrics for database performance

### Logging
- Structured logging with timestamps
- Error tracking and monitoring
- Health check endpoints for service monitoring

This system is designed for educational demonstrations and live interactive sessions, emphasizing real-time performance visualization and student engagement through gamification.