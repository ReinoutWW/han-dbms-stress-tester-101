# Docker Compose Development Setup

## Overview

This guide covers the local development setup using Docker Compose for the Epic Interactive NoSQL Showdown application. The setup includes the React frontend, Node.js backend, PostgreSQL database, and development tools, all optimized for ARM64 architecture.

## Prerequisites

- Docker Engine 20.10+ with BuildKit support
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- Git
- ARM64 compatible host (Apple Silicon, Raspberry Pi, etc.)

## Project Structure

```
showdown/
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.override.yml
├── .env
├── .env.example
├── .dockerignore
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.dev
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── index.ts
│   └── ui/
│       ├── Dockerfile
│       ├── Dockerfile.dev
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           └── main.tsx
├── scripts/
│   ├── dev-setup.sh
│   ├── build-images.sh
│   └── cleanup.sh
└── docs/
    └── application/
        └── docker-compose-setup.md
```

## Environment Configuration

### 1. Create Environment Files

```bash
# Create main environment file
cat <<EOF > .env
# Application Environment
NODE_ENV=development
API_PORT=4000
UI_PORT=5173

# Database Configuration
POSTGRES_DB=showdown
POSTGRES_USER=admin
POSTGRES_PASSWORD=adminpw
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://admin:adminpw@postgres:5432/showdown

# API Configuration
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=http://localhost:5173

# Frontend Configuration
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000

# Development Tools
POSTGRES_ADMIN_EMAIL=admin@showdown.local
POSTGRES_ADMIN_PASSWORD=admin123

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# ARM64 Configuration
BUILDKIT_PROGRESS=plain
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1
EOF

# Create example environment file
cp .env .env.example
```

### 2. Configure Docker Ignore

```bash
# Create .dockerignore
cat <<EOF > .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.example
.nyc_output
coverage
.nyc_output
.coverage
.vscode
.idea
*.log
*.md
.DS_Store
Thumbs.db
dist
build
EOF
```

## Docker Compose Configuration

### 1. Main Docker Compose File

```yaml
# docker-compose.yml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: showdown-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - showdown-network
    restart: unless-stopped

  # Node.js API Backend
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile
      platform: linux/arm64
      args:
        NODE_ENV: ${NODE_ENV}
    container_name: showdown-api
    environment:
      NODE_ENV: ${NODE_ENV}
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "${API_PORT:-4000}:4000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./services/api/src:/app/src:ro
      - api_node_modules:/app/node_modules
    networks:
      - showdown-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  ui:
    build:
      context: ./services/ui
      dockerfile: Dockerfile
      platform: linux/arm64
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_WS_URL: ${VITE_WS_URL}
    container_name: showdown-ui
    environment:
      VITE_API_URL: ${VITE_API_URL}
      VITE_WS_URL: ${VITE_WS_URL}
    ports:
      - "${UI_PORT:-5173}:80"
    depends_on:
      - api
    networks:
      - showdown-network
    restart: unless-stopped

  # Redis (for session storage and caching)
  redis:
    image: redis:7-alpine
    container_name: showdown-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - showdown-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # pgAdmin (Database Management)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: showdown-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: ${POSTGRES_ADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${POSTGRES_ADMIN_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "8080:80"
    depends_on:
      - postgres
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - showdown-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  pgadmin_data:
    driver: local
  api_node_modules:
    driver: local
  ui_node_modules:
    driver: local

networks:
  showdown-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF
```

