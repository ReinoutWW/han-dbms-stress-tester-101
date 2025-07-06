import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

export function setupSocketHandlers(io: Server, prisma: PrismaClient) {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle user join
    socket.on('user:join', async (data: { userId: string }) => {
      console.log('👤 User joining room:', data.userId, 'Socket ID:', socket.id);
      socket.join(`user:${data.userId}`);
      console.log('✅ User joined room user:' + data.userId);
      socket.emit('user:joined', { success: true });
    });
    
    // Handle stress test request (deprecated - now handled via HTTP API)
    socket.on('test:start', async (data: {
      userId: string;
      database: 'MONGODB' | 'ELASTICSEARCH';
      operationType: string;
      count: number;
    }) => {
      try {
        // Note: Actual test execution is now handled via HTTP API at /api/stress-test/run
        // This handler is kept for compatibility but redirects to HTTP API
        socket.emit('test:error', { 
          error: 'Use HTTP API endpoint /api/stress-test/run for running tests' 
        });
      } catch (error) {
        socket.emit('test:error', { error: 'Test failed' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
} 