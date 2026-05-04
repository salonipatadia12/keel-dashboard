import IvrFlow from './IvrFlow';
import type { FrictionResult, TreeNode } from '../lib/types';
import { Check, Sparkles } from './Icons';

interface Props {
  variant: 'current' | 'recommended' | 'voice_agent';
  tree: TreeNode;
  friction: FrictionResult;
  height: number;
  rationale?: string[];
}

const ACCENT = {
  current: {
    label: 'Today',
    badge: 'baseline',
    badgeClass: 'text-warn bg-warn/10 border-warn/25',
    headerColor: 'text-warn',
  },
  recommended: {
    label: 'Optimized IVR',
    badge: 'projected · digit menu',
    badgeClass: 'text-accent bg-accent/10 border-accent/25',
    headerColor: 'text-accent',
  },
  voice_agent: {
    label: 'Voice agent',
    badge: 'projected · natural language',
    badgeClass: 'text-good bg-good/10 border-good/25',
    headerColor: 'text-good',
  },
};

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export default function TreePanel({
  variant,
  tree,
  friction,
  height,
  rationale,
}: Props) {
  const a = ACCENT[variant];
  const isRec = variant === 'recommended' || variant === 'voice_agent';

  return (
    <div className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-line flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${a.headerColor}`}
          >
            {a.label}
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${a.badgeClass} font-semibold`}
          >
            {a.badge}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <StatChip label="Friction" value={`${friction.totalScore} ${friction.grade}`} />
          <StatChip label="Levels" value={friction.maxDepth} />
          <StatChip label="Nodes" value={friction.totalNodes} />
          <StatChip label="Dead ends" value={friction.deadEndCount} />
        </div>
      </div>

      <div className="p-3">
        <IvrFlow tree={tree} height={height} variant={variant} />
      </div>

      {isRec && rationale && (
        <div className="px-5 py-3 border-t border-line bg-bg2/40">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles size={12} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
              Design rules applied
            </span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {rationale.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11.5px] text-ink2 leading-snug"
              >
                <Check size={12} className="text-good mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
