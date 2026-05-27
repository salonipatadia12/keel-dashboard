import { useState } from 'react';
import type { Reference } from '../lib/types';
import { ArrowRight } from './Icons';
import { bandClasses, type Band } from '../lib/scoreColor';

interface TierValue {
  value: string | number;
  caption?: string;
  // Score-band color for this cell. Computed by MetricCards from the
  // underlying number (friction score, coverage %, duration, etc.) using
  // the shared lib/scoreColor helpers.
  band: Band;
}

interface Props {
  icon?: React.ReactNode;
  label: string;
  today: TierValue;
  ivr: TierValue;
  voice: TierValue;
  delta?: { value: string; tone: 'good' | 'bad' | 'neutral' };
  refs?: Reference[];
  emphasis?: boolean;
  formula?: string;
}

function Cell({
  tier,
  band,
  value,
  caption,
}: {
  tier: 'today' | 'ivr' | 'voice';
  band: Band;
  value: string | number;
  caption?: string;
}) {
  const labels = {
    today: 'Today',
    ivr: 'Optimized IVR',
    voice: 'Voice agent',
  };
  const c = bandClasses(band);
  return (
    <div
      className={`rounded-lg border px-2 py-2 ${c.cellBg} ${c.cellBorder} flex flex-col h-full`}
    >
      <div
        className={`text-[8px] uppercase tracking-wider font-semibold mb-1 ${c.cellText} whitespace-nowrap`}
      >
        {labels[tier]}
      </div>
      <div
        className={`text-lg font-bold tabular-nums leading-none whitespace-nowrap ${c.cellText}`}
      >
        {value}
      </div>
      {caption && (
        <div
          className={`text-[8px] mt-1.5 leading-tight whitespace-nowrap ${c.cellText} opacity-80`}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

export default function KpiTile({
  icon,
  label,
  today,
  ivr,
  voice,
  delta,
  refs,
  emphasis,
  formula,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasRefs = refs && refs.length > 0;

  const deltaCls =
    delta?.tone === 'good'
      ? 'text-good bg-good/10 border-good/25'
      : delta?.tone === 'bad'
        ? 'text-bad bg-bad/10 border-bad/25'
        : 'text-muted bg-surface2 border-line';

  return (
    <div
      className={`rounded-xl bg-surface ${
        emphasis ? 'border-2 border-ink shadow-card' : 'border border-line shadow-card'
      } p-4 h-full flex flex-col group hover:border-line2 transition`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="w-7 h-7 rounded-md bg-surface2 border border-line flex items-center justify-center text-muted">
            {icon}
          </div>
        )}
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
          {label}
        </span>
        {delta && (
          <span
            className={`ml-auto text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded border ${deltaCls}`}
          >
            {delta.value}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 items-stretch relative">
        <Cell
          tier="today"
          band={today.band}
          value={today.value}
          caption={today.caption}
        />
        <Cell
          tier="ivr"
          band={ivr.band}
          value={ivr.value}
          caption={ivr.caption}
        />
        <Cell
          tier="voice"
          band={voice.band}
          value={voice.value}
          caption={voice.caption}
        />
        {/* Connecting arrows */}
        <div className="absolute left-1/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-surface border border-line flex items-center justify-center text-muted2 z-10">
          <ArrowRight size={9} />
        </div>
        <div className="absolute left-2/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-surface border border-line flex items-center justify-center text-muted2 z-10">
          <ArrowRight size={9} />
        </div>
      </div>

      {(hasRefs || formula) && (
        <div className="mt-3 pt-3 border-t border-line">
          {hasRefs && (
            <button
              className="text-[10px] text-accent hover:text-accent2 transition flex items-center gap-1"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? '− hide' : '+ show'} {refs!.length} location
              {refs!.length === 1 ? '' : 's'}
            </button>
          )}
          {formula && (
            <details className="mt-1 group">
              <summary className="text-[10px] text-muted hover:text-ink2 cursor-pointer list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                <span>How it's calculated</span>
              </summary>
              <div className="mt-2 text-[10px] text-muted2 font-mono leading-snug bg-surface2/60 border border-line/60 rounded p-2 whitespace-pre-wrap">
                {formula}
              </div>
            </details>
          )}
          {hasRefs && open && (
            <ul className="mt-2 space-y-1 max-h-24 overflow-y-auto">
              {refs!.map((r, i) => (
                <li key={i} className="text-[10px] font-mono leading-tight">
                  <span className="text-bad">{r.value}</span>
                  <span className="text-muted2"> · {r.sourcePath}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
