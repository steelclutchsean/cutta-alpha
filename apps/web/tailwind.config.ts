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
        // Dynamic theme colors using CSS variables
        bg: {
          primary: 'rgb(var(--bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--bg-tertiary) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          quaternary: 'rgb(var(--text-quaternary) / <alpha-value>)',
        },
        accent: {
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          gold: 'rgb(var(--accent-gold) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          red: 'rgb(var(--accent-red) / <alpha-value>)',
        },
        // Legacy color scales (for compatibility)
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
        // Liquid Glass semantic colors
        glass: {
          white: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          highlight: 'var(--glass-border-hover)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        // Liquid Glass animations
        'glass-shimmer': 'glassShimmer 3s ease-in-out infinite',
        'glass-pulse': 'glassPulse 2s ease-in-out infinite',
        'liquid-flow': 'liquidFlow 20s ease-in-out infinite',
        'border-flow': 'borderFlow 4s linear infinite',
        // Liquid Metal animations
        'metal-sheen': 'metalSheen 0.8s ease-out',
        'metal-sheen-continuous': 'metalSheenContinuous 4s ease-in-out infinite',
        'metal-shift': 'metalShift 8s ease-in-out infinite',
        'metal-border-flow': 'metalBorderFlow 6s linear infinite',
        // Premium effects
        'live-pulse': 'livePulse 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(var(--accent-blue), 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(var(--accent-blue), 0.6)' },
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
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.02) translateY(-1%)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        // Liquid Metal keyframes
        metalSheen: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        metalSheenContinuous: {
          '0%, 100%': { backgroundPosition: '-200% 0' },
          '50%': { backgroundPosition: '200% 0' },
        },
        metalShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        metalBorderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 200%' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Liquid Glass gradients
        'glass-gradient': 'var(--glass-highlight)',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
        'liquid-mesh': 'var(--ambient-gradient)',
        // Liquid Metal gradients
        'metal-gradient': 'var(--metal-gradient)',
        'metal-sheen': 'var(--metal-sheen)',
        'metal-border': 'var(--metal-border)',
      },
      backdropBlur: {
        'glass': '24px',
        'glass-heavy': '48px',
      },
      boxShadow: {
        'glass': 'var(--glass-shadow)',
        'glass-lg': 'var(--glass-shadow-lg)',
        'glass-glow': '0 0 30px rgba(var(--accent-blue), 0.3), var(--glass-shadow)',
        'glass-gold': '0 0 30px rgba(var(--accent-gold), 0.3), var(--glass-shadow)',
        'metal': 'var(--metal-shadow)',
        'inner-glass': 'var(--glass-inner-shadow)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
