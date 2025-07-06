import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { setupMetrics } from './monitoring/metrics';
import { setupSocketHandlers } from './socket/handlers';
import { setupRoutes } from './routes';
import { connectDatabases } from './databases';


// Initialize Prisma Client
const prisma = new PrismaClient();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  path: config.socketIO.path,
  cors: {
    origin: config.server.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Setup routes
setupRoutes(app, prisma, io);

// Setup Socket.io handlers
setupSocketHandlers(io, prisma);

// Setup metrics
setupMetrics(app);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  await prisma.$disconnect();
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDatabases();
    
    // Transaction data loading will be implemented via API endpoints
    
    // Start listening
    httpServer.listen(config.server.port, () => {
      console.log(`🚀 Server running on port ${config.server.port}`);
      console.log(`📊 Metrics available on port ${config.monitoring.metricsPort}`);
      console.log(`🔌 Socket.io path: ${config.socketIO.path}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 