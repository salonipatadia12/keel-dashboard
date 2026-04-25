import IvrFlow from './IvrFlow';
import type { FrictionResult, TreeNode } from '../lib/types';
import { AlertTriangle, Check, Sparkles } from './Icons';

interface Props {
  variant: 'current' | 'recommended';
  tree: TreeNode;
  friction: FrictionResult;
  height: number;
  prunedCount?: number;
  rationale?: string[];
}

const ACCENT = {
  current: {
    label: 'Today',
    badge: 'baseline',
    badgeClass: 'text-warn bg-warn/10 border-warn/20',
    headerColor: 'text-warn',
  },
  recommended: {
    label: 'With Keel',
    badge: 'projected',
    badgeClass: 'text-good bg-good/10 border-good/20',
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
  prunedCount,
  rationale,
}: Props) {
  const a = ACCENT[variant];
  const isRec = variant === 'recommended';

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
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${a.badgeClass}`}
          >
            {a.badge}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <StatChip label="Friction" value={`${friction.totalScore} ${friction.grade}`} />
          <StatChip label="Levels" value={friction.maxDepth} />
          <StatChip label="Nodes" value={friction.totalNodes} />
          <StatChip label="Dead-ends" value={friction.deadEndCount} />
        </div>
      </div>

      <div className="p-3">
        <IvrFlow tree={tree} height={height} variant={variant} />
      </div>

      <div className="px-5 py-3 border-t border-line bg-bg2/40">
        {!isRec && (
          <div className="flex items-start gap-2.5 text-[11px] leading-snug">
            {prunedCount && prunedCount > 0 ? (
              <>
                <AlertTriangle size={13} className="text-warn shrink-0 mt-0.5" />
                <span className="text-muted">
                  <span className="text-warn font-semibold">
                    {prunedCount} ghost branches
                  </span>{' '}
                  removed before scoring — each was a child of a node that
                  already reached a human or voicemail. The KPIs above reflect
                  the corrected tree.
                </span>
              </>
            ) : (
              <>
                <Check size={13} className="text-good shrink-0 mt-0.5" />
                <span className="text-muted">No data-quality issues detected.</span>
              </>
            )}
          </div>
        )}

        {isRec && rationale && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={12} className="text-accent" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
                Design rules applied
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-1.5">
              {rationale.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-ink2 leading-snug">
                  <Check size={11} className="text-good mt-0.5 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
