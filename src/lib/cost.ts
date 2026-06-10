// Cost / ROI math for the dashboard. Powers the CostStrip component and
// the no-IVR Pitch sentence, which both quote the same numbers.
//
// Client formula (Steve Reasner, 2026-06-08):
//   today_cost_per_call = ($22/hr × 10 hr/day × N_people) ÷ daily_call_volume
//   voice_cost_per_call = voice_avg_call_minutes × $0.10/min
//   annual_savings      = (today_cost − voice_cost) × daily_call_volume × 365
//
// Inputs (N_people, daily_call_volume) come from per-tenant overrides
// when known, otherwise workspace defaults. Voice call duration comes
// from the friction model (lib/recommend.ts hardcodes 85s per leaf, so
// avgDurationSec lands around 50-60s typically).

import type { Band } from './scoreColor';

export const HOURLY_RATE = 22;            // $/hr — client labor-cost assumption
export const HOURS_PER_DAY = 10;          // hr/day — staffed front-desk hours
export const VOICE_AGENT_RATE_PER_MIN = 0.10; // $/min — Vapi stack (GPT-4o + ElevenLabs + Deepgram)

interface WorkspaceDefaults {
  people: number;
  dailyCallVolume: number;
}

const DEFAULTS: Record<string, WorkspaceDefaults> = {
  universities: { people: 4, dailyCallVolume: 500 },
  'k12-districts': { people: 2, dailyCallVolume: 200 },
};

// Per-tenant overrides — populate as Saloni gathers real numbers from
// the client / research. Any tenant id (matches scripts/build-data.mjs
// SOURCES) can override either field; missing fields fall back to the
// workspace defaults above.
export const TENANT_COST_INPUTS: Record<
  string,
  { people?: number; dailyCallVolume?: number }
> = {
  // upenn: { people: 6, dailyCallVolume: 1200 }, // example shape
};

export interface CostBreakdown {
  todayCostPerCall: number;
  voiceCostPerCall: number;
  annualSavings: number;
  inputs: {
    people: number;
    dailyCallVolume: number;
    voiceCallMinutes: number;
  };
}

export function computeCost(
  tenantId: string,
  workspaceId: string,
  voiceAvgDurationSec: number
): CostBreakdown {
  const ws = DEFAULTS[workspaceId] ?? DEFAULTS.universities;
  const override = TENANT_COST_INPUTS[tenantId] ?? {};

  // NaN safety: Math.max(1, NaN) returns NaN, not 1. So a typo or undefined
  // value in an override silently propagates NaN through every downstream
  // multiplication. Validate each input with Number.isFinite before clamping.
  const peopleOverride = override.people;
  const people =
    Number.isFinite(peopleOverride) && (peopleOverride as number) >= 0
      ? (peopleOverride as number)
      : ws.people;

  const volumeOverride = override.dailyCallVolume;
  const dailyCallVolume = Math.max(
    1,
    Number.isFinite(volumeOverride) && (volumeOverride as number) >= 1
      ? (volumeOverride as number)
      : ws.dailyCallVolume
  );

  // Same hazard on voiceAvgDurationSec — falls back to 85s (the per-leaf
  // default in lib/recommend.ts) so the cost tiles never render "$NaN".
  const voiceDurationSec =
    Number.isFinite(voiceAvgDurationSec) && voiceAvgDurationSec >= 0
      ? voiceAvgDurationSec
      : 85;

  const todayDailyLaborCost = HOURLY_RATE * HOURS_PER_DAY * people;
  const todayCostPerCall = todayDailyLaborCost / dailyCallVolume;

  const voiceMinutes = voiceDurationSec / 60;
  const voiceCostPerCall = voiceMinutes * VOICE_AGENT_RATE_PER_MIN;

  const annualSavings = Math.max(
    0,
    (todayCostPerCall - voiceCostPerCall) * dailyCallVolume * 365
  );

  return {
    todayCostPerCall,
    voiceCostPerCall,
    annualSavings,
    inputs: { people, dailyCallVolume, voiceCallMinutes: voiceMinutes },
  };
}

// High cost = red (bad). Low cost = green (good). Tuned for the
// expected ranges: today typically $1-3/call, voice $0.05-0.15/call.
export function costBand(perCall: number): Band {
  if (!Number.isFinite(perCall)) return 'yellow';
  if (perCall >= 1.5) return 'red';
  if (perCall >= 0.5) return 'yellow';
  return 'green';
}

// Higher annual savings = better. Below $25k is "not much"; above $100k
// is a strong pitch number.
export function savingsBand(annual: number): Band {
  if (!Number.isFinite(annual) || annual < 25_000) return 'red';
  if (annual < 100_000) return 'yellow';
  return 'green';
}

export function fmtUsdPerCall(v: number): string {
  if (!Number.isFinite(v) || v < 0) return '—';
  // Always show 2 decimal places so $1.76 and $0.14 line up visually.
  return `$${v.toFixed(2)}`;
}

export function fmtUsdAnnual(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
