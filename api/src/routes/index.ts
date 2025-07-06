import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import userRoutes from './users';
import { createStressTestRoutes } from './stress-test';
import adminRoutes from './admin';

export function setupRoutes(app: Express, prisma: PrismaClient, io?: Server) {
  // Mount routes
  app.use('/api/users', userRoutes);
  app.use('/api/stress-test', createStressTestRoutes(io));
  app.use('/api/admin', adminRoutes);
  
  // Legacy test results endpoint
  app.get('/api/test-results', async (req, res) => {
    try {
      const results = await prisma.testResult.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch test results' });
    }
  });
} 