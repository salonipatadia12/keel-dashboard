import {
  costBand,
  savingsBand,
  fmtUsdPerCall,
  fmtUsdAnnual,
  HOURLY_RATE,
  HOURS_PER_DAY,
  VOICE_AGENT_RATE_PER_MIN,
  type CostBreakdown,
} from '../lib/cost';
import { bandClasses } from '../lib/scoreColor';
import { TrendingUp, Phone, Sparkles } from './Icons';

interface Props {
  // Pre-computed cost breakdown passed in from App.tsx so the same numbers
  // power both this strip and the Pitch sentence below it (single source
  // of truth, single computation per render).
  breakdown: CostBreakdown;
  hasNoIvr: boolean;
}

// Three-tile cost / ROI strip. Companion to MetricCards — sits directly
// below the KPI strip so the dollars sit next to the UX numbers.
//
// For no-IVR tenants (where CXI is N/A above), this IS the pitch —
// it's the apples-to-apples number that compares to an IVR tenant.
export default function CostStrip({ breakdown, hasNoIvr }: Props) {
  const { todayCostPerCall, voiceCostPerCall, annualSavings, inputs } = breakdown;

  const todayBand = bandClasses(costBand(todayCostPerCall));
  const voiceBand = bandClasses(costBand(voiceCostPerCall));
  const savingsClasses = bandClasses(savingsBand(annualSavings));

  const voiceSeconds = Math.round(inputs.voiceCallMinutes * 60);
  const todayCaption = `${inputs.people} ppl × $${HOURLY_RATE}/hr × ${HOURS_PER_DAY}hr ÷ ${inputs.dailyCallVolume} calls`;
  const voiceCaption = `${voiceSeconds}s × $${VOICE_AGENT_RATE_PER_MIN.toFixed(2)}/min`;
  const savingsCaption = `at ${inputs.dailyCallVolume} calls/day · 365 days`;
  // hasNoIvr is currently unused in the captions (math is identical for
  // no-IVR and IVR tenants) but kept on the prop list so the strip can
  // diverge framing later without an App.tsx change. Marked used to keep
  // TS happy under strict noUnusedParameters.
  void hasNoIvr;

  const formula =
    `Cost per call — front-desk labor vs voice agent.\n\n` +
    `Today  = ($${HOURLY_RATE}/hr × ${HOURS_PER_DAY} hr × ${inputs.people} people) ÷ ${inputs.dailyCallVolume} calls/day\n` +
    `       = $${(HOURLY_RATE * HOURS_PER_DAY * inputs.people).toFixed(0)}/day ÷ ${inputs.dailyCallVolume}\n` +
    `       = ${fmtUsdPerCall(todayCostPerCall)} per call\n\n` +
    `Voice  = ${voiceSeconds}s avg call × $${VOICE_AGENT_RATE_PER_MIN.toFixed(2)}/min\n` +
    `       = ${fmtUsdPerCall(voiceCostPerCall)} per call\n\n` +
    `Annual savings = (${fmtUsdPerCall(todayCostPerCall)} − ${fmtUsdPerCall(voiceCostPerCall)}) × ${inputs.dailyCallVolume} × 365\n` +
    `              = ${fmtUsdAnnual(annualSavings)} / year\n\n` +
    `Inputs are workspace defaults unless overridden per-tenant in\n` +
    `lib/cost.ts (TENANT_COST_INPUTS). Tune as real data comes in.`;

  return (
    <section className="rounded-xl bg-surface border border-line shadow-card overflow-hidden mb-8">
      <div className="px-5 py-3 border-b border-line flex items-center gap-2 bg-surface2/40">
        <div className="w-7 h-7 rounded-md bg-bg border border-line flex items-center justify-center text-muted">
          <TrendingUp size={14} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
          Cost per call · today vs voice agent
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
        <CostTile
          icon={<Phone size={14} />}
          label="Today"
          value={fmtUsdPerCall(todayCostPerCall)}
          caption={todayCaption}
          band={todayBand}
          subLabel="per call"
        />
        <CostTile
          icon={<Sparkles size={14} />}
          label="With voice agent"
          value={fmtUsdPerCall(voiceCostPerCall)}
          caption={voiceCaption}
          band={voiceBand}
          subLabel="per call"
        />
        <CostTile
          icon={<TrendingUp size={14} />}
          label="Annual savings"
          value={`+${fmtUsdAnnual(annualSavings)}`}
          caption={savingsCaption}
          band={savingsClasses}
          subLabel="per year"
          emphasis
        />
      </div>

      <div className="px-4 pb-4">
        <details className="group">
          <summary className="text-[10px] text-muted hover:text-ink2 cursor-pointer list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
            <span>How it's calculated</span>
          </summary>
          <div className="mt-2 text-[10px] text-muted2 font-mono leading-snug bg-surface2/60 border border-line/60 rounded p-2 whitespace-pre-wrap">
            {formula}
          </div>
        </details>
      </div>
    </section>
  );
}

function CostTile({
  icon,
  label,
  value,
  caption,
  subLabel,
  band,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  subLabel: string;
  band: ReturnType<typeof bandClasses>;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border-2 px-4 py-4 ${band.cellBg} ${band.cellBorder} flex flex-col gap-2 ${emphasis ? 'shadow-card' : ''}`}
    >
      <div className={`flex items-center gap-2 ${band.cellTextSolid} opacity-90`}>
        <span>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-3xl font-bold tabular-nums tracking-tight ${band.cellTextSolid}`}
        >
          {value}
        </span>
        <span className={`text-[11px] ${band.cellTextSolid} opacity-80`}>
          {subLabel}
        </span>
      </div>
      <div className={`text-[10.5px] leading-tight ${band.cellTextSolid} opacity-80`}>
        {caption}
      </div>
    </div>
  );
}
