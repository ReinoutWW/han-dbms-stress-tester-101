import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Users, 
  Target,
  Award,
  Sparkles,
  Activity,
  TrendingUp,
  Star
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { apiService, type LeaderboardUser } from '../services/api';

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState<'score' | 'tests' | 'efficiency'>('score');
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Test API function directly
  useEffect(() => {
    console.log('🧪 Testing API service directly...');
    apiService.getLeaderboard()
      .then(data => console.log('🧪 Direct API call success:', data))
      .catch(error => console.error('🧪 Direct API call failed:', error));
  }, []);

  // Initial data fetch with optimized settings
  const { data: leaderboardData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => {
      console.log('🔍 React Query calling apiService.getLeaderboard...');
      return apiService.getLeaderboard();
    },
    // Stable configuration to prevent constant refetching
    refetchInterval: socket.isConnected ? false : 10000, // Only poll if socket disconnected, less frequent
    staleTime: socket.isConnected ? 30000 : 5000, // Keep data fresh longer when socket is connected
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    retry: 2, // Limit retries
    refetchOnMount: true, // Always fetch when component mounts
  });

  // Force fetch on component mount if no data
  useEffect(() => {
    console.log('🏆 Leaderboard query state:', {
      hasData: !!leaderboardData,
      isLoading,
      isFetching,
      isError,
      error: error?.message || 'No error'
    });
    
    if (!leaderboardData && !isLoading && !isFetching) {
      console.log('🔄 Force fetching leaderboard data...');
      refetch().then(result => {
        console.log('🔄 Refetch result:', result);
      }).catch(error => {
        console.error('🔄 Refetch error:', error);
      });
    }
  }, [leaderboardData, isLoading, isFetching, isError, refetch]);

  // Listen for real-time leaderboard updates via Socket.io with debouncing
  useEffect(() => {
    if (!socket.isConnected) return;

    let updateTimeout: NodeJS.Timeout;

    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        // Use refetch instead of invalidate to prevent loading state
        queryClient.refetchQueries({ 
          queryKey: ['leaderboard'],
          type: 'active' 
        });
      }, 1000); // Debounce updates by 1 second
    };

    const handleLeaderboardUpdate = (data: any) => {
      console.log('📊 Leaderboard update received:', data);
      debouncedUpdate();
    };

    const handleTestCompleted = (data: any) => {
      console.log('🎉 Test completed:', data);
      debouncedUpdate();
    };

    // Set up Socket.io event listeners
    const unsubscribeLeaderboard = socket.onLeaderboardUpdate(handleLeaderboardUpdate);
    const unsubscribeTestCompleted = socket.onTestCompleted(handleTestCompleted);

    // Cleanup function
    const cleanup = () => {
      clearTimeout(updateTimeout);
      unsubscribeLeaderboard();
      unsubscribeTestCompleted();
    };

    return cleanup;
  }, [socket, queryClient]);

  const leaderboard = leaderboardData?.leaderboard || [];

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'tests':
        return b.totalTests - a.totalTests;
      case 'efficiency':
        return b.efficiency - a.efficiency;
      default:
        return b.score - a.score;
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-7 w-7 text-yellow-400" />;
      case 2:
        return <Medal className="h-7 w-7 text-slate-400" />;
      case 3:
        return <Award className="h-7 w-7 text-amber-600" />;
      default:
        return <span className="text-xl font-bold text-slate-500">#{rank}</span>;
    }
  };

  const getPerformanceColor = (rating: string) => {
    // Handle edge cases where rating might be undefined, null, or not a string
    if (!rating || typeof rating !== 'string') {
      return 'text-slate-600';
    }
    
    switch (rating.toLowerCase()) {
      case 'excellent':
        return 'text-performance-excellent';
      case 'good':
        return 'text-performance-good';
      case 'average':
        return 'text-performance-average';
      case 'poor':
        return 'text-performance-poor';
      case 'not rated':
        return 'text-slate-500';
      default:
        return 'text-slate-600';
    }
  };

  // Only show loading on initial load, not on background refetches
  if (isLoading && !leaderboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-han-500/30 border-t-han-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError && !leaderboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load leaderboard</p>
          <p className="text-slate-600 text-sm">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-han-500 to-han-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-han-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-800">
                Leaderboard
              </h1>
              <p className="text-slate-600">
                {socket.isConnected ? 'Live rankings with real-time updates' : 'Rankings updated every 10 seconds'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-2">
            <div className={`w-3 h-3 rounded-full ${socket.isConnected ? 'bg-status-online animate-status-pulse' : 'bg-slate-400'}`}></div>
            <span className={`text-sm font-medium ${socket.isConnected ? 'text-status-online' : 'text-slate-600'}`}>
              {socket.isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            {isFetching && (
              <div className="w-2 h-2 bg-han-500 rounded-full animate-pulse ml-1"></div>
            )}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'score', label: 'Score', icon: Trophy },
            { key: 'tests', label: 'Tests', icon: Target },
            { key: 'efficiency', label: 'Efficiency', icon: TrendingUp },
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              onClick={() => setSortBy(key as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                sortBy === key
                  ? 'bg-han-500 text-white shadow-lg'
                  : 'bg-white/40 text-slate-700 hover:bg-white/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard Cards */}
      <div className="space-y-4">
        {sortedLeaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <Users className="h-16 w-16 mx-auto text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No competitors yet!</h3>
            <p className="text-slate-600">Be the first to join the database performance battle</p>
          </motion.div>
        ) : (
          sortedLeaderboard.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-card p-6 transition-all hover:scale-[1.01] ${
                index === 0 
                  ? 'border border-yellow-500/50 bg-yellow-100/30 shadow-yellow-500/20' 
                  : index === 1 
                  ? 'border border-slate-400/50 bg-slate-100/30 shadow-slate-400/20'
                  : index === 2
                  ? 'border border-amber-600/50 bg-amber-100/30 shadow-amber-600/20'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                    'bg-slate-500'
                  }`}>
                    {getRankIcon(index + 1)}
                  </div>
                  
                  {/* User Info */}
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
                      {index < 3 && (
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>{user.totalTests} tests</span>
                      <span className={getPerformanceColor(user.performanceRating)}>
                        {user.performanceRating}
                      </span>
                      <span>Prefers {user.preferredDatabase}</span>
                    </div>
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="text-3xl font-bold text-han-600">{user.score}</div>
                  <div className="text-sm text-slate-600">points</div>
                </div>
              </div>
              
              {/* Detailed Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-300/50">
                <div className="text-center bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3">
                  <div className="text-lg font-bold text-mongodb-600">{user.mongoTests}</div>
                  <div className="text-xs text-slate-600">MongoDB</div>
                </div>
                <div className="text-center bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3">
                  <div className="text-lg font-bold text-elasticsearch-600">{user.elasticTests}</div>
                  <div className="text-xs text-slate-600">Elasticsearch</div>
                </div>
                <div className="text-center bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3">
                  <div className="text-lg font-bold text-slate-800">{user.avgResponseTime}ms</div>
                  <div className="text-xs text-slate-600">Avg Response</div>
                </div>
                <div className="text-center bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3">
                  <div className="text-lg font-bold text-han-600">{user.efficiency}%</div>
                  <div className="text-xs text-slate-600">Efficiency</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {leaderboardData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="glass-card p-6 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-han-600" />
            <div className="text-3xl font-bold text-slate-800">{leaderboardData.totalUsers}</div>
            <div className="text-sm text-slate-600">Total Users</div>
          </div>
          
          <div className="glass-card p-6 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-mongodb-600" />
            <div className="text-3xl font-bold text-slate-800">{leaderboardData.totalTests}</div>
            <div className="text-sm text-slate-600">Total Tests</div>
          </div>
          
          <div className="glass-card p-6 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-elasticsearch-600" />
            <div className="text-3xl font-bold text-slate-800">{Math.round(leaderboardData.avgScore)}</div>
            <div className="text-sm text-slate-600">Average Score</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
} 