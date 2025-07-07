import { motion } from 'framer-motion';
import { Trophy, Zap, Clock, Target, Shield, Award } from 'lucide-react';

interface BattleResultsProps {
  results: {
    testInfo: {
      testId: string;
      userId: string;
      userName: string;
      startTime: number;
      endTime: number;
      duration: number;
      operationsRequested: number;
      totalOperations: number;
      scoreEarned: number;
    };
    mongodb: {
      totalOperations: number;
      successful: number;
      failed: number;
      successRate: number;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalResponseTime: number;
      opsPerSecond: number;
      database: string;
      errors: string[];
      errorTypes: Record<string, number>;
    };
    elasticsearch: {
      totalOperations: number;
      successful: number;
      failed: number;
      successRate: number;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalResponseTime: number;
      opsPerSecond: number;
      database: string;
      errors: string[];
      errorTypes: Record<string, number>;
    };
    comparison: {
      winner: string;
      mongoAdvantage: number;
      successRateDiff: number;
      performanceRatio: number;
    };
  };
}

export default function BattleResults({ results }: BattleResultsProps) {
  const { mongodb, elasticsearch, comparison, testInfo } = results;
  
  const isMongoWinner = comparison.winner === 'MongoDB';
  const winnerStats = isMongoWinner ? mongodb : elasticsearch;
  const loserStats = isMongoWinner ? elasticsearch : mongodb;

  const getPerformanceRating = (avgTime: number) => {
    if (avgTime < 50) return { grade: 'S', color: 'text-yellow-400', label: 'Legendary' };
    if (avgTime < 100) return { grade: 'A', color: 'text-green-400', label: 'Excellent' };
    if (avgTime < 200) return { grade: 'B', color: 'text-blue-400', label: 'Good' };
    if (avgTime < 500) return { grade: 'C', color: 'text-orange-400', label: 'Average' };
    return { grade: 'D', color: 'text-red-400', label: 'Needs Work' };
  };

  const mongoRating = getPerformanceRating(mongodb.avgResponseTime);
  const elasticRating = getPerformanceRating(elasticsearch.avgResponseTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Battle Summary */}
      <div className="glass-card p-6">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Trophy className="h-12 w-12 text-yellow-500" />
          </motion.div>
          
          <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">
            ⚔️ BATTLE RESULTS ⚔️
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-han-600">{testInfo.totalOperations}</div>
              <div className="text-sm text-slate-600">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{testInfo.duration}ms</div>
              <div className="text-sm text-slate-600">Battle Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">+{testInfo.scoreEarned}</div>
              <div className="text-sm text-slate-600">Points Earned</div>
            </div>
          </div>
        </div>

        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-2xl border-2 text-center ${
            isMongoWinner 
              ? 'border-mongodb-500 bg-mongodb-100/50' 
              : 'border-elasticsearch-500 bg-elasticsearch-100/50'
          }`}
        >
          <div className="text-4xl mb-2">
            {isMongoWinner ? '🍃' : '🔍'}
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            {comparison.winner} WINS!
          </h3>
          <p className="text-slate-700">
            {Math.abs(comparison.mongoAdvantage)}% faster response time
          </p>
        </motion.div>
      </div>

      {/* Detailed Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* MongoDB Stats */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`glass-card p-6 ${isMongoWinner ? 'border-mongodb-500/50 bg-mongodb-50/30' : ''}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🍃</div>
              <h3 className="text-xl font-bold text-slate-800">MongoDB</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${mongoRating.color} bg-white/60`}>
              {mongoRating.grade}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-slate-600 flex items-center">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Avg Response
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{mongodb.avgResponseTime}ms</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Ops/Second
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{mongodb.opsPerSecond}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Success Rate
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{mongodb.successRate}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                P95 Latency
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{mongodb.p95ResponseTime}ms</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className={`text-sm font-medium ${mongoRating.color}`}>
              {mongoRating.label}
            </span>
          </div>
        </motion.div>

        {/* Elasticsearch Stats */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`glass-card p-6 ${!isMongoWinner ? 'border-elasticsearch-500/50 bg-elasticsearch-50/30' : ''}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🔍</div>
              <h3 className="text-xl font-bold text-slate-800">Elasticsearch</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${elasticRating.color} bg-white/60`}>
              {elasticRating.grade}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-slate-600 flex items-center">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Avg Response
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{elasticsearch.avgResponseTime}ms</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Ops/Second
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{elasticsearch.opsPerSecond}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Success Rate
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{elasticsearch.successRate}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                P95 Latency
              </span>
              <span className="text-sm sm:text-base text-slate-800 font-bold">{elasticsearch.p95ResponseTime}ms</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className={`text-sm font-medium ${elasticRating.color}`}>
              {elasticRating.label}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Performance Breakdown */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2" />
          Performance Breakdown
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Response Time Comparison</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Min Response</span>
                <span className="text-slate-800">
                  {mongodb.minResponseTime}ms vs {elasticsearch.minResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Max Response</span>
                <span className="text-slate-800">
                  {mongodb.maxResponseTime}ms vs {elasticsearch.maxResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Median Response</span>
                <span className="text-slate-800">
                  {mongodb.medianResponseTime}ms vs {elasticsearch.medianResponseTime}ms
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Battle Statistics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Performance Ratio</span>
                <span className="text-slate-800">{comparison.performanceRatio.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Success Rate Diff</span>
                <span className="text-slate-800">{comparison.successRateDiff.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Operations</span>
                <span className="text-slate-800">{mongodb.totalOperations + elasticsearch.totalOperations}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 