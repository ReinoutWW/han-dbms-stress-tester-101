import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { User, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

interface UserRegistrationProps {
  onUserCreated: (user: any) => void;
}

export default function UserRegistration({ onUserCreated }: UserRegistrationProps) {
  const [formData, setFormData] = useState({
    name: '',
    university: ''
  });

  const universities = [
    'HAN University of Applied Sciences',
    'Radboud University',
    'University of Amsterdam',
    'Delft University of Technology',
    'Eindhoven University of Technology',
    'Utrecht University',
    'Leiden University',
    'Erasmus University Rotterdam',
    'Tilburg University',
    'Other'
  ];

  const registerMutation = useMutation({
    mutationFn: (userData: { name: string; university: string }) =>
      apiService.registerUser(userData),
    onSuccess: (data) => {
      toast.success(`🎉 Welcome to the battle arena, ${data.user.name}!`);
      onUserCreated(data.user);
    },
    onError: (error: any) => {
      toast.error(`❌ Registration failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.university) {
      toast.error('Please select your university');
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto"
    >
      <div className="text-center mb-6 sm:mb-8 lg:mb-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative inline-block mb-4 sm:mb-6"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-han-500 to-han-700 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 sm:h-6 sm:w-6 text-han-400 animate-pulse" />
        </motion.div>
        
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-slate-800 mb-2 sm:mb-4">
          Join the Battle Arena
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600">
          Register to compete in the epic NoSQL showdown!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div>
          <label className="block text-sm sm:text-base font-medium text-slate-700 mb-2 sm:mb-3">
            <User className="inline h-4 w-4 mr-2" />
            Your Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your warrior name..."
            className="w-full px-4 py-3 sm:py-4 lg:py-5 bg-white/60 border border-slate-300 rounded-xl text-slate-800 text-sm sm:text-base placeholder-slate-500 focus:ring-2 focus:ring-han-500 focus:border-transparent transition-all duration-300 hover:bg-white/80 focus:bg-white/80"
            disabled={registerMutation.isPending}
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-slate-700 mb-2 sm:mb-3">
            <GraduationCap className="inline h-4 w-4 mr-2" />
            University
          </label>
          <select
            name="university"
            value={formData.university}
            onChange={handleChange}
            className="w-full px-4 py-3 sm:py-4 lg:py-5 bg-white/60 border border-slate-300 rounded-xl text-slate-800 text-sm sm:text-base focus:ring-2 focus:ring-han-500 focus:border-transparent transition-all duration-300 hover:bg-white/80 focus:bg-white/80"
            disabled={registerMutation.isPending}
          >
            <option value="">Select your university...</option>
            {universities.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>

        <motion.button
          type="submit"
          disabled={registerMutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-han-500 to-han-700 hover:from-han-600 hover:to-han-800 text-white font-bold text-sm sm:text-base lg:text-lg rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 sm:space-x-3 shadow-lg hover:shadow-han-500/25 transform hover:-translate-y-1"
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span>Joining Arena...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Enter the Arena!</span>
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-6 sm:mt-8 lg:mt-12 text-center">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs sm:text-sm text-slate-600"
        >
          🏆 Compete against other students and become the NoSQL champion!
        </motion.p>
      </div>
    </motion.div>
  );
} 