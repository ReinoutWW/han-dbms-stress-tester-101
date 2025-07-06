import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Target, Trophy } from 'lucide-react';
import ModernHeader from './components/ModernHeader';
import ModernFooter from './components/ModernFooter';
import RealtimeSidebar from './components/RealtimeSidebar';
import RegistrationModal from './components/RegistrationModal';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import { SocketProvider } from './contexts/SocketContext';
import { useQuery } from '@tanstack/react-query';
import { apiService } from './services/api';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000, // Refetch every 5 seconds for live updates
      staleTime: 1000,
    },
  },
});

type TabType = 'stress-test' | 'leaderboard';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('stress-test');
  const [currentUser, setCurrentUser] = useState<any>(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Fetch leaderboard for total users count
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: apiService.getLeaderboard,
    refetchInterval: 5000,
  });

  // Update current user's data from leaderboard data (including enhanced stats)
  useEffect(() => {
    if (currentUser && leaderboardData) {
      const updatedUser = leaderboardData.leaderboard.find(u => u.id === currentUser.id);
      if (updatedUser) {
        // Only update if the user has valid stats or score has changed
        const hasValidStats = updatedUser.totalTests > 0 || updatedUser.score !== currentUser.score;
        const hasCompleteData = updatedUser.totalTests !== undefined && updatedUser.mongoTests !== undefined;
        
        if (hasValidStats && hasCompleteData) {
          setCurrentUser(updatedUser);
        }
      }
    }
  }, [leaderboardData, currentUser?.id]); // Only depend on currentUser.id to avoid infinite loops

  const tabs = [
    {
      id: 'stress-test' as TabType,
      label: 'Stress Test',
      icon: Target,
      description: 'Run Database Performance Tests'
    },
    {
      id: 'leaderboard' as TabType,
      label: 'Leaderboard',
      icon: Trophy,
      description: 'Rankings & Statistics'
    },
  ];

  return (
    <SocketProvider currentUser={currentUser}>
      <div className="min-h-screen flex flex-col">
        {/* Registration Modal - Blocking Overlay */}
        <RegistrationModal 
          isOpen={!currentUser} 
          onUserCreated={setCurrentUser} 
        />

        {/* Modern Header */}
        <ModernHeader 
          currentUser={currentUser}
          totalUsers={leaderboardData?.totalUsers || 0}
          isLive={true}
        />

        {/* Main Layout with Sidebar */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Tab Navigation */}
            <motion.nav 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="glass-card mx-4 mt-4 max-w-6xl mx-auto"
            >
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8">
                  {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <motion.button
                        key={tab.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          relative flex items-center space-x-3 
                          px-6 py-4 font-medium text-sm
                          transition-all duration-200 border-b-2 group
                          ${isActive 
                            ? 'text-han-700 border-han-600 bg-han-100/50' 
                            : 'text-slate-700 border-transparent hover:text-slate-900 hover:border-slate-400'
                          }
                        `}
                      >
                        <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                        <div className="text-left">
                          <div className="font-semibold">{tab.label}</div>
                          <div className="text-xs opacity-70">{tab.description}</div>
                        </div>
                        
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-gradient-to-r from-han-200/40 to-han-300/40 rounded-lg"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.nav>

            {/* Main Content */}
            <motion.main 
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
            >
              {activeTab === 'stress-test' && <Dashboard currentUser={currentUser} />}
              {activeTab === 'leaderboard' && <Leaderboard />}
            </motion.main>
          </div>

          {/* Real-time Sidebar */}
          <RealtimeSidebar className="hidden lg:block flex-shrink-0 sticky top-16 h-fit m-6" />
        </div>

        {/* Modern Footer */}
        <ModernFooter />

        {/* Toast Notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#1e293b',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </SocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
