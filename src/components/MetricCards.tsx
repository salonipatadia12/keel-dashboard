import { useState } from 'react';
import type { FrictionResult, Reference } from '../lib/types';
import type { BrandIndex } from '../lib/brand';
import { Layers, Globe, Phone, Sparkles, ArrowRight } from './Icons';

function Card({
  icon,
  label,
  current,
  recommended,
  detail,
  delta,
  refs,
}: {
  icon: React.ReactNode;
  label: string;
  current: string | number;
  recommended: string | number;
  detail?: string;
  delta?: { value: string; tone: 'good' | 'bad' | 'neutral' };
  refs?: Reference[];
}) {
  const [open, setOpen] = useState(false);
  const hasRefs = refs && refs.length > 0;
  const deltaColor =
    delta?.tone === 'good'
      ? 'text-good bg-good/10 border-good/20'
      : delta?.tone === 'bad'
      ? 'text-bad bg-bad/10 border-bad/20'
      : 'text-muted bg-surface2 border-line';

  return (
    <div className="rounded-xl bg-surface border border-line shadow-card p-4 relative overflow-hidden hover:border-line2 transition group">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-surface2 border border-line flex items-center justify-center text-muted group-hover:text-ink2 transition">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
          {label}
        </span>
        {delta && (
          <span
            className={`ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded border ${deltaColor}`}
          >
            {delta.value}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2.5">
        <span className="text-2xl font-semibold text-muted line-through decoration-bad/70 decoration-2 tabular-nums leading-none">
          {current}
        </span>
        <ArrowRight size={16} className="text-accent mb-1" />
        <span className="text-3xl font-bold text-ink tabular-nums leading-none">
          {recommended}
        </span>
      </div>
      {detail && (
        <div className="text-[11px] text-muted mt-2 leading-tight">{detail}</div>
      )}
      {hasRefs && (
        <div className="mt-3 pt-3 border-t border-line">
          <button
            className="text-[10px] text-accent hover:text-accent2 transition flex items-center gap-1"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '− hide' : '+ show'} {refs!.length} location
            {refs!.length === 1 ? '' : 's'}
          </button>
          {open && (
            <ul className="mt-2 space-y-1 max-h-24 overflow-y-auto">
              {refs!.map((r, i) => (
                <li key={i} className="text-[10px] font-mono leading-tight">
                  <span className="text-bad2">{r.value}</span>
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

interface Props {
  current: FrictionResult;
  recommended: FrictionResult;
  webRefs: Reference[];
  phoneRefs: Reference[];
  brandCurrent: BrandIndex;
  brandRecommended: BrandIndex;
}

export default function MetricCards({
  current,
  recommended,
  webRefs,
  phoneRefs,
  brandCurrent,
  brandRecommended,
}: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card
        icon={<Layers size={14} />}
        label="Menu levels"
        current={current.maxDepth}
        recommended={recommended.maxDepth}
        detail="levels deep before resolution"
        delta={{
          value: `−${current.maxDepth - recommended.maxDepth}`,
          tone: 'good',
        }}
      />
      <Card
        icon={<Globe size={14} />}
        label="Web redirects"
        current={webRefs.length}
        recommended={0}
        detail="links spoken to caller"
        delta={
          webRefs.length > 0
            ? { value: `−${webRefs.length}`, tone: 'good' }
            : { value: '—', tone: 'neutral' }
        }
        refs={webRefs}
      />
      <Card
        icon={<Phone size={14} />}
        label="Phone transfers"
        current={phoneRefs.length}
        recommended={0}
        detail="numbers given mid-call"
        delta={
          phoneRefs.length > 0
            ? { value: `−${phoneRefs.length}`, tone: 'good' }
            : { value: '—', tone: 'neutral' }
        }
        refs={phoneRefs}
      />
      <Card
        icon={<Sparkles size={14} />}
        label="Brand reputation"
        current={brandCurrent.score}
        recommended={brandRecommended.score}
        detail={`${brandCurrent.label} → ${brandRecommended.label}`}
        delta={{
          value: `+${brandRecommended.score - brandCurrent.score}`,
          tone: 'good',
        }}
      />
    </div>
  );
}
