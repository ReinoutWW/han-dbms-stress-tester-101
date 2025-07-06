import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, 
  Activity, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';

interface RealtimeSidebarProps {
  className?: string;
}

export default function RealtimeSidebar({ className = '' }: RealtimeSidebarProps) {
  console.log('RealtimeSidebar: Component rendered');
  
  // Fetch database status with frequent updates
  const { data: dbStatus, isLoading: isDbStatusLoading, error: dbStatusError } = useQuery({
    queryKey: ['database-status'],
    queryFn: () => {
      console.log('RealtimeSidebar: queryFn called - making API request');
      return apiService.getDatabaseStatus();
    },
    refetchInterval: 1000, // Update every second for real-time feel
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    retry: 3, // Retry failed requests up to 3 times
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
  });
  
  // Log query state changes
  React.useEffect(() => {
    console.log('RealtimeSidebar: Query state changed', {
      isLoading: isDbStatusLoading,
      hasError: !!dbStatusError,
      error: dbStatusError,
      hasData: !!dbStatus,
      data: dbStatus
    });
  }, [dbStatus, isDbStatusLoading, dbStatusError]);

  // Fetch leaderboard for aggregated stats
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: apiService.getLeaderboard,
    refetchInterval: 2000, // Update every 2 seconds
  });

  const mongoStats = (dbStatus as any)?.status?.mongodb;
  const elasticStats = (dbStatus as any)?.status?.elasticsearch;
  
  console.log('RealtimeSidebar: Current state:', {
    isLoading: isDbStatusLoading,
    hasError: !!dbStatusError,
    error: dbStatusError,
    hasData: !!dbStatus,
    dbStatus,
    mongoStats,
    elasticStats
  });
  
  
  // Calculate aggregated performance from leaderboard
  const aggregatedStats = leaderboardData ? {
    mongodb: {
      totalTests: leaderboardData.leaderboard.reduce((sum, user) => sum + user.mongoTests, 0),
      avgResponseTime: Math.round(
        leaderboardData.leaderboard.reduce((sum, user) => sum + user.mongoAvgTime, 0) / 
        Math.max(leaderboardData.leaderboard.length, 1)
      ),
      totalOperations: leaderboardData.leaderboard.reduce((sum, user) => sum + user.mongoTests, 0) * 10,
    },
    elasticsearch: {
      totalTests: leaderboardData.leaderboard.reduce((sum, user) => sum + user.elasticTests, 0),
      avgResponseTime: Math.round(
        leaderboardData.leaderboard.reduce((sum, user) => sum + user.elasticAvgTime, 0) / 
        Math.max(leaderboardData.leaderboard.length, 1)
      ),
      totalOperations: leaderboardData.leaderboard.reduce((sum, user) => sum + user.elasticTests, 0) * 10,
    }
  } : null;

  const getBetterPerformer = () => {
    if (!aggregatedStats) return null;
    const mongoAvg = aggregatedStats.mongodb.avgResponseTime;
    const elasticAvg = aggregatedStats.elasticsearch.avgResponseTime;
    
    if (mongoAvg === 0 && elasticAvg === 0) return null;
    if (mongoAvg === 0) return 'elasticsearch';
    if (elasticAvg === 0) return 'mongodb';
    
    return mongoAvg < elasticAvg ? 'mongodb' : 'elasticsearch';
  };

  const betterPerformer = getBetterPerformer();

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`w-80 glass-card p-6 space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 bg-gradient-to-br from-han-500 to-han-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"
        >
          <Activity className="h-6 w-6 text-white" />
        </motion.div>
        <h3 className="text-lg font-display font-bold text-slate-800 mb-1">
          Real-time Battle Stats
        </h3>
        <p className="text-xs text-slate-600">
          Live MongoDB vs Elasticsearch Comparison
        </p>
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Database Status</h4>
        
        {/* MongoDB Status */}
        <motion.div 
          className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3 border-l-4 border-mongodb-500"
          animate={{ borderColor: mongoStats?.connected ? '#22c55e' : '#ef4444' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="text-lg">🍃</div>
              <span className="text-sm font-medium text-slate-800">MongoDB</span>
            </div>
            {isDbStatusLoading ? (
              <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : mongoStats?.connected ? (
              <CheckCircle className="h-4 w-4 text-status-online" />
            ) : (
              <AlertCircle className="h-4 w-4 text-status-offline" />
            )}
          </div>
          <div className="text-xs text-slate-600">
            {isDbStatusLoading ? (
              <span className="text-slate-500">Loading...</span>
            ) : mongoStats?.connected ? (
              <span className="text-status-online">Online • {mongoStats.responseTime}ms</span>
            ) : (
              <span className="text-status-offline">Offline</span>
            )}
          </div>
        </motion.div>

        {/* Elasticsearch Status */}
        <motion.div 
          className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-3 border-l-4 border-elasticsearch-500"
          animate={{ borderColor: elasticStats?.connected ? '#f27b1c' : '#ef4444' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="text-lg">🔍</div>
              <span className="text-sm font-medium text-slate-800">Elasticsearch</span>
            </div>
            {isDbStatusLoading ? (
              <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            ) : elasticStats?.connected ? (
              <CheckCircle className="h-4 w-4 text-status-online" />
            ) : (
              <AlertCircle className="h-4 w-4 text-status-offline" />
            )}
          </div>
          <div className="text-xs text-slate-600">
            {isDbStatusLoading ? (
              <span className="text-slate-500">Loading...</span>
            ) : elasticStats?.connected ? (
              <span className="text-status-online">Online • {elasticStats.responseTime}ms</span>
            ) : (
              <span className="text-status-offline">Offline</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Performance Comparison */}
      {aggregatedStats && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">Performance Overview</h4>
          
          {/* MongoDB Stats */}
          <div className="bg-white/50 backdrop-blur-sm border border-mongodb-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="text-lg">🍃</div>
                <span className="text-sm font-semibold text-slate-800">MongoDB</span>
              </div>
              {betterPerformer === 'mongodb' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="h-4 w-4 text-performance-excellent" />
                </motion.div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-600">Tests</p>
                <p className="text-mongodb-600 font-semibold">{aggregatedStats.mongodb.totalTests}</p>
              </div>
              <div>
                <p className="text-slate-600">Avg Time</p>
                <p className="text-slate-800 font-semibold">{aggregatedStats.mongodb.avgResponseTime}ms</p>
              </div>
            </div>
          </div>

          {/* Elasticsearch Stats */}
          <div className="bg-white/50 backdrop-blur-sm border border-elasticsearch-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="text-lg">🔍</div>
                <span className="text-sm font-semibold text-slate-800">Elasticsearch</span>
              </div>
              {betterPerformer === 'elasticsearch' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="h-4 w-4 text-performance-excellent" />
                </motion.div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-600">Tests</p>
                <p className="text-elasticsearch-600 font-semibold">{aggregatedStats.elasticsearch.totalTests}</p>
              </div>
              <div>
                <p className="text-slate-600">Avg Time</p>
                <p className="text-slate-800 font-semibold">{aggregatedStats.elasticsearch.avgResponseTime}ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {betterPerformer && aggregatedStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-sm border border-han-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-han-600" />
            <span className="text-sm font-semibold text-han-700">Performance Insight</span>
          </div>
          <p className="text-xs text-slate-700">
            {betterPerformer === 'mongodb' ? (
              <>
                <span className="text-mongodb-600 font-semibold">MongoDB</span> is currently performing 
                {aggregatedStats.elasticsearch.avgResponseTime > 0 ? (
                  <> {Math.round((aggregatedStats.elasticsearch.avgResponseTime - aggregatedStats.mongodb.avgResponseTime) / aggregatedStats.elasticsearch.avgResponseTime * 100)}% faster</>
                ) : null} with document operations.
              </>
            ) : (
              <>
                <span className="text-elasticsearch-600 font-semibold">Elasticsearch</span> is currently performing 
                {aggregatedStats.mongodb.avgResponseTime > 0 ? (
                  <> {Math.round((aggregatedStats.mongodb.avgResponseTime - aggregatedStats.elasticsearch.avgResponseTime) / aggregatedStats.mongodb.avgResponseTime * 100)}% faster</>
                ) : null} with search operations.
              </>
            )}
          </p>
        </motion.div>
      )}

      {/* Live Data Indicator */}
      <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 bg-status-online rounded-full"
        ></motion.div>
        <span>Live updates every second</span>
      </div>
    </motion.div>
  );
}