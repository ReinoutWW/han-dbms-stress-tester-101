import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2, Sword, Shield, Target } from 'lucide-react';

interface BattleButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  operations: number;
  concurrency: number;
}

export default function BattleButton({ 
  onClick, 
  isLoading, 
  disabled, 
  operations, 
  concurrency 
}: BattleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleClick = () => {
    if (disabled || isLoading) return;
    
    // Epic countdown before battle
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          onClick();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const buttonVariants = {
    idle: {
      scale: 1,
      boxShadow: '0 0 20px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      background: 'linear-gradient(145deg, #dc2626, #991b1b)',
    },
    hover: {
      scale: 1.05,
      boxShadow: '0 0 30px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      background: 'linear-gradient(145deg, #ef4444, #dc2626)',
    },
    loading: {
      scale: 1,
      boxShadow: '0 0 40px rgba(59, 130, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      background: 'linear-gradient(145deg, #3b82f6, #1d4ed8)',
    },
    disabled: {
      scale: 1,
      boxShadow: '0 0 10px rgba(75, 85, 99, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      background: 'linear-gradient(145deg, #6b7280, #4b5563)',
    }
  };

  const getButtonState = () => {
    if (disabled) return 'disabled';
    if (isLoading) return 'loading';
    if (isHovered) return 'hover';
    return 'idle';
  };

  return (
    <div className="relative flex flex-col items-center space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Countdown Display */}
      {countdown !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -top-16 sm:-top-20 lg:-top-24 text-4xl sm:text-5xl lg:text-6xl font-game font-bold text-yellow-400 text-glow"
        >
          {countdown}
        </motion.div>
      )}

      {/* Battle Stats Preview */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm lg:text-base text-slate-600">
        <div className="flex items-center space-x-2">
          <Target className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{operations} Ops</span>
        </div>
        <div className="flex items-center space-x-2">
          <Sword className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{concurrency} Threads</span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Battle Mode</span>
        </div>
      </div>

      {/* Main Battle Button */}
      <motion.button
        onClick={handleClick}
        disabled={disabled || isLoading || countdown !== null}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variants={buttonVariants}
        animate={getButtonState()}
        whileTap={{ scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20,
          duration: 0.3
        }}
        className={`
          relative px-8 sm:px-12 lg:px-16 py-4 sm:py-6 lg:py-8 
          rounded-2xl font-game font-bold 
          text-lg sm:text-xl lg:text-2xl xl:text-3xl text-white
          transition-all duration-300 transform 
          border-2 border-red-500/50
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${isLoading ? 'pointer-events-none' : ''}
          overflow-hidden btn-epic
        `}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-800/20 animate-pulse" />
        
        {/* Button Content */}
        <div className="relative flex items-center justify-center space-x-3 sm:space-x-4">
          {isLoading ? (
            <>
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              <span className="hidden sm:inline">BATTLE IN PROGRESS...</span>
              <span className="sm:hidden">BATTLING...</span>
            </>
          ) : countdown !== null ? (
            <>
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 animate-pulse" />
              <span className="hidden sm:inline">PREPARING FOR BATTLE...</span>
              <span className="sm:hidden">PREPARING...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
              </motion.div>
              <span>STRESS TEST!</span>
            </>
          )}
        </div>

        {/* Epic Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: isHovered && !disabled && !isLoading
              ? [
                  '0 0 20px rgba(220, 38, 38, 0.3)',
                  '0 0 40px rgba(220, 38, 38, 0.6)',
                  '0 0 20px rgba(220, 38, 38, 0.3)',
                ]
              : '0 0 20px rgba(220, 38, 38, 0.3)',
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Loading Pulse */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Battle Sparks */}
        {isHovered && !disabled && !isLoading && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </motion.button>

      {/* Battle Instructions */}
      <div className="text-center text-xs sm:text-sm lg:text-base text-slate-600 max-w-sm sm:max-w-md lg:max-w-lg px-4">
        {disabled ? (
          <span>🔒 Register first to join the battle!</span>
        ) : isLoading ? (
          <span>⚔️ Databases are clashing! Please wait...</span>
        ) : (
          <span>🎯 Click to unleash the epic database showdown!</span>
        )}
      </div>
    </div>
  );
} 