### 2. Development Override

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  # Development API with hot reload
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile.dev
      platform: linux/arm64
    environment:
      NODE_ENV: development
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./services/api:/app
      - api_node_modules:/app/node_modules
    command: ["npm", "run", "dev"]
    stdin_open: true
    tty: true

  # Development UI with hot reload
  ui:
    build:
      context: ./services/ui
      dockerfile: Dockerfile.dev
      platform: linux/arm64
    environment:
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./services/ui:/app
      - ui_node_modules:/app/node_modules
    command: ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
    stdin_open: true
    tty: true

  # MongoDB for development testing
  mongodb:
    image: mongo:7.0
    container_name: showdown-mongodb-dev
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: adminpw
      MONGO_INITDB_DATABASE: showdown
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    networks:
      - showdown-network
    restart: unless-stopped

  # Elasticsearch for development testing
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.4
    container_name: showdown-elasticsearch-dev
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - cluster.name=showdown-dev
      - node.name=showdown-dev-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - showdown-network
    restart: unless-stopped

  # Kibana for Elasticsearch visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.4
    container_name: showdown-kibana-dev
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
      ELASTICSEARCH_USERNAME: ""
      ELASTICSEARCH_PASSWORD: ""
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - showdown-network
    restart: unless-stopped

volumes:
  mongodb_data:
    driver: local
  elasticsearch_data:
    driver: local
EOF
```

## Container Dockerfiles

### 1. API Dockerfile (Production)

```dockerfile
# services/api/Dockerfile
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Production stage
FROM --platform=linux/arm64 node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nodejs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
EOF
```

### 2. API Dockerfile (Development)

```dockerfile
# services/api/Dockerfile.dev
FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 4000

# Development command with hot reload
CMD ["npm", "run", "dev"]
EOF
```

### 3. UI Dockerfile (Production)

```dockerfile
# services/ui/Dockerfile
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# Production stage with nginx
FROM --platform=linux/arm64 nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Adjust permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF
```

### 4. UI Dockerfile (Development)

```dockerfile
# services/ui/Dockerfile.dev
FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 5173

# Development command with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
EOF
```

## Development Scripts

### 1. Development Setup Script

```bash
#!/bin/bash
# scripts/dev-setup.sh

set -e

echo "🚀 Setting up Epic Interactive NoSQL Showdown development environment..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your specific configuration."
fi

# Build development images
echo "🏗️  Building development images..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Create volumes
echo "📦 Creating Docker volumes..."
docker volume create showdown_postgres_data
docker volume create showdown_redis_data
docker volume create showdown_mongodb_data
docker volume create showdown_elasticsearch_data

# Start services
echo "🔄 Starting development services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout 60 bash -c 'until docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec -T postgres pg_isready -U admin -d showdown; do sleep 2; done'

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --rm api npx prisma migrate dev

# Start all services
echo "🌟 Starting all services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo "✅ Development environment is ready!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   API:       http://localhost:4000"
echo "   pgAdmin:   http://localhost:8080"
echo "   MongoDB:   mongodb://admin:adminpw@localhost:27017"
echo "   Elastic:   http://localhost:9200"
echo "   Kibana:    http://localhost:5601"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
echo "   Stop:          docker-compose -f docker-compose.yml -f docker-compose.dev.yml down"
echo "   Reset DB:      docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --rm api npx prisma migrate reset"
EOF

chmod +x scripts/dev-setup.sh
```

### 2. Build Script

```bash
#!/bin/bash
# scripts/build-images.sh

set -e

echo "🏗️  Building production images for ARM64..."

# Build API image
echo "Building API image..."
docker build --platform linux/arm64 \
  -t showdown-api:latest \
  -f services/api/Dockerfile \
  services/api/

