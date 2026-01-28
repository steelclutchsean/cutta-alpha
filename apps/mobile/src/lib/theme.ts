// Design tokens for the Cutta mobile app

export const colors = {
  // Primary brand colors - Sea Green
  primary: {
    50: '#e8f5ec',
    100: '#c5e6d0',
    200: '#9ed4b2',
    300: '#77c294',
    400: '#59b37d',
    500: '#2E8B57', // Main green
    600: '#277549',
    700: '#1f5d3a',
    800: '#17452c',
    900: '#0f2d1d',
  },

  // Secondary - Rich Gold
  gold: {
    50: '#fdf8e8',
    100: '#f9ecc4',
    200: '#f2db8a',
    300: '#e8c85c',
    400: '#deb941',
    500: '#D4AF37', // Main gold
    600: '#b8962e',
    700: '#8f7423',
    800: '#665319',
    900: '#3d310f',
  },

  // Accent - Beige/Cream
  beige: {
    50: '#fdfdf8',
    100: '#fbfbf2',
    200: '#f8f8e8',
    300: '#f5f5dc', // Main beige (#F5F5DC)
    400: '#e8e8c8',
    500: '#d4d4b0',
    600: '#b8b898',
    700: '#9c9c80',
    800: '#7a7a64',
    900: '#585848',
  },

  // Success (green)
  success: {
    500: '#2E8B57',
  },

  // Error (red)
  error: {
    500: '#ff4444',
  },

  // Surface/Dark theme background colors
  dark: {
    50: '#f5f5f5',
    100: '#e0e0e0',
    200: '#b3b3b3',
    300: '#808080',
    400: '#4d4d4d',
    500: '#333333',
    600: '#262626',
    700: '#1a1a1a', // Surface color (#1A1A1A)
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

