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
        // Client-specified band colors (June 2026): red #900D09, yellow
        // #FFEF00, green #228B22. Blue intentionally left at the prior
        // hex — the client said "no blue for now," so the 20-39 band
        // keeps its existing color while we standardize the three
        // semantically-anchored bands. Pink (60-79) is a lighter red
        // shade to remain distinct from severe-red while still reading
        // as the same color family.
        //
        // _dark variants pair with white text on KPI tile cells (AA
        // contrast ≥4.5:1). #900D09 is dark enough to use directly;
        // #FFEF00 is far too bright for white text, so the dark variant
        // is a deep mustard that white reads cleanly against; #228B22
        // gets a slight darken for headroom.
        band_red: '#900D09',
        band_red_soft: '#fbd4d3',
        band_red_dark: '#900D09',
        band_pink: '#c0392b',
        band_pink_soft: '#fde0dc',
        band_pink_dark: '#962618',
        band_yellow: '#FFEF00',
        band_yellow_soft: '#fffbb8',
        band_yellow_dark: '#8c7600',
        band_blue: '#2563eb',
        band_blue_soft: '#dbeafe',
        band_blue_dark: '#1d4ed8',
        band_green: '#228B22',
        band_green_soft: '#d4edd4',
        band_green_dark: '#1c701c',
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
