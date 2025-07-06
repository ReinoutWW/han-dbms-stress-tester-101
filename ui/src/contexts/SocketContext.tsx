import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socket';
import type { 
  TestStartedEvent, 
  TestResultsEvent, 
  LeaderboardUpdateEvent,
  TestProgressEvent,
  TestCompletedEvent,
  OperationCompletedEvent
} from '../services/socket';

// Socket context interface
interface SocketContextType {
  isConnected: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected';
  connect: (userId?: string) => Promise<void>;
  disconnect: () => void;
  joinUser: (userId: string) => void;
  startStressTest: (params: {
    userId: string;
    database: 'MONGODB' | 'ELASTICSEARCH';
    operationType: string;
    count: number;
  }) => void;
  
  // Event handlers
  onTestStarted: (callback: (data: TestStartedEvent) => void) => () => void;
  onTestResults: (callback: (data: TestResultsEvent) => void) => () => void;
  onTestProgress: (callback: (data: TestProgressEvent) => void) => () => void;
  onTestCompleted: (callback: (data: TestCompletedEvent) => void) => () => void;
  onOperationCompleted: (callback: (data: OperationCompletedEvent) => void) => () => void;
  onLeaderboardUpdate: (callback: (data: LeaderboardUpdateEvent) => void) => () => void;
  onTestError: (callback: (data: { error: string }) => void) => () => void;
}

// Create context
const SocketContext = createContext<SocketContextType | null>(null);

// Socket provider component
interface SocketProviderProps {
  children: React.ReactNode;
  currentUser?: any;
}

export function SocketProvider({ children, currentUser }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Connect to socket
  const connect = useCallback(async (userId?: string) => {
    try {
      setConnectionState('connecting');
      await socketService.connect(userId);
      setIsConnected(true);
      setConnectionState('connected');
    } catch (error) {
      console.error('Failed to connect socket:', error);
      setIsConnected(false);
      setConnectionState('disconnected');
    }
  }, []);

  // Disconnect socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Join user room
  const joinUser = useCallback((userId: string) => {
    socketService.joinUser(userId);
  }, []);

  // Start stress test
  const startStressTest = useCallback((params: {
    userId: string;
    database: 'MONGODB' | 'ELASTICSEARCH';
    operationType: string;
    count: number;
  }) => {
    socketService.startStressTest(params);
  }, []);

  // Event handlers (wrapped to ensure consistent API)
  const onTestStarted = useCallback((callback: (data: TestStartedEvent) => void) => {
    return socketService.onTestStarted(callback);
  }, []);

  const onTestResults = useCallback((callback: (data: TestResultsEvent) => void) => {
    return socketService.onTestResults(callback);
  }, []);

  const onTestProgress = useCallback((callback: (data: TestProgressEvent) => void) => {
    return socketService.onTestProgress(callback);
  }, []);

  const onTestCompleted = useCallback((callback: (data: TestCompletedEvent) => void) => {
    return socketService.onTestCompleted(callback);
  }, []);

  const onOperationCompleted = useCallback((callback: (data: OperationCompletedEvent) => void) => {
    return socketService.onOperationCompleted(callback);
  }, []);

  const onLeaderboardUpdate = useCallback((callback: (data: LeaderboardUpdateEvent) => void) => {
    return socketService.onLeaderboardUpdate(callback);
  }, []);

  const onTestError = useCallback((callback: (data: { error: string }) => void) => {
    return socketService.onTestError(callback);
  }, []);

  // Auto-connect when component mounts
  useEffect(() => {
    const initConnection = async () => {
      try {
        await connect(currentUser?.id);
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };

    initConnection();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, currentUser?.id]);

  // Update connection state based on socket service
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = socketService.getConnectionState();
      const currentConnected = socketService.isSocketConnected();
      
      if (currentState !== connectionState) {
        setConnectionState(currentState);
      }
      
      if (currentConnected !== isConnected) {
        setIsConnected(currentConnected);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState, isConnected]);

  // Join user room when user changes
  useEffect(() => {
    if (isConnected && currentUser?.id) {
      joinUser(currentUser.id);
    }
  }, [isConnected, currentUser?.id, joinUser]);

  const contextValue: SocketContextType = {
    isConnected,
    connectionState,
    connect,
    disconnect,
    joinUser,
    startStressTest,
    onTestStarted,
    onTestResults,
    onTestProgress,
    onTestCompleted,
    onOperationCompleted,
    onLeaderboardUpdate,
    onTestError,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to use socket context
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

// Hook for specific socket events with automatic cleanup
export function useSocketEvent<T>(
  eventName: keyof SocketContextType,
  callback: (data: T) => void,
  dependencies: any[] = []
) {
  const socket = useSocket();
  
  useEffect(() => {
    if (typeof socket[eventName] === 'function') {
      const handler = socket[eventName] as (callback: (data: T) => void) => () => void;
      const cleanup = handler(callback);
      
      return cleanup;
    }
  }, [socket, eventName, ...dependencies]);
}

export default SocketContext;