import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { User, Loader2, GraduationCap, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

interface RegistrationModalProps {
  isOpen: boolean;
  onUserCreated: (user: any) => void;
}

export default function RegistrationModal({ isOpen, onUserCreated }: RegistrationModalProps) {
  const [name, setName] = useState('');

  const registerMutation = useMutation({
    mutationFn: (userData: { name: string; university: string }) =>
      apiService.registerUser(userData),
    onSuccess: (data) => {
      toast.success(`🎉 Welcome to the arena, ${data.user.name}!`);
      onUserCreated(data.user);
    },
    onError: (error: any) => {
      toast.error(`❌ Registration failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    registerMutation.mutate({ 
      name: name.trim(), 
      university: 'HAN University of Applied Sciences' 
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              duration: 0.5,
              bounce: 0.1 
            }}
            className="relative w-full max-w-md mx-auto"
          >
            {/* Glass Card */}
            <div className="glass-card p-8 text-center">
              {/* HAN University Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-8"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-han-500 to-han-700 rounded-full flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="h-6 w-6 text-han-400 animate-pulse" />
                    </div>
                  </div>
                </div>
                
                <h1 className="text-2xl font-display font-bold text-slate-800 mb-2">
                  HAN University of Applied Sciences
                </h1>
                <p className="text-han-600 text-sm font-medium mb-1">
                  Open up new horizons
                </p>
                <p className="text-slate-600 text-sm">
                  Epic Interactive NoSQL Showdown
                </p>
              </motion.div>

              {/* Registration Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">
                    Join the Database Battle
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Enter your name to participate in the MongoDB vs Elasticsearch showdown
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <User className="inline h-4 w-4 mr-2" />
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={handleChange}
                      placeholder="Enter your name..."
                      className="w-full px-4 py-3 bg-white/60 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-han-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                      disabled={registerMutation.isPending}
                      autoFocus
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={registerMutation.isPending || !name.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-han-500 to-han-700 hover:from-han-600 hover:to-han-800 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg transform hover:-translate-y-0.5"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Enter the Arena</span>
                      </>
                    )}
                  </motion.button>
                </form>

                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-slate-600 mt-6"
                >
                  🎯 Test database performance • 📊 Compare results • 🏆 Climb the leaderboard
                </motion.p>
              </motion.div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -z-10 inset-0 bg-gradient-to-r from-han-500/20 via-mongodb-500/10 to-elasticsearch-500/20 rounded-3xl blur-xl transform scale-110"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}