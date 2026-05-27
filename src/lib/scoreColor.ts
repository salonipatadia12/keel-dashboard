// Shared 5-band color helper used by every score-rendering surface
// (KPI tiles, brand impact, university selector, cohort comparison bars).
//
// Saloni's bands, applied to friction scores where higher = worse:
//   >= 80  red    severe friction
//   60-79  pink   heavy friction
//   40-59  yellow moderate friction
//   20-39  blue   light friction
//   <  20  green  minimal friction
//
// For brand reputation, the score is inverted (high = better), so the
// palette flips: 80+ green, 60-79 blue, etc.

export type Band = 'red' | 'pink' | 'yellow' | 'blue' | 'green';

export interface BandClasses {
  // Solid fill for a small badge / pill background, with readable text.
  pillBg: string;
  pillText: string;
  pillBorder: string;
  // Soft cell tint used inside KPI tiles, with a contrasting border.
  cellBg: string;
  cellBorder: string;
  cellText: string;
  // Bar fill used by the rankings bars.
  barFill: string;
  // Hex value of the solid color — useful for inline SVG / non-Tailwind needs.
  hex: string;
}

const CLASSES: Record<Band, BandClasses> = {
  red: {
    pillBg: 'bg-band_red/15',
    pillText: 'text-band_red',
    pillBorder: 'border-band_red/35',
    cellBg: 'bg-band_red/8',
    cellBorder: 'border-band_red/30',
    cellText: 'text-band_red',
    barFill: 'bg-band_red',
    hex: '#dc2626',
  },
  pink: {
    pillBg: 'bg-band_pink/15',
    pillText: 'text-band_pink',
    pillBorder: 'border-band_pink/35',
    cellBg: 'bg-band_pink/8',
    cellBorder: 'border-band_pink/30',
    cellText: 'text-band_pink',
    barFill: 'bg-band_pink',
    hex: '#db2777',
  },
  yellow: {
    pillBg: 'bg-band_yellow/15',
    pillText: 'text-band_yellow',
    pillBorder: 'border-band_yellow/35',
    cellBg: 'bg-band_yellow/8',
    cellBorder: 'border-band_yellow/30',
    cellText: 'text-band_yellow',
    barFill: 'bg-band_yellow',
    hex: '#b45309',
  },
  blue: {
    pillBg: 'bg-band_blue/15',
    pillText: 'text-band_blue',
    pillBorder: 'border-band_blue/35',
    cellBg: 'bg-band_blue/8',
    cellBorder: 'border-band_blue/30',
    cellText: 'text-band_blue',
    barFill: 'bg-band_blue',
    hex: '#2563eb',
  },
  green: {
    pillBg: 'bg-band_green/15',
    pillText: 'text-band_green',
    pillBorder: 'border-band_green/35',
    cellBg: 'bg-band_green/8',
    cellBorder: 'border-band_green/30',
    cellText: 'text-band_green',
    barFill: 'bg-band_green',
    hex: '#059669',
  },
};

// High-is-bad — used for friction scores.
export function frictionBand(score: number): Band {
  if (!Number.isFinite(score)) return 'yellow';
  if (score >= 80) return 'red';
  if (score >= 60) return 'pink';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'blue';
  return 'green';
}

// High-is-good — used for brand reputation and any other score where the
// caller wants the number to climb (question coverage, brand index, etc.).
export function brandBand(score: number): Band {
  if (!Number.isFinite(score)) return 'yellow';
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'pink';
  return 'red';
}

export function frictionClasses(score: number): BandClasses {
  return CLASSES[frictionBand(score)];
}

export function brandClasses(score: number): BandClasses {
  return CLASSES[brandBand(score)];
}

// Generic accessor when caller already has a band.
export function bandClasses(b: Band): BandClasses {
  return CLASSES[b];
}
