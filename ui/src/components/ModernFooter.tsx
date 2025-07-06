import { motion } from 'framer-motion';
import { Heart, Github, GraduationCap } from 'lucide-react';

export default function ModernFooter() {
  return (
    <motion.footer
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
      className="relative mt-auto glass-card m-4 mx-auto max-w-7xl"
    >
      <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-han-500/20 via-transparent to-mongodb-500/20"></div>
      </div>
      
      <div className="relative px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Project Info */}
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-8 h-8 bg-gradient-to-br from-han-500 to-han-700 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-800 font-medium">
                HAN University School Project
              </p>
              <p className="text-xs text-slate-600">
                Database Performance Demonstration System
              </p>
            </div>
          </div>

          {/* Authors */}
          <div className="flex items-center space-x-6">
            <div className="text-center sm:text-right">
              <p className="text-sm text-slate-700 mb-1">
                Created with <Heart className="inline h-3 w-3 text-red-500 mx-1" /> by
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-1"
                >
                  <p className="text-sm font-semibold text-slate-800">Reinout Wijnholds</p>
                  <p className="text-xs text-han-600">Lead Developer</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-3 py-1"
                >
                  <p className="text-sm font-semibold text-slate-800">Wob Jelsma</p>
                  <p className="text-xs text-han-600">Co-Developer</p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="mt-4 pt-4 border-t border-slate-300/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            © 2024 HAN University of Applied Sciences • All rights reserved
          </p>
          <div className="flex items-center space-x-4">
            <p className="text-xs text-slate-600">
              Built with React, TypeScript & Tailwind CSS
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-mongodb-500 rounded-full"></div>
              <div className="w-3 h-3 bg-elasticsearch-500 rounded-full"></div>
              <div className="w-3 h-3 bg-han-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}