import type { UniversityData } from '../lib/types';
import { brandClasses } from '../lib/scoreColor';
import { ArrowRight, Layers } from './Icons';

// CXI = 100 − Friction. Parent-landing reads in CXI throughout to match
// the KPI tile direction (high=good).
const cxi = (frictionScore: number) =>
  Math.max(0, Math.min(100, 100 - frictionScore));

export interface ParentCard {
  parentOrg: string;
  parentLabel: string;
  // 1 = standalone parent (clicking the card jumps straight to that one
  // tenant's report). 2+ = multi-campus, click drills into the parent
  // overview.
  childCount: number;
  // The single child id when childCount = 1 — used to bypass the rollup
  // view and route straight to the tenant report.
  standaloneChildId?: string;
  avgCxiToday: number;
  avgCxiVoice: number;
  childrenSummaries: { id: string; name: string; childKind: string | null }[];
}

interface Props {
  workspaceLabel: string;
  workspaceCaption: string;
  cards: ParentCard[];
  onSelectParent: (parentOrg: string, standaloneChildId?: string) => void;
}

export default function ParentLanding({
  workspaceLabel,
  workspaceCaption,
  cards,
  onSelectParent,
}: Props) {
  // Sort worst-first so the most-broken orgs lead the grid — same logic
  // the Rankings page applies to flat tenants.
  const sorted = [...cards].sort((a, b) => a.avgCxiToday - b.avgCxiToday);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={13} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
              {workspaceLabel}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight leading-none text-ink mb-2">
            {cards.length} {cards.length === 1 ? 'organization' : 'organizations'} audited
          </h1>
          <p className="text-sm text-muted max-w-2xl leading-snug">
            {workspaceCaption} Click an organization to drill into its
            campuses and the rollup CXI across the group.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((card) => {
          const todayBand = brandClasses(card.avgCxiToday);
          const voiceBand = brandClasses(card.avgCxiVoice);
          const lift = Math.round(card.avgCxiVoice - card.avgCxiToday);
          return (
            <button
              key={card.parentOrg}
              type="button"
              onClick={() =>
                onSelectParent(card.parentOrg, card.standaloneChildId)
              }
              className="group text-left rounded-xl bg-surface border border-line shadow-card hover:border-line2 hover:shadow-lg transition p-5 flex flex-col gap-4 relative overflow-hidden"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${todayBand.barFill}`}
                aria-hidden
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink leading-snug truncate">
                    {card.parentLabel}
                  </h3>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted font-semibold">
                    {card.childCount === 1
                      ? 'Single campus'
                      : `${card.childCount} campuses`}
                  </div>
                </div>
                <span className="text-muted group-hover:text-accent transition shrink-0">
                  <ArrowRight size={16} />
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-md border px-2 py-2 ${todayBand.cellBg} ${todayBand.cellBorder}`}>
                  <div className="text-[8px] uppercase tracking-wider font-semibold text-white/85 mb-1">
                    Today CXI
                  </div>
                  <div className="text-lg font-bold tabular-nums text-white leading-none">
                    {Math.round(card.avgCxiToday)}
                  </div>
                </div>
                <div className={`rounded-md border px-2 py-2 ${voiceBand.cellBg} ${voiceBand.cellBorder}`}>
                  <div className="text-[8px] uppercase tracking-wider font-semibold text-white/85 mb-1">
                    Voice CXI
                  </div>
                  <div className="text-lg font-bold tabular-nums text-white leading-none">
                    {Math.round(card.avgCxiVoice)}
                  </div>
                </div>
                <div className="rounded-md border border-good/30 bg-good/10 px-2 py-2">
                  <div className="text-[8px] uppercase tracking-wider font-semibold text-good mb-1">
                    Lift
                  </div>
                  <div className="text-lg font-bold tabular-nums text-good leading-none">
                    +{lift}
                  </div>
                </div>
              </div>

              {card.childCount > 1 && (
                <div className="text-[11px] text-muted2 leading-snug line-clamp-2">
                  {card.childrenSummaries
                    .slice(0, 6)
                    .map((c) => c.name)
                    .join(' · ')}
                  {card.childrenSummaries.length > 6 &&
                    ` · +${card.childrenSummaries.length - 6} more`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
