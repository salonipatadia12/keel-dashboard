import { useState } from 'react';
import type { Reference } from '../lib/types';
import { ArrowRight } from './Icons';

interface Props {
  icon?: React.ReactNode;
  label: string;
  todayValue: string | number;
  todayCaption?: string;
  futureValue: string | number;
  futureCaption?: string;
  delta?: { value: string; tone: 'good' | 'bad' | 'neutral' };
  refs?: Reference[];
  emphasis?: boolean;
  formula?: string;
}

export default function KpiTile({
  icon,
  label,
  todayValue,
  todayCaption,
  futureValue,
  futureCaption,
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
      } p-4 group hover:border-line2 transition`}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface2/60 border border-line/70 px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-wider text-muted2 font-semibold mb-1">
            Today
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none text-ink">
            {todayValue}
          </div>
          {todayCaption && (
            <div className="text-[10px] text-muted mt-1.5 leading-tight">{todayCaption}</div>
          )}
        </div>
        <div className="rounded-lg bg-gradient-to-br from-accent/8 to-good/5 border border-accent/25 px-3 py-2.5 relative">
          <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center text-muted2">
            <ArrowRight size={11} />
          </div>
          <div className="text-[9px] uppercase tracking-wider text-accent font-semibold mb-1">
            With Keel
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none text-ink">
            {futureValue}
          </div>
          {futureCaption && (
            <div className="text-[10px] text-good mt-1.5 leading-tight font-medium">
              {futureCaption}
            </div>
          )}
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
