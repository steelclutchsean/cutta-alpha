// Design tokens for the Cutta app
// Inspired by sportsbook/fantasy sports aesthetics

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
  
  // Accent colors for wins/success - Rich Gold
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
  
  // Beige/Cream accent
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
  
  // Success/positive (green)
  success: {
    50: '#e6fff0',
    100: '#b3ffd6',
    200: '#80ffbb',
    300: '#4dffa1',
    400: '#26ff8c',
    500: '#00ff77', // Main green
    600: '#00cc5f',
    700: '#009947',
    800: '#006630',
    900: '#003318',
  },
  
  // Error/negative (red)
  error: {
    50: '#ffe6e6',
    100: '#ffb3b3',
    200: '#ff8080',
    300: '#ff4d4d',
    400: '#ff2626',
    500: '#ff0000', // Main red
    600: '#cc0000',
    700: '#990000',
    800: '#660000',
    900: '#330000',
  },
  
  // Warning (orange)
  warning: {
    50: '#fff5e6',
    100: '#ffe0b3',
    200: '#ffcc80',
    300: '#ffb84d',
    400: '#ffa726',
    500: '#ff9500', // Main orange
    600: '#cc7700',
    700: '#995900',
    800: '#663c00',
    900: '#331e00',
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
    700: '#1a1a1a', // Card backgrounds
    800: '#121212', // Main background
    900: '#0a0a0a', // Darkest
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#666666',
    inverse: '#121212',
  },
} as const;

// Typography scale
export const typography = {
  fontFamily: {
    display: '"SF Pro Display", "Inter", system-ui, sans-serif',
    body: '"SF Pro Text", "Inter", system-ui, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace',
    condensed: '"Barlow Condensed", "SF Pro Display Condensed", sans-serif',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 64,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing scale
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows for dark theme
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
  md: '0 4px 6px rgba(0, 0, 0, 0.5)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.5)',
  glow: {
    primary: '0 0 20px rgba(46, 139, 87, 0.4)',
    gold: '0 0 20px rgba(212, 175, 55, 0.4)',
    success: '0 0 20px rgba(46, 139, 87, 0.4)',
    error: '0 0 20px rgba(255, 0, 0, 0.4)',
  },
} as const;

// Animation durations
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
} as const;

// Export theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;

