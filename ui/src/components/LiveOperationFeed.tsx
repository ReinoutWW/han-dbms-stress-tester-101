import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Database, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import type { OperationCompletedEvent } from '../services/socket';

interface LiveOperationFeedProps {
  currentUser: any;
  isVisible: boolean;
}

interface OperationLogEntry extends OperationCompletedEvent {
  id: string;
}

export default function LiveOperationFeed({ currentUser, isVisible }: LiveOperationFeedProps) {
  const [operations, setOperations] = useState<OperationLogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const socket = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxEntries = 100; // Keep last 100 operations

  // Listen for individual operation completions
  useEffect(() => {
    if (!socket.isConnected || !currentUser?.id) return;

    const handleOperationCompleted = (data: OperationCompletedEvent) => {
      console.log('🔥 Operation completed event received:', data);
      
      // Only show operations for the current user
      if (data.userId === currentUser.id) {
        console.log('✅ Adding operation to feed:', data.operationName, data.responseTime + 'ms');
        const logEntry: OperationLogEntry = {
          ...data,
          id: `${data.database}-${data.operationNumber}-${data.timestamp}-${Math.random().toString(36).substr(2, 9)}`
        };

        setOperations(prev => {
          const newOperations = [logEntry, ...prev].slice(0, maxEntries);
          return newOperations;
        });

        // Show toast notifications for operations (every 10th operation to avoid spam)
        if (data.operationNumber % 10 === 0 || data.operationNumber === 1) {
          const dbIcon = data.database === 'MONGODB' ? '🍃' : '🔍';
          const statusIcon = data.success ? '✅' : '❌';
          const responseTimeColor = data.responseTime < 100 ? '🟢' : data.responseTime < 500 ? '🟡' : '🔴';
          
          toast(
            `${dbIcon} ${statusIcon} ${data.database} #${data.operationNumber}: ${data.responseTime}ms ${responseTimeColor}`,
            {
              duration: 2000,
              position: 'bottom-right',
              style: {
                fontSize: '12px',
                padding: '8px 12px',
                background: data.success 
                  ? (data.database === 'MONGODB' ? '#065f46' : '#1e40af')
                  : '#dc2626',
                color: 'white',
                borderRadius: '8px',
              },
            }
          );
        }
      } else {
        console.log('❌ Operation not for current user:', data.userId, 'vs', currentUser.id);
      }
    };

    const unsubscribe = socket.onOperationCompleted(handleOperationCompleted);
    return unsubscribe;
  }, [socket, currentUser?.id]);

  // Auto-scroll to top when new operations arrive
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [operations, isAutoScroll]);

  // Handle manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      setIsAutoScroll(scrollTop === 0);
    }
  };

  const getDatabaseIcon = (database: string) => {
    switch (database) {
      case 'MONGODB':
        return <Database className="h-4 w-4 text-mongodb-600" />;
      case 'ELASTICSEARCH':
        return <Search className="h-4 w-4 text-elasticsearch-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const getDatabaseColor = (database: string) => {
    switch (database) {
      case 'MONGODB':
        return 'border-mongodb-500/30 bg-mongodb-50/50';
      case 'ELASTICSEARCH':
        return 'border-elasticsearch-500/30 bg-elasticsearch-50/50';
      default:
        return 'border-slate-500/30 bg-slate-50/50';
    }
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 50) return 'text-green-600';
    if (responseTime < 100) return 'text-blue-600';
    if (responseTime < 500) return 'text-yellow-600';
    if (responseTime < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isVisible || operations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="glass-card p-6 text-center"
      >
        <Activity className="h-12 w-12 mx-auto mb-3 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Live Operation Feed</h3>
        <p className="text-slate-600">Start a stress test to see real-time database operations</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-han-500 to-han-700 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Live Operations</h3>
            <p className="text-sm text-slate-600">Real-time database operation results</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-status-online rounded-full animate-status-pulse"></div>
          <span className="text-sm text-status-online font-medium">LIVE</span>
          <div className="text-sm text-slate-600 ml-3">
            {operations.length} ops
          </div>
        </div>
      </div>

      {/* Operations Feed */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-64 overflow-y-auto space-y-2 pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        <AnimatePresence initial={false}>
          {operations.map((operation, index) => (
            <motion.div
              key={operation.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${getDatabaseColor(operation.database)} backdrop-blur-sm`}
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* Database Icon */}
                <div className="flex-shrink-0">
                  {getDatabaseIcon(operation.database)}
                </div>
                
                {/* Operation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-slate-800">
                      #{operation.operationNumber}
                    </span>
                    <span className="text-xs text-slate-600 truncate">
                      {operation.operationName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {operation.database.toLowerCase()}
                  </div>
                </div>
                
                {/* Response Time */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span className={`text-xs font-semibold ${getResponseTimeColor(operation.responseTime)}`}>
                    {operation.responseTime}ms
                  </span>
                </div>
                
                {/* Success Status */}
                <div className="flex-shrink-0">
                  {operation.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Auto-scroll indicator */}
      {!isAutoScroll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-center"
        >
          <button
            onClick={() => {
              setIsAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
              }
            }}
            className="text-xs text-han-600 hover:text-han-700 font-medium"
          >
            ↑ Scroll to top for auto-scroll
          </button>
        </motion.div>
      )}

      {/* Statistics */}
      <div className="mt-4 pt-4 border-t border-slate-300/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-mongodb-600">
              {operations.filter(op => op.database === 'MONGODB').length}
            </div>
            <div className="text-xs text-slate-600">MongoDB</div>
          </div>
          <div>
            <div className="text-lg font-bold text-elasticsearch-600">
              {operations.filter(op => op.database === 'ELASTICSEARCH').length}
            </div>
            <div className="text-xs text-slate-600">Elasticsearch</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {operations.filter(op => op.success).length}
            </div>
            <div className="text-xs text-slate-600">Successful</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}