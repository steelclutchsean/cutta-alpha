// Design tokens for the Cutta mobile app

export const colors = {
  // Primary brand colors
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

  // Accent colors for wins/success
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

  // Success (green)
  success: {
    500: '#00ff77',
  },

  // Error (red)
  error: {
    500: '#ff4444',
  },

  // Dark theme background colors
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

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#666666',
    inverse: '#121212',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

