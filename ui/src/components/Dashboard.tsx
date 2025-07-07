import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Zap,
  Loader2,
  Play,
  Activity
} from 'lucide-react';
import PersonalDashboard from './PersonalDashboard';
import PerformanceChart from './PerformanceChart';
import BattleResults from './BattleResults';
import LiveOperationFeed from './LiveOperationFeed';
import { useSocket } from '../contexts/SocketContext';
import { apiService } from '../services/api';

interface DashboardProps {
  currentUser: any;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [testProgress, setTestProgress] = useState<{
    mongodb: number;
    elasticsearch: number;
  }>({ mongodb: 0, elasticsearch: 0 });

  const queryClient = useQueryClient();
  const socket = useSocket();

  // Listen for real-time test events
  useEffect(() => {
    if (!socket.isConnected) return;

    const handleTestStarted = (data: any) => {
      if (data.userId === currentUser?.id) {
        console.log('🚀 Test started:', data);
        setIsRunningTest(true);
        setTestProgress({ mongodb: 0, elasticsearch: 0 });
        // Update the existing toast instead of creating a new one
        toast.loading('🚀 Running stress test against MongoDB and Elasticsearch...', { id: 'stress-test' });
      } else {
        // Show notification for other users' tests
        toast(`🏃‍♂️ ${data.userName} started a stress test!`, { 
          icon: '⚡',
          duration: 3000,
          style: {
            background: '#e0f2fe',
            color: '#0369a1',
          }
        });
      }
    };

    const handleTestProgress = (data: any) => {
      if (data.userId === currentUser?.id) {
        console.log('📈 Test progress:', data);
        setTestProgress(prev => ({
          ...prev,
          [data.database.toLowerCase()]: data.progress
        }));
      }
    };

    const handleTestCompleted = (data: any) => {
      if (data.userId === currentUser?.id) {
        console.log('✅ Test completed:', data);
        setIsRunningTest(false);
        setTestProgress({ mongodb: 100, elasticsearch: 100 });
        toast.success(`🎉 Test completed! You earned ${data.scoreEarned} points! New total: ${data.newScore}`, { 
          id: 'stress-test',
          duration: 6000 
        });
        // Refetch user data
        queryClient.invalidateQueries({ queryKey: ['user', currentUser.id] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      } else {
        // Show notification for other users' completed tests
        toast.success(`🏆 ${data.userName} completed a stress test! Earned ${data.scoreEarned} points!`, { 
          duration: 4000,
          style: {
            background: '#f0f9ff',
            color: '#0c4a6e',
          }
        });
      }
    };

    const handleTestError = (data: any) => {
      console.error('❌ Test error:', data);
      setIsRunningTest(false);
      setTestProgress({ mongodb: 0, elasticsearch: 0 });
      toast.error(`❌ Test failed: ${data.error}`, { id: 'stress-test' });
    };

    // Set up event listeners
    const unsubscribeStarted = socket.onTestStarted(handleTestStarted);
    const unsubscribeProgress = socket.onTestProgress(handleTestProgress);
    const unsubscribeCompleted = socket.onTestCompleted(handleTestCompleted);
    const unsubscribeError = socket.onTestError(handleTestError);

    return () => {
      unsubscribeStarted();
      unsubscribeProgress();
      unsubscribeCompleted();
      unsubscribeError();
    };
  }, [socket, currentUser?.id, queryClient]);

  // Run stress test mutation
  const stressTestMutation = useMutation({
    mutationFn: (params: { userId: string; operations: number; concurrency: number }) =>
      apiService.runStressTest(params),
    onMutate: () => {
      // Provide immediate feedback
      setIsRunningTest(true);
      setTestProgress({ mongodb: 0, elasticsearch: 0 });
      toast.loading('🚀 Initializing stress test...', { id: 'stress-test' });
    },
    onSuccess: (data) => {
      // Add a small delay to ensure Socket.io events are properly synchronized
      setTimeout(() => {
        setLastTestResult(data.stats);
        // If we haven't received Socket.io events after the delay, manually update the UI
        if (testProgress.mongodb === 0 && testProgress.elasticsearch === 0) {
          setTestProgress({ mongodb: 100, elasticsearch: 100 });
          setIsRunningTest(false);
        }
      }, 500); // 500ms delay to allow Socket.io events to arrive
      // Note: Socket.io handles loading state, toasts, and query invalidation
    },
    onError: (error: any) => {
      // Fallback error handling if Socket.io events don't fire
      setIsRunningTest(false);
      setTestProgress({ mongodb: 0, elasticsearch: 0 });
      toast.error(`❌ Test failed: ${error.message}`, { id: 'stress-test' });
    },
  });

  const handleStressTest = () => {
    if (!currentUser) {
      toast.error('Please register first!');
      return;
    }
    
    stressTestMutation.mutate({
      userId: currentUser.id,
      operations: 25, // Fixed optimized value
      concurrency: 2  // Fixed optimized value
    });
  };

  return (
    <div className="space-y-8">
      {/* Personal Dashboard */}
      <PersonalDashboard currentUser={currentUser} lastTestResult={lastTestResult} />

      {/* Simplified Stress Test Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 sm:p-6 lg:p-8"
      >
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            animate={isRunningTest ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: isRunningTest ? Infinity : 0, ease: "linear" }}
            className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-han-500 to-han-700 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg"
          >
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </motion.div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-800 mb-2">
            Database Performance Test
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Run a comprehensive stress test against MongoDB and Elasticsearch
          </p>
        </div>

        {/* Single Stress Test Button */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <motion.button
            onClick={handleStressTest}
            disabled={!currentUser || isRunningTest}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-han-500 to-han-700 hover:from-han-600 hover:to-han-800 text-white font-bold text-base sm:text-lg rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 sm:space-x-3 shadow-lg transform hover:-translate-y-1"
          >
            {isRunningTest ? (
              <>
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                <span>Running Test...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Stress Test! Go!</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Test Configuration Display */}
        <div className="text-center text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8">
          <p>Test Configuration: 25 operations, 2 concurrent threads</p>
          <p>Optimized for balanced performance comparison</p>
        </div>

        {/* Live Battle Visualization */}
        <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
            {/* MongoDB */}
            <motion.div 
              className="text-center p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-mongodb-500/20 rounded-2xl"
              animate={isRunningTest ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: isRunningTest ? Infinity : 0 }}
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🍃</div>
              <h3 className="text-base sm:text-lg font-semibold text-mongodb-600 mb-1 sm:mb-2">MongoDB</h3>
              <div className="text-xs text-slate-500 mb-2 sm:mb-3">Document Database</div>
              {isRunningTest ? (
                <div className="w-full">
                  <div className="text-sm font-medium text-mongodb-600 mb-2">Testing...</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-mongodb-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${testProgress.mongodb}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{testProgress.mongodb}%</div>
                </div>
              ) : lastTestResult ? (
                <div>
                  <div className="text-lg sm:text-xl font-bold text-slate-800">{lastTestResult.mongodb.avgResponseTime}ms</div>
                  <div className="text-xs text-slate-500">Average Response</div>
                </div>
              ) : null}
            </motion.div>

            {/* VS */}
            <div className="text-center">
              <motion.div
                animate={isRunningTest ? { rotate: 360 } : {}}
                transition={{ duration: 3, repeat: isRunningTest ? Infinity : 0, ease: "linear" }}
                className="text-2xl sm:text-3xl mb-1 sm:mb-2"
              >
                ⚡
              </motion.div>
              <div className="text-lg sm:text-xl font-display font-bold text-han-600">VS</div>
              {isRunningTest && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-slate-500 mt-2"
                >
                  Testing in progress...
                </motion.div>
              )}
            </div>

            {/* Elasticsearch */}
            <motion.div 
              className="text-center p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-elasticsearch-500/20 rounded-2xl"
              animate={isRunningTest ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: isRunningTest ? Infinity : 0, delay: 0.3 }}
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🔍</div>
              <h3 className="text-base sm:text-lg font-semibold text-elasticsearch-600 mb-1 sm:mb-2">Elasticsearch</h3>
              <div className="text-xs text-slate-500 mb-2 sm:mb-3">Search Engine</div>
              {isRunningTest ? (
                <div className="w-full">
                  <div className="text-sm font-medium text-elasticsearch-600 mb-2">Testing...</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-elasticsearch-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${testProgress.elasticsearch}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{testProgress.elasticsearch}%</div>
                </div>
              ) : lastTestResult ? (
                <div>
                  <div className="text-lg sm:text-xl font-bold text-slate-800">{lastTestResult.elasticsearch.avgResponseTime}ms</div>
                  <div className="text-xs text-slate-500">Average Response</div>
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Live Operation Feed - Shows during and after tests */}
      <LiveOperationFeed 
        currentUser={currentUser} 
        isVisible={isRunningTest || lastTestResult !== null} 
      />

      {/* Test Results */}
      <AnimatePresence>
        {lastTestResult && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="space-y-6"
          >
            <BattleResults results={lastTestResult} />
            <PerformanceChart results={lastTestResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 