/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        // HAN University Colors
        han: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // HAN Blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Modern Glass Colors
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          strong: 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(0, 0, 0, 0.2)',
        },
        // Database Brand Colors
        mongodb: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // MongoDB Green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        elasticsearch: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fbd7a5',
          300: '#f8bb6d',
          400: '#f59542',
          500: '#f27b1c', // Elasticsearch Orange
          600: '#e35f12',
          700: '#bc4811',
          800: '#963916',
          900: '#793015',
        },
        // Status Colors
        status: {
          online: '#10b981',
          offline: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
        // Performance Colors
        performance: {
          excellent: '#10b981',
          good: '#22c55e',
          average: '#f59e0b',
          poor: '#ef4444',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-up': 'scaleUp 0.3s ease-out',
        'glass-morph': 'glassMorph 3s ease-in-out infinite',
        'data-flow': 'dataFlow 2s ease-in-out infinite',
        'status-pulse': 'statusPulse 2s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        glow: {
          '0%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            filter: 'brightness(1)'
          },
          '100%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            filter: 'brightness(1.2)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glassMorph: {
          '0%, 100%': { 
            backdropFilter: 'blur(20px) saturate(180%)',
            background: 'rgba(255, 255, 255, 0.1)'
          },
          '50%': { 
            backdropFilter: 'blur(25px) saturate(200%)',
            background: 'rgba(255, 255, 255, 0.15)'
          },
        },
        dataFlow: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        statusPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      fontFamily: {
        'han': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Orbitron', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        '7xl': '5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      backdropBlur: {
        '4xl': '72px',
        '5xl': '96px',
      },
      boxShadow: {
        'glass-sm': '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'han': '0 10px 40px rgba(14, 165, 233, 0.3)',
        'mongodb': '0 10px 40px rgba(34, 197, 94, 0.3)',
        'elasticsearch': '0 10px 40px rgba(242, 123, 28, 0.3)',
      },
      gridTemplateColumns: {
        'sidebar': '320px 1fr',
        'main': '1fr 320px',
      }
    },
  },
  plugins: [],
} 