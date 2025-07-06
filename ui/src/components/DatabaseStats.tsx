import React from 'react';
import { motion } from 'framer-motion';
import { Database, TrendingUp, Users, Trophy } from 'lucide-react';

interface DatabaseStatsProps {
  stats: {
    mongodb: {
      totalTests: number;
      avgResponseTime: number;
      totalOperations: number;
      successRate: number;
    };
    elasticsearch: {
      totalTests: number;
      avgResponseTime: number;
      totalOperations: number;
      successRate: number;
    };
    overall: {
      totalUsers: number;
      totalTests: number;
      totalOperations: number;
    };
  };
}

export default function DatabaseStats({ stats }: DatabaseStatsProps) {
  const { mongodb, elasticsearch, overall } = stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-slate-800 mb-6 flex items-center">
          <Database className="h-6 w-6 mr-2" />
          Database Performance Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MongoDB Stats */}
          <div className="bg-white/50 backdrop-blur-sm border border-mongodb-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">MongoDB</h3>
              <div className="text-3xl">🍃</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Tests</span>
                <span className="text-slate-800 font-bold">{mongodb.totalTests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Response</span>
                <span className="text-slate-800 font-bold">{mongodb.avgResponseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Operations</span>
                <span className="text-slate-800 font-bold">{mongodb.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Success Rate</span>
                <span className="text-slate-800 font-bold">{mongodb.successRate}%</span>
              </div>
            </div>
          </div>

          {/* Elasticsearch Stats */}
          <div className="bg-white/50 backdrop-blur-sm border border-elasticsearch-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Elasticsearch</h3>
              <div className="text-3xl">🔍</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Tests</span>
                <span className="text-slate-800 font-bold">{elasticsearch.totalTests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Response</span>
                <span className="text-slate-800 font-bold">{elasticsearch.avgResponseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Operations</span>
                <span className="text-slate-800 font-bold">{elasticsearch.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Success Rate</span>
                <span className="text-slate-800 font-bold">{elasticsearch.successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl">
            <Users className="h-8 w-8 mx-auto mb-2 text-han-600" />
            <div className="text-2xl font-bold text-slate-800">{overall.totalUsers}</div>
            <div className="text-sm text-slate-600">Total Warriors</div>
          </div>
          
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold text-slate-800">{overall.totalTests}</div>
            <div className="text-sm text-slate-600">Total Battles</div>
          </div>
          
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-slate-800">{overall.totalOperations}</div>
            <div className="text-sm text-slate-600">Total Operations</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 