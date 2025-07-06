import { motion } from 'framer-motion';
import { GraduationCap, Database, Activity, Users, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface ModernHeaderProps {
  currentUser?: any;
  totalUsers?: number;
  isLive?: boolean;
}

export default function ModernHeader({ currentUser, totalUsers = 0, isLive = true }: ModernHeaderProps) {
  const socket = useSocket();
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative glass-card m-4 mx-auto max-w-7xl"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-han-500/20 via-transparent to-mongodb-500/20"></div>
      </div>
      
      <div className="relative px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 gap-4">
          {/* HAN University Branding */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex items-center space-x-4"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-han-500 to-han-700 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-mongodb-400 to-elasticsearch-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800">
                HAN University of Applied Sciences
              </h1>
              <p className="text-han-600 text-sm font-medium">
                Open up new horizons
              </p>
            </div>
          </motion.div>

          {/* Project Title */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:block text-center"
          >
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-1">
              Epic NoSQL Showdown
            </h2>
            <p className="text-slate-600 text-sm">
              MongoDB vs Elasticsearch Performance Battle
            </p>
          </motion.div>

          {/* User & Status Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center space-x-4"
          >
            {/* Current User */}
            {currentUser && (
              <div className="hidden sm:flex items-center space-x-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-br from-han-500 to-han-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-slate-800 text-sm font-medium">{currentUser.name}</p>
                  <p className="text-han-600 text-xs">{currentUser.score} points</p>
                </div>
              </div>
            )}

            {/* Live Status & User Count */}
            <div className="flex items-center space-x-4">
              {/* User Count */}
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-2">
                <Users className="h-4 w-4 text-han-600" />
                <span className="text-slate-800 text-sm font-medium">{totalUsers}</span>
              </div>

              {/* Live Indicator */}
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-status-online animate-status-pulse' : 'bg-status-offline'}`}></div>
                <span className={`text-sm font-semibold ${isLive ? 'text-status-online' : 'text-status-offline'}`}>
                  {isLive ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>

              {/* Socket Connection Status */}
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-2">
                {socket.isConnected ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-xs font-medium ${socket.isConnected ? 'text-green-600' : 'text-red-500'}`}>
                  {socket.connectionState.toUpperCase()}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile Project Title */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:hidden pb-3 border-t border-slate-300/50 pt-3 text-center"
        >
          <h2 className="text-lg font-display font-bold text-slate-800 mb-1">
            Epic NoSQL Showdown
          </h2>
          <p className="text-slate-600 text-xs">
            MongoDB vs Elasticsearch Performance Battle
          </p>
        </motion.div>
      </div>
    </motion.header>
  );
}