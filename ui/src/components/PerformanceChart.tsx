import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, BarChart3, Clock, Zap } from 'lucide-react';

interface PerformanceChartProps {
  results: {
    mongodb: {
      avgResponseTime: number;
      opsPerSecond: number;
      successRate: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
    };
    elasticsearch: {
      avgResponseTime: number;
      opsPerSecond: number;
      successRate: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
    };
    comparison: {
      winner: string;
      mongoAdvantage: number;
    };
  };
}

export default function PerformanceChart({ results }: PerformanceChartProps) {
  const { mongodb, elasticsearch } = results;

  // Chart data for response times
  const responseTimeData = [
    {
      name: 'Min',
      MongoDB: mongodb.minResponseTime,
      Elasticsearch: elasticsearch.minResponseTime,
    },
    {
      name: 'Median',
      MongoDB: mongodb.medianResponseTime,
      Elasticsearch: elasticsearch.medianResponseTime,
    },
    {
      name: 'Average',
      MongoDB: mongodb.avgResponseTime,
      Elasticsearch: elasticsearch.avgResponseTime,
    },
    {
      name: 'P95',
      MongoDB: mongodb.p95ResponseTime,
      Elasticsearch: elasticsearch.p95ResponseTime,
    },
    {
      name: 'Max',
      MongoDB: mongodb.maxResponseTime,
      Elasticsearch: elasticsearch.maxResponseTime,
    },
  ];

  // Chart data for operations per second
  const opsData = [
    {
      name: 'Operations/Second',
      MongoDB: mongodb.opsPerSecond,
      Elasticsearch: elasticsearch.opsPerSecond,
    },
    {
      name: 'Success Rate',
      MongoDB: mongodb.successRate,
      Elasticsearch: elasticsearch.successRate,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-sm border border-slate-300 p-3 rounded-lg shadow-lg">
          <p className="text-slate-800 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
              {label === 'Operations/Second' || label === 'Success Rate' ? 
                (label === 'Success Rate' ? '%' : ' ops/s') : 'ms'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Chart Header */}
      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800 mb-2 flex items-center">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
          Performance Analysis
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Visual comparison of database performance metrics
        </p>
      </div>

      {/* Response Time Chart */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 sm:p-6"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Response Time Comparison (ms)
        </h3>
        
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={responseTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#1e293b' }}
                iconType="circle"
              />
              <Bar 
                dataKey="MongoDB" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
                name="MongoDB"
              />
              <Bar 
                dataKey="Elasticsearch" 
                fill="#f27b1c" 
                radius={[4, 4, 0, 0]}
                name="Elasticsearch"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Operations Per Second Chart */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4 sm:p-6"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Performance Metrics
        </h3>
        
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={opsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#1e293b' }}
                iconType="circle"
              />
              <Bar 
                dataKey="MongoDB" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
                name="MongoDB"
              />
              <Bar 
                dataKey="Elasticsearch" 
                fill="#f27b1c" 
                radius={[4, 4, 0, 0]}
                name="Elasticsearch"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Performance Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-4 sm:p-6"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Quick Stats
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl sm:rounded-2xl">
            <div className="text-xl sm:text-2xl font-bold text-mongodb-600">{mongodb.avgResponseTime}</div>
            <div className="text-xs sm:text-sm text-slate-600">MongoDB Avg (ms)</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl sm:rounded-2xl">
            <div className="text-xl sm:text-2xl font-bold text-elasticsearch-600">{elasticsearch.avgResponseTime}</div>
            <div className="text-xs sm:text-sm text-slate-600">Elasticsearch Avg (ms)</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl sm:rounded-2xl">
            <div className="text-xl sm:text-2xl font-bold text-han-600">{mongodb.opsPerSecond}</div>
            <div className="text-xs sm:text-sm text-slate-600">MongoDB Ops/s</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl sm:rounded-2xl">
            <div className="text-xl sm:text-2xl font-bold text-han-600">{elasticsearch.opsPerSecond}</div>
            <div className="text-xs sm:text-sm text-slate-600">Elasticsearch Ops/s</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 