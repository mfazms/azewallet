// Design Tokens — Apple-inspired design system
// Colors, typography, spacing, and animation values

export const colors = {
  // Primary brand colors
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Accent — Mint/Teal for financial positive
  accent: {
    mint: '#00D09C',
    mintLight: '#B2F5EA',
    mintDark: '#00875A',
    cyan: '#00BCD4',
    violet: '#7C4DFF',
  },

  // Semantic colors
  semantic: {
    income: '#00D09C',     // Mint green — positive/income
    expense: '#FF5252',    // Red — expense/warning
    transfer: '#448AFF',   // Blue — transfer/neutral
    warning: '#FFB74D',    // Orange — caution
    success: '#69F0AE',    // Green — on track
    danger: '#FF5252',     // Red — over budget
    info: '#40C4FF',       // Cyan — info
  },

  // Light theme
  light: {
    bg: '#F5F5F7',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#F0F0F2',
    surface: 'rgba(255, 255, 255, 0.72)',
    surfaceHover: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    textTertiary: '#AEAEB2',
    separator: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },

  // Dark theme — OLED friendly
  dark: {
    bg: '#000000',
    bgSecondary: '#1C1C1E',
    bgTertiary: '#2C2C2E',
    surface: 'rgba(28, 28, 30, 0.72)',
    surfaceHover: 'rgba(44, 44, 46, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    text: '#F5F5F7',
    textSecondary: '#98989D',
    textTertiary: '#636366',
    separator: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
  },
  fontSize: {
    heroMoney: '3rem',      // 48px — Safe to Spend headline
    heroLarge: '2.75rem',   // 44px
    h1: '2rem',             // 32px
    h2: '1.75rem',          // 28px
    h3: '1.375rem',         // 22px
    h4: '1.125rem',         // 18px
    body: '1.0625rem',      // 17px — iOS default
    bodySmall: '0.9375rem', // 15px
    caption: '0.8125rem',   // 13px
    tiny: '0.6875rem',      // 11px — minimum
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  lineHeight: {
    tight: '1.15',
    normal: '1.4',
    relaxed: '1.6',
  },
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  '4xl': '2.5rem', // 40px
  '5xl': '3rem',   // 48px
} as const;

export const radius = {
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.75rem',// 28px
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 12px 40px rgba(0, 0, 0, 0.16)',
  glow: '0 0 24px rgba(0, 208, 156, 0.25)',
  glowDanger: '0 0 24px rgba(255, 82, 82, 0.25)',
} as const;

export const animation = {
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  springBouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
  springGentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 30,
  },
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    verySlow: 0.8,
  },
  ease: {
    apple: [0.25, 0.1, 0.25, 1],
    decelerate: [0, 0, 0.2, 1],
    accelerate: [0.4, 0, 1, 1],
  },
} as const;

// Touch target minimum (Apple HIG: 44×44pt)
export const touchTarget = {
  min: '2.75rem', // 44px
} as const;

// Glass morphism presets
export const glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropBlur: 'blur(40px)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  dark: {
    background: 'rgba(28, 28, 30, 0.72)',
    backdropBlur: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  heavy: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropBlur: 'blur(60px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
} as const;
