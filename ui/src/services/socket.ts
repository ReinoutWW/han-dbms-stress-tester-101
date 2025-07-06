import { io, Socket } from 'socket.io-client';

// Socket.io client configuration
const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin  // Use current origin in production
  : 'http://localhost:3000'; // API server URL in development

// Socket.io event interfaces
export interface TestStartedEvent {
  userId: string;
  database: 'MONGODB' | 'ELASTICSEARCH';
  operationType: string;
}

export interface TestResultsEvent {
  userId: string;
  database: 'MONGODB' | 'ELASTICSEARCH';
  operationType: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

export interface LeaderboardUpdateEvent {
  userId: string;
  newScore: number;
  userName: string;
}

export interface TestProgressEvent {
  userId: string;
  database: 'MONGODB' | 'ELASTICSEARCH';
  progress: number; // 0-100
  currentOperation: number;
  totalOperations: number;
}

export interface TestCompletedEvent {
  userId: string;
  userName: string;
  scoreEarned: number;
  newScore: number;
  testDuration: number;
  mongoResults: number;
  elasticResults: number;
}

export interface OperationCompletedEvent {
  userId: string;
  database: 'MONGODB' | 'ELASTICSEARCH';
  operationName: string;
  operationNumber: number;
  totalOperations: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

export interface UserJoinedEvent {
  success: boolean;
}

// Socket.io client class
class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private currentUserId: string | null = null;

  // Initialize socket connection
  connect(userId?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      try {
        this.socket = io(SOCKET_URL, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.setupEventListeners();

        this.socket.on('connect', () => {
          console.log('✅ Socket.io connected:', this.socket?.id);
          console.log('🔗 Socket.io transport:', this.socket?.io.engine.transport.name);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Join user room if userId provided
          if (userId) {
            this.joinUser(userId);
          }
          
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket.io connection error:', error);
          this.isConnected = false;
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect after maximum attempts'));
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Socket.io disconnected:', reason);
          this.isConnected = false;
        });

      } catch (error) {
        console.error('❌ Socket.io initialization error:', error);
        reject(error);
      }
    });
  }

  // Setup basic event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.io reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-join user room if we have a current user
      if (this.currentUserId) {
        this.joinUser(this.currentUserId);
      }
    });
  }

  // Join user-specific room
  joinUser(userId: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot join user room - socket not connected');
      return;
    }

    this.currentUserId = userId;
    this.socket.emit('user:join', { userId });
    console.log('👤 Joined user room:', userId);
  }

  // Start a stress test
  startStressTest(params: {
    userId: string;
    database: 'MONGODB' | 'ELASTICSEARCH';
    operationType: string;
    count: number;
  }): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot start test - socket not connected');
      return;
    }

    this.socket.emit('test:start', params);
    console.log('🚀 Started stress test:', params);
  }

  // Event listeners
  onTestStarted(callback: (data: TestStartedEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('test:started', callback);
    return () => this.socket?.off('test:started', callback);
  }

  onTestResults(callback: (data: TestResultsEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('test:results', callback);
    return () => this.socket?.off('test:results', callback);
  }

  onTestProgress(callback: (data: TestProgressEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('test:progress', callback);
    return () => this.socket?.off('test:progress', callback);
  }

  onTestCompleted(callback: (data: TestCompletedEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('test:completed', callback);
    return () => this.socket?.off('test:completed', callback);
  }

  onOperationCompleted(callback: (data: OperationCompletedEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    console.log('📡 Setting up operation:completed listener');
    this.socket.on('operation:completed', (data) => {
      console.log('🔔 Raw operation:completed event:', data);
      callback(data);
    });
    return () => this.socket?.off('operation:completed', callback);
  }

  onLeaderboardUpdate(callback: (data: LeaderboardUpdateEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('leaderboard:updated', callback);
    return () => this.socket?.off('leaderboard:updated', callback);
  }

  onUserJoined(callback: (data: UserJoinedEvent) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('user:joined', callback);
    return () => this.socket?.off('user:joined', callback);
  }

  onTestError(callback: (data: { error: string }) => void): () => void {
    if (!this.socket) return () => {};
    
    this.socket.on('test:error', callback);
    return () => this.socket?.off('test:error', callback);
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnected && this.socket?.connected) return 'connected';
    if (this.socket && !this.socket.connected && this.socket.disconnected === false) return 'connecting';
    return 'disconnected';
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUserId = null;
    }
  }

  // Force reconnection
  reconnect(): void {
    if (this.socket) {
      console.log('🔄 Force reconnecting socket...');
      this.socket.disconnect();
      this.socket.connect();
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Types are already exported above as interfaces