# Build UI image
echo "Building UI image..."
docker build --platform linux/arm64 \
  -t showdown-ui:latest \
  -f services/ui/Dockerfile \
  --build-arg VITE_API_URL=${VITE_API_URL:-http://localhost:4000} \
  --build-arg VITE_WS_URL=${VITE_WS_URL:-ws://localhost:4000} \
  services/ui/

echo "✅ Images built successfully!"

# Tag for registry (if specified)
if [ ! -z "$REGISTRY" ]; then
    echo "🏷️  Tagging images for registry: $REGISTRY"
    docker tag showdown-api:latest $REGISTRY/showdown-api:latest
    docker tag showdown-ui:latest $REGISTRY/showdown-ui:latest
    
    echo "📤 Pushing images to registry..."
    docker push $REGISTRY/showdown-api:latest
    docker push $REGISTRY/showdown-ui:latest
fi
EOF

chmod +x scripts/build-images.sh
```

### 3. Cleanup Script

```bash
#!/bin/bash
# scripts/cleanup.sh

set -e

echo "🧹 Cleaning up development environment..."

# Stop and remove containers
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Remove development images
docker rmi showdown-api:latest showdown-ui:latest 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true

# Remove volumes (optional - uncomment if you want to reset data)
# docker volume rm showdown_postgres_data showdown_redis_data showdown_mongodb_data showdown_elasticsearch_data 2>/dev/null || true

# Clean up networks
docker network prune -f

echo "✅ Cleanup completed!"
EOF

chmod +x scripts/cleanup.sh
```

## Database Initialization

### 1. PostgreSQL Init Script

```sql
-- scripts/init-db.sql
-- Create additional databases if needed
CREATE DATABASE showdown_test;

-- Create extensions
\c showdown;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set up permissions
GRANT ALL PRIVILEGES ON DATABASE showdown TO admin;
GRANT ALL PRIVILEGES ON DATABASE showdown_test TO admin;
```

### 2. MongoDB Init Script

```javascript
// scripts/init-mongo.js
db = db.getSiblingDB('showdown');

// Create collections
db.createCollection('transactions');
db.createCollection('users');

// Create indexes
db.transactions.createIndex({ "transaction_id": 1 }, { unique: true });
db.transactions.createIndex({ "user_id": 1 });
db.transactions.createIndex({ "timestamp": -1 });

db.users.createIndex({ "user_id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

print("MongoDB initialization completed");
```

## Development Workflow

### 1. Start Development Environment

```bash
# Clone repository
git clone <repository-url>
cd showdown

# Setup development environment
./scripts/dev-setup.sh

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

### 2. Common Development Tasks

```bash
# Install new dependency in API
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm install <package>

# Install new dependency in UI
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec ui npm install <package>

# Run database migrations
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate dev

# Reset database
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate reset

# Generate Prisma client
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma generate

# Access database shell
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec postgres psql -U admin -d showdown

# Access MongoDB shell
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec mongodb mongosh -u admin -p adminpw

# Run tests
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm test
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec ui npm test
```

### 3. Building for Production

```bash
# Build production images
./scripts/build-images.sh

# Test production build locally
docker-compose up -d

# Clean up
./scripts/cleanup.sh
```

## ARM64 Optimization

### 1. Platform Specification

All Dockerfiles and compose files explicitly specify `linux/arm64` platform:

```yaml
services:
  api:
    build:
      platform: linux/arm64
    image: myregistry/showdown-api:arm64
```

### 2. Multi-Architecture Support

```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myregistry/showdown-api:latest \
  --push services/api/
```

### 3. Base Image Selection

All base images are chosen for ARM64 compatibility:
- `node:20-alpine` - Official multi-arch Node.js
- `postgres:15-alpine` - Official multi-arch PostgreSQL
- `nginx:alpine` - Official multi-arch Nginx
- `redis:7-alpine` - Official multi-arch Redis

## Troubleshooting

### 1. Common Issues

**Build failures on ARM64:**
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Clear build cache
docker system prune -a
```

**Port conflicts:**
```bash
# Check what's using ports
sudo lsof -i :5173  # UI port
sudo lsof -i :4000  # API port
sudo lsof -i :5432  # PostgreSQL port

# Stop conflicting services
sudo systemctl stop postgresql  # If local PostgreSQL is running
```

**Database connection issues:**
```bash
# Check container logs
docker-compose logs postgres
docker-compose logs api

# Verify network connectivity
docker-compose exec api ping postgres
```

### 2. Performance Optimization

```bash
# Increase Docker memory limits
# In Docker Desktop: Settings > Resources > Memory > 8GB+

# Enable file watching (if hot reload isn't working)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

This Docker Compose setup provides a complete, ARM64-optimized development environment for the Epic Interactive NoSQL Showdown application with hot reload, database management tools, and production-ready containerization. 