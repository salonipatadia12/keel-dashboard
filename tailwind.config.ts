import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light dashboard palette (slate-tinted)
        bg: '#f6f7f9',
        bg2: '#fafbfc',
        surface: '#ffffff',
        surface2: '#f3f4f6',
        surface3: '#e5e7eb',
        line: '#e5e7eb',
        line2: '#cbd5e1',
        ink: '#0f172a',
        ink2: '#1f2937',
        muted: '#475569',
        muted2: '#64748b',
        // Accents
        accent: '#7c3aed', // violet 600 (Keel brand)
        accent2: '#5b21b6',
        good: '#0d9f6e',
        good2: '#10b981',
        warn: '#d97706',
        warn2: '#f59e0b',
        bad: '#dc2626',
        bad2: '#ef4444',
        sub: '#2563eb',
        sub2: '#3b82f6',
        vm: '#9333ea',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -10px rgba(15,23,42,0.08)',
        glow: '0 0 24px -4px rgba(124,58,237,0.25)',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 12% 0%, rgba(124,58,237,0.06) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(37,99,235,0.04) 0px, transparent 45%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
