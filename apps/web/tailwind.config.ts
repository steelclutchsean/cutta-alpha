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
          beige: 'rgb(var(--accent-beige) / <alpha-value>)',
          red: 'rgb(var(--accent-red) / <alpha-value>)',
        },
        // Legacy color scales (for compatibility) - Sea Green & Rich Gold
        primary: {
          50: '#e8f5ec',
          100: '#c5e6d0',
          200: '#9ed4b2',
          300: '#77c294',
          400: '#59b37d',
          500: '#2E8B57',
          600: '#277549',
          700: '#1f5d3a',
          800: '#17452c',
          900: '#0f2d1d',
        },
        beige: {
          50: '#fdfdf8',
          100: '#fbfbf2',
          200: '#f8f8e8',
          300: '#f5f5dc',
          400: '#e8e8c8',
          500: '#d4d4b0',
          600: '#b8b898',
          700: '#9c9c80',
          800: '#7a7a64',
          900: '#585848',
        },
        gold: {
          50: '#fdf8e8',
          100: '#f9ecc4',
          200: '#f2db8a',
          300: '#e8c85c',
          400: '#deb941',
          500: '#D4AF37',
          600: '#b8962e',
          700: '#8f7423',
          800: '#665319',
          900: '#3d310f',
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
