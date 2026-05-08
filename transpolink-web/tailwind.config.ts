import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        ink:      '#111827',   // Near-black for primary text
        mist:     '#9dcdd6',   // Lagoon Mist — decorative accent
        whisper:  '#f8fafc',   // Page background
        charcoal: '#374151',   // Secondary text
        silver:   '#9ca3af',   // Placeholders, tertiary
        slate:    '#e5e7eb',   // Borders, dividers
        'input-border': '#d1d5db',

        // Brand = Teal — the interactive accent color
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',  // Primary CTA
          700: '#0f766e',  // Hover state
          800: '#115e59',
          900: '#134e4a',
        },
      },
      boxShadow: {
        soft:          '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        card:          '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'card-hover':  '0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        'bottom-sheet':'0 -8px 32px rgba(0,0,0,0.14), 0 -1px 4px rgba(0,0,0,0.04)',
        'input-focus': '0 0 0 3px rgba(13,148,136,0.15)',
        floating:      '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        glow:          '0 0 24px rgba(13,148,136,0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        shimmer:      'shimmer 1.5s ease-in-out infinite',
        'fade-in':    'fade-in 0.2s ease-out both',
        'slide-up':   'slide-up 0.3s cubic-bezier(0.32,0.72,0,1) both',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in':   'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
