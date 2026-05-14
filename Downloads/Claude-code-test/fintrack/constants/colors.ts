/**
 * Stitch Positive Finance Design Tokens — typed constants.
 * Single source of truth for StyleSheet usage (when className won't work).
 */
export const Colors = {
  // Backgrounds
  background: '#fcf8ff',
  backgroundGreen: '#f8f9ff',
  surface: '#fcf8ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f2fe',
  surfaceContainer: '#efecf8',
  surfaceContainerHigh: '#e9e6f3',
  surfaceContainerHighest: '#e4e1ed',
  surfaceDim: '#dbd8e4',

  // Indigo primary (onboarding)
  primary: '#4648d4',
  primaryContainer: '#6063ee',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#fffbff',
  primaryFixed: '#e1e0ff',
  primaryFixedDim: '#c0c1ff',
  inversePrimary: '#c0c1ff',

  // Forest Green (dashboard)
  primaryGreen: '#004c22',
  primaryContainerGreen: '#166534',
  onPrimaryGreen: '#ffffff',
  primaryFixedGreen: '#a6f4b5',

  // Secondary
  secondary: '#006c4b',
  secondaryContainer: '#64f9bc',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#00714e',

  // On-surface
  onSurface: '#1b1b23',
  onSurfaceVariant: '#464554',
  onBackground: '#1b1b23',

  // Outline
  outline: '#767586',
  outlineVariant: '#c7c4d7',
  borderLight: '#E5E7EB',

  // Errors
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  destructiveRed: '#EF4444',

  // Budget semantic
  needsBlue: '#6366F1',
  wantsAmber: '#FB923C',
  savingsGreen: '#34D399',

  // Accent
  indigoViolet: '#8B5CF6',
  goldAccent: '#F59E0B',
  pinkAccent: '#F472B6',

  // Text
  textMuted: '#6B7280',
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardGreen: {
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  primary: {
    shadowColor: '#4648d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;
