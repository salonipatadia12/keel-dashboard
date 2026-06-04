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
        // Score-band palette (used by scoreColor / brandColor helpers in
        // lib/scoreColor.ts). Five bands, 20-point each:
        //   red    >= 80   worst
        //   pink   60-79
        //   yellow 40-59
        //   blue   20-39
        //   green  < 20    best
        // For friction this is the natural order; for brand reputation it
        // inverts (high = good). The hexes below match the existing bad /
        // warn / sub / good families so we share semantic colors.
        band_red: '#dc2626',
        band_red_soft: '#fee2e2',
        // Darker variant used as the KPI tile cell fill — saturated enough
        // that red instantly reads as "bad" at a glance and yields AA
        // contrast (≥4.5:1) against white text.
        band_red_dark: '#b91c1c',
        // Pink band sits one notch below red on the severity scale. Originally
        // pure magenta (#db2777 / #be185d), which read as a *different* color
        // family from red and made the CXI cells look "off" next to the pitch
        // sentence's solid red. Shifted toward a red-leaning crimson so the
        // 20-39 band reads as "deep red, just slightly less alarming than 80+"
        // — same color family as band_red, still distinguishable.
        band_pink: '#c92434',
        band_pink_soft: '#fde2e4',
        band_pink_dark: '#a01d2a',
        band_yellow: '#b45309',
        band_yellow_soft: '#fef3c7',
        band_yellow_dark: '#92400e',
        band_blue: '#2563eb',
        band_blue_soft: '#dbeafe',
        band_blue_dark: '#1d4ed8',
        band_green: '#059669',
        band_green_soft: '#d1fae5',
        band_green_dark: '#047857',
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
