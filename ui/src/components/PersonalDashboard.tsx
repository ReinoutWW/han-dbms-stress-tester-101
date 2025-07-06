import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp,
  Database,
  BarChart3,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api';

interface PersonalDashboardProps {
  currentUser: any;
  lastTestResult?: any;
}

export default function PersonalDashboard({ currentUser, lastTestResult }: PersonalDashboardProps) {
  // Fetch user's detailed data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', currentUser?.id],
    queryFn: () => apiService.getUserById(currentUser.id),
    enabled: !!currentUser?.id,
    refetchInterval: 5000,
  });

  // Use fetched enhanced user data if available, otherwise use currentUser as fallback
  // Prefer userData if it has complete information, otherwise use currentUser
  // During loading, keep showing currentUser to avoid flashing zeros
  const user = (userData?.user && userData.user.totalTests !== undefined && !isLoading) 
    ? userData.user 
    : currentUser;

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-han-500 to-han-700 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-800">
                Welcome back, {user.name}!
              </h2>
              <p className="text-slate-600">Ready for another database battle?</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-han-600">{user.score}</div>
            <div className="text-sm text-slate-600">Total Points</div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-han-600" />
            <div className="text-xl font-bold text-slate-800">{user.totalTests || 0}</div>
            <div className="text-xs text-slate-600">Total Tests</div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-4 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-mongodb-600" />
            <div className="text-xl font-bold text-slate-800">{user.mongoTests || 0}</div>
            <div className="text-xs text-slate-600">MongoDB Tests</div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-4 text-center">
            <Database className="h-6 w-6 mx-auto mb-2 text-elasticsearch-600" />
            <div className="text-xl font-bold text-slate-800">{user.elasticTests || 0}</div>
            <div className="text-xs text-slate-600">Elasticsearch Tests</div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-performance-excellent" />
            <div className="text-xl font-bold text-slate-800">{user.efficiency || 0}%</div>
            <div className="text-xs text-slate-600">Efficiency</div>
          </div>
        </div>
      </motion.div>

      {/* Latest Test Results */}
      {lastTestResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="h-6 w-6 text-han-600" />
            <h3 className="text-lg font-semibold text-slate-800">Latest Test Results</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MongoDB Results */}
            <div className="bg-white/50 backdrop-blur-sm border border-mongodb-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="text-xl">🍃</div>
                  <span className="font-semibold text-slate-800">MongoDB</span>
                </div>
                <div className="text-sm text-slate-600">
                  {lastTestResult.mongodb.successful}/{lastTestResult.mongodb.totalOperations} ops
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Avg Response</span>
                  <span className="text-mongodb-600 font-semibold">
                    {lastTestResult.mongodb.avgResponseTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Success Rate</span>
                  <span className="text-slate-800 font-semibold">
                    {lastTestResult.mongodb.successRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Ops/Second</span>
                  <span className="text-slate-800 font-semibold">
                    {lastTestResult.mongodb.opsPerSecond.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Elasticsearch Results */}
            <div className="bg-white/50 backdrop-blur-sm border border-elasticsearch-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="text-xl">🔍</div>
                  <span className="font-semibold text-slate-800">Elasticsearch</span>
                </div>
                <div className="text-sm text-slate-600">
                  {lastTestResult.elasticsearch.successful}/{lastTestResult.elasticsearch.totalOperations} ops
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Avg Response</span>
                  <span className="text-elasticsearch-600 font-semibold">
                    {lastTestResult.elasticsearch.avgResponseTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Success Rate</span>
                  <span className="text-slate-800 font-semibold">
                    {lastTestResult.elasticsearch.successRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Ops/Second</span>
                  <span className="text-slate-800 font-semibold">
                    {lastTestResult.elasticsearch.opsPerSecond.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Comparison */}
          <div className="mt-6 pt-6 border-t border-slate-300/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-han-600" />
                <span className="text-sm font-medium text-slate-700">Test Winner</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${
                  lastTestResult.comparison.winner === 'MongoDB' ? 'text-mongodb-600' : 'text-elasticsearch-600'
                }`}>
                  {lastTestResult.comparison.winner}
                </span>
                <span className="text-xs text-slate-600">
                  ({Math.abs(lastTestResult.comparison.mongoAdvantage).toFixed(1)}ms faster)
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Rating */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Performance Rating</h3>
            <p className="text-slate-600 text-sm">Based on your testing efficiency and consistency</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              user.performanceRating === 'Excellent' ? 'text-performance-excellent' :
              user.performanceRating === 'Good' ? 'text-performance-good' :
              user.performanceRating === 'Average' ? 'text-performance-average' :
              'text-performance-poor'
            }`}>
              {user.performanceRating || 'Not Rated'}
            </div>
            <div className="text-sm text-slate-600">Current Rating</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}