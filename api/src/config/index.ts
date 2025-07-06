import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10), // Changed from 4000 to 3000
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  },
  
  databases: {
    postgres: {
      url: process.env.DATABASE_URL || 'postgresql://showdown_user:showdown_pass_2024@postgres.nosql-showdown.svc.cluster.local:5432/showdown_db',
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://admin:mongodb_pass_2024@mongodb.databases.svc.cluster.local:27017/showdown_benchmark?authSource=admin',
    },
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://elasticsearch.databases.svc.cluster.local:9200',
    },
  },
  
  socketIO: {
    path: process.env.SOCKET_IO_PATH || '/socket.io',
  },
  
  monitoring: {
    metricsPort: parseInt(process.env.METRICS_PORT || '9091', 10), // Changed from 9090 to avoid conflicts
  },
}; 