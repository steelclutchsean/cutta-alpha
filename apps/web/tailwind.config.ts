import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ff',
          100: '#b3e7ff',
          200: '#80d4ff',
          300: '#4dc1ff',
          400: '#26b3ff',
          500: '#00a3ff',
          600: '#0082cc',
          700: '#006199',
          800: '#004166',
          900: '#002033',
        },
        gold: {
          50: '#fff9e6',
          100: '#ffecb3',
          200: '#ffe080',
          300: '#ffd34d',
          400: '#ffc926',
          500: '#ffbf00',
          600: '#cc9900',
          700: '#997300',
          800: '#664d00',
          900: '#332600',
        },
        dark: {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#b3b3b3',
          300: '#808080',
          400: '#4d4d4d',
          500: '#333333',
          600: '#262626',
          700: '#1a1a1a',
          800: '#121212',
          900: '#0a0a0a',
        },
        // Liquid Glass colors
        glass: {
          white: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          highlight: 'rgba(255, 255, 255, 0.15)',
          subtle: 'rgba(255, 255, 255, 0.03)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        condensed: ['var(--font-condensed)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        // Liquid Glass animations
        'glass-shimmer': 'glassShimmer 3s ease-in-out infinite',
        'glass-pulse': 'glassPulse 2s ease-in-out infinite',
        'liquid-flow': 'liquidFlow 8s ease-in-out infinite',
        'border-flow': 'borderFlow 4s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 163, 255, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 163, 255, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Liquid Glass keyframes
        glassShimmer: {
          '0%, 100%': { backgroundPosition: '200% 0' },
          '50%': { backgroundPosition: '-200% 0' },
        },
        glassPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
        liquidFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, rgba(0,163,255,0.1) 0%, rgba(255,191,0,0.05) 50%, rgba(0,163,255,0.1) 100%)',
        // Liquid Glass gradients
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
        'liquid-mesh': 'radial-gradient(ellipse at 20% 30%, rgba(0,163,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(255,191,0,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(0,163,255,0.05) 0%, transparent 70%)',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-glow': '0 0 30px rgba(0, 163, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-gold': '0 0 30px rgba(255, 191, 0, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)',
        'inner-glass': 'inset 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 -1px 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;

