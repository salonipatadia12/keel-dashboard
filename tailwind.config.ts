import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark dashboard palette
        bg: '#0a0a0f',
        bg2: '#0e0e15',
        surface: '#14141d',
        surface2: '#1a1a25',
        surface3: '#22222e',
        line: '#252533',
        line2: '#33333f',
        ink: '#fafafa',
        ink2: '#e5e7eb',
        muted: '#9ca3af',
        muted2: '#6b7280',
        // Accents
        accent: '#a78bfa', // violet 400
        accent2: '#7c3aed', // violet 600
        good: '#10b981',
        good2: '#34d399',
        warn: '#f59e0b',
        warn2: '#fbbf24',
        bad: '#f43f5e',
        bad2: '#fb7185',
        sub: '#3b82f6',
        sub2: '#60a5fa',
        vm: '#a855f7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.5)',
        glow: '0 0 24px -4px rgba(167,139,250,0.4)',
      },
      backgroundImage: {
        'mesh-dark':
          'radial-gradient(at 20% 0%, rgba(124,58,237,0.08) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(59,130,246,0.06) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
