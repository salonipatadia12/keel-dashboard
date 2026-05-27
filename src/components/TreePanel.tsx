import { useState, useMemo } from 'react';
import IvrFlow from './IvrFlow';
import type { FrictionResult, MenuItemRow, TreeNode } from '../lib/types';
import { Check, Sparkles } from './Icons';
import { computeMenuStats } from '../lib/menuStats';

interface Props {
  variant: 'current' | 'recommended' | 'voice_agent';
  tree: TreeNode;
  friction: FrictionResult;
  height: number;
  rationale?: string[];
  // Raw Menu Mapping rows for this tenant. Only meaningful on the
  // 'current' variant — used to surface how much of the IVR was
  // explored by our test calls vs. how many options exist on paper.
  menuOptions?: MenuItemRow[];
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

function MenuDirectory({
  menuOptions,
  exploredCount,
}: {
  menuOptions: MenuItemRow[];
  exploredCount: number;
}) {
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => computeMenuStats(menuOptions), [menuOptions]);
  const levels = Array.from(stats.uniqueByLevel.keys()).sort((a, b) => a - b);
  const dedupNote =
    stats.unique.length < menuOptions.length
      ? ` · ${menuOptions.length} raw rows across ${stats.callCount} test ${stats.callCount === 1 ? 'call' : 'calls'} deduped`
      : '';

  return (
    <div className="px-5 py-3 border-t border-line bg-bg2/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left text-[11px] text-muted hover:text-ink2 transition"
      >
        <span className={'transition-transform inline-block ' + (open ? 'rotate-90' : '')}>
          ▸
        </span>
        <span className="font-semibold uppercase tracking-[0.14em]">
          All menu options ({stats.unique.length} unique)
        </span>
        <span className="text-muted2 normal-case tracking-normal font-normal">
          · test call walked {exploredCount}; the rest are submenu branches
          we logged but didn't dial{dedupNote}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {levels.map((level) => {
            const rows = stats.uniqueByLevel.get(level) ?? [];
            return (
              <div key={level}>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted2 font-semibold mb-1.5">
                  Level {level} · {rows.length}{' '}
                  {rows.length === 1 ? 'option' : 'options'}
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {rows.map((r, i) => (
                    <li
                      key={`${level}-${i}`}
                      className="flex items-start gap-2 text-[11.5px] text-ink2 leading-snug"
                    >
                      <span className="font-mono text-[10px] text-muted2 mt-0.5 shrink-0 w-6">
                        {r.digit !== null && r.digit !== undefined
                          ? String(r.digit).replace(/\.0$/, '')
                          : '·'}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-ink2">
                          {r.option_label ?? '(no label captured)'}
                        </span>
                        {r.type && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted2">
                            {r.type}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TreePanel({
  variant,
  tree,
  friction,
  height,
  rationale,
  menuOptions,
}: Props) {
  const a = ACCENT[variant];
  const isRec = variant === 'recommended' || variant === 'voice_agent';
  const menuStats = useMemo(
    () => (menuOptions ? computeMenuStats(menuOptions) : null),
    [menuOptions]
  );
  const showDirectory =
    variant === 'current' &&
    menuStats !== null &&
    menuStats.unique.length > friction.totalNodes;

  return (
    <div className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-line flex items-center gap-3 flex-wrap">
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
        <div className="ml-auto flex items-center gap-5 flex-wrap">
          <StatChip label="Friction" value={`${friction.totalScore} ${friction.grade}`} />
          <StatChip label="Levels" value={friction.maxDepth} />
          <StatChip label="Nodes" value={friction.totalNodes} />
          <StatChip label="Dead ends" value={friction.deadEndCount} />
          {showDirectory && (
            <StatChip
              label="Menu options"
              value={`${menuStats!.unique.length} unique`}
            />
          )}
        </div>
      </div>

      <div className="p-3">
        <IvrFlow tree={tree} height={height} variant={variant} />
      </div>

      {showDirectory && (
        <MenuDirectory
          menuOptions={menuOptions!}
          exploredCount={friction.totalNodes}
        />
      )}

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
