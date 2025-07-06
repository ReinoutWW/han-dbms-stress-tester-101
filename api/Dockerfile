# Multi-stage build for ARM64 Pi deployment
FROM --platform=linux/arm64 node:18-bookworm-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS build

# Install dev dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS production

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy Prisma schema and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Create data directory and copy Kaggle dataset
RUN mkdir -p /data/kaggle-finance
COPY data/kaggle-finance/*.csv /data/kaggle-finance/

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app /data
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"] 