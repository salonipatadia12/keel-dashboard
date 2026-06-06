// Shared 3-band color helper used by every score-rendering surface
// (KPI tiles, brand impact, university selector, cohort comparison bars).
//
// Client-specified palette (June 2026): red / yellow / green only. No
// blue, no pink — every score lands in one of three bands.
//
// For friction (high = bad):
//   >= 67  red    severe friction
//   33-66  yellow moderate friction
//   <  33  green  minimal friction
//
// For brand reputation / CXI (high = good), the palette flips:
//   >= 67  green
//   33-66  yellow
//   <  33  red

export type Band = 'red' | 'yellow' | 'green';

export interface BandClasses {
  // Solid fill for a small badge / pill background, with readable text.
  pillBg: string;
  pillText: string;
  pillBorder: string;
  // KPI-tile cell fill: dark, saturated band variant (band_X_dark) so red
  // reads as alarming and green as safe at a glance. Paired with cellTextSolid.
  cellBg: string;
  cellBorder: string;
  // Saturated band color text — use on WHITE/light surfaces (e.g. BrandImpact
  // cards, where the body is bg-surface).
  cellText: string;
  // White text — use on cellBg dark fills (e.g. KpiTile cells). Caption rows
  // can apply `opacity-80` for a softened secondary line.
  cellTextSolid: string;
  // Bar fill used by the rankings bars.
  barFill: string;
  // Hex value of the solid color — useful for inline SVG / non-Tailwind needs.
  hex: string;
}

const CLASSES: Record<Band, BandClasses> = {
  red: {
    pillBg: 'bg-band_red',
    pillText: 'text-white',
    pillBorder: 'border-band_red',
    cellBg: 'bg-band_red_dark',
    cellBorder: 'border-band_red/30',
    cellText: 'text-band_red',
    cellTextSolid: 'text-white',
    barFill: 'bg-band_red',
    hex: '#900D09',
  },
  yellow: {
    // Yellow is the one band where the "dark variant + white text" recipe
    // doesn't work. The client-specified #FFEF00 reads as the right
    // color, but white text on it fails AA contrast. So pill and cell
    // both fill with bright #FFEF00 and use dark text (text-ink,
    // ~17:1 contrast on yellow). cellText (used on WHITE backgrounds
    // like BrandImpact cards) drops to the dark mustard variant so it
    // reads against light surfaces.
    pillBg: 'bg-band_yellow',
    pillText: 'text-ink',
    pillBorder: 'border-band_yellow_dark/40',
    cellBg: 'bg-band_yellow',
    cellBorder: 'border-band_yellow_dark/30',
    cellText: 'text-band_yellow_dark',
    cellTextSolid: 'text-ink',
    barFill: 'bg-band_yellow',
    hex: '#FFEF00',
  },
  green: {
    pillBg: 'bg-band_green',
    pillText: 'text-white',
    pillBorder: 'border-band_green',
    cellBg: 'bg-band_green_dark',
    cellBorder: 'border-band_green/30',
    cellText: 'text-band_green',
    cellTextSolid: 'text-white',
    barFill: 'bg-band_green',
    hex: '#228B22',
  },
};

// High-is-bad — used for friction scores.
export function frictionBand(score: number): Band {
  if (!Number.isFinite(score)) return 'yellow';
  if (score >= 67) return 'red';
  if (score >= 33) return 'yellow';
  return 'green';
}

// High-is-good — used for brand reputation, CXI, question coverage, etc.
export function brandBand(score: number): Band {
  if (!Number.isFinite(score)) return 'yellow';
  if (score >= 67) return 'green';
  if (score >= 33) return 'yellow';
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
