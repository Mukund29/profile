/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ── Stitch Positive Finance Design Tokens ─────────────────────────
      // Onboarding palette (SCR-001–004): Indigo + Purple-white
      // Dashboard palette (SCR-005): Forest Green + Blue-white
      colors: {
        // Core backgrounds
        background: '#fcf8ff',          // Onboarding: soft purple-white
        'background-green': '#f8f9ff',  // Dashboard: airy blue-white
        surface: '#fcf8ff',
        'surface-bright': '#fcf8ff',
        'surface-dim': '#dbd8e4',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f2fe',
        'surface-container': '#efecf8',
        'surface-container-high': '#e9e6f3',
        'surface-container-highest': '#e4e1ed',
        // Indigo primary (onboarding)
        primary: '#4648d4',
        'primary-container': '#6063ee',
        'on-primary': '#ffffff',
        'on-primary-container': '#fffbff',
        'primary-fixed': '#e1e0ff',
        'primary-fixed-dim': '#c0c1ff',
        'on-primary-fixed': '#07006c',
        'on-primary-fixed-variant': '#2f2ebe',
        'inverse-primary': '#c0c1ff',
        // Forest Green primary (dashboard)
        'primary-green': '#004c22',
        'primary-container-green': '#166534',
        'on-primary-green': '#ffffff',
        'on-primary-container-green': '#93e0a2',
        'primary-fixed-green': '#a6f4b5',
        'primary-fixed-dim-green': '#8bd79b',
        // Secondary (Forest Green accent)
        secondary: '#006c4b',
        'secondary-container': '#64f9bc',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00714e',
        'secondary-fixed': '#68fcbf',
        'secondary-fixed-dim': '#45dfa4',
        'on-secondary-fixed': '#002114',
        'on-secondary-fixed-variant': '#005137',
        // Tertiary
        tertiary: '#904900',
        'tertiary-container': '#b55d00',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fffbff',
        'tertiary-fixed': '#ffdcc5',
        'tertiary-fixed-dim': '#ffb783',
        'on-tertiary-fixed': '#301400',
        'on-tertiary-fixed-variant': '#703700',
        // Surface text
        'on-surface': '#1b1b23',
        'on-surface-variant': '#464554',
        'on-background': '#1b1b23',
        'inverse-surface': '#303038',
        'inverse-on-surface': '#f2effb',
        // Outline
        outline: '#767586',
        'outline-variant': '#c7c4d7',
        // Errors
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'destructive-red': '#EF4444',
        // Budget semantic colors
        'needs-blue': '#6366F1',
        'wants-amber': '#FB923C',
        'savings-green': '#34D399',
        // Accent colors
        'indigo-violet': '#8B5CF6',
        'gold-accent': '#F59E0B',
        'pink-accent': '#F472B6',
        // Utility
        'text-muted': '#6B7280',
        'border-light': '#E5E7EB',
        'background-muted': '#F3F4F6',
        'surface-tint': '#494bd6',
      },
      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        'display': ['Manrope_700Bold'],
        'headline': ['Manrope_600SemiBold'],
        'body': ['WorkSans_400Regular'],
        'body-medium': ['WorkSans_500Medium'],
        'label': ['WorkSans_400Regular'],
        'mono': ['WorkSans_600SemiBold'],
        // Token aliases matching Stitch
        'display-lg': ['Manrope_700Bold'],
        'headline-md': ['Manrope_700Bold'],
        'headline-sm': ['Manrope_600SemiBold'],
        'body-lg': ['WorkSans_500Medium'],
        'body-md': ['WorkSans_400Regular'],
        'label-sm': ['WorkSans_400Regular'],
        'data-mono': ['WorkSans_600SemiBold'],
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'data-mono': ['16px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      // ── Border Radius ──────────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '0.25rem',   // 4px
        sm: '0.25rem',        // 4px
        lg: '0.5rem',         // 8px
        xl: '0.75rem',        // 12px — standard component radius
        '2xl': '1rem',        // 16px — large cards
        full: '9999px',       // pills
      },
      // ── Spacing ────────────────────────────────────────────────────────
      spacing: {
        'stack-sm': '0.5rem',        // 8px
        'stack-md': '1rem',          // 16px
        'stack-lg': '1.5rem',        // 24px
        'section-gap': '2rem',       // 32px
        'gutter-md': '1rem',         // 16px
        'container-margin': '1rem',  // 16px
      },
      // ── Shadow ─────────────────────────────────────────────────────────
      boxShadow: {
        card: '0 4px 12px rgba(0, 0, 0, 0.04)',
        'card-green': '0 4px 6px -1px rgba(22, 101, 52, 0.08)',
        primary: '0 4px 12px rgba(70, 72, 212, 0.2)',
      },
    },
  },
  plugins: [],
};
