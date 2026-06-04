import type { FrictionResult } from '../lib/types';
import { brandClasses } from '../lib/scoreColor';

export interface CohortRow {
  id: string;
  name: string;
  currentScore: number;
  voiceAgentScore: number;
  grade: string;
  hasNoIvr?: boolean;
}

interface Props {
  rows: CohortRow[];
  activeId: string;
  onSelect: (id: string) => void;
}

function shortLabel(name: string): string {
  return name.split(',')[0];
}

// CXI = 100 − friction. The ranking page reads in CXI everywhere so it
// matches the KPI tile direction (high=good).
const cxi = (frictionScore: number) =>
  Math.max(0, Math.min(100, 100 - frictionScore));

// CXI-band pill classes — brandClasses already maps high=good.
function cxiBadgeClasses(cxiScore: number) {
  const c = brandClasses(cxiScore);
  return { bg: c.pillBg, text: c.pillText, border: c.pillBorder };
}

export default function CohortComparison({ rows, activeId, onSelect }: Props) {
  // Split universities with no IVR out — they aren't comparable to the
  // friction-scored cohort and would skew the averages downward. They get
  // their own grouped section below the ranked bars.
  const ivrRows = rows.filter((r) => !r.hasNoIvr);
  const noIvrRows = rows.filter((r) => r.hasNoIvr);

  // Sort by CXI ascending (worst lines first). CXI = 100 − friction, so
  // ascending CXI is the same order as descending friction — matches the
  // "lead with the most-broken IVR" pitch flow.
  const sorted = [...ivrRows].sort(
    (a, b) => cxi(a.currentScore) - cxi(b.currentScore)
  );

  // Cohort stats — surfaced in CXI so the summary line direction matches
  // the rows below (high=good, ascending = worst first).
  const avgCxiToday =
    sorted.length > 0
      ? sorted.reduce((s, r) => s + cxi(r.currentScore), 0) / sorted.length
      : 0;
  const avgCxiVoice =
    sorted.length > 0
      ? sorted.reduce((s, r) => s + cxi(r.voiceAgentScore), 0) / sorted.length
      : 0;
  const avgLift = avgCxiVoice - avgCxiToday;
  const activeRow = sorted.find((r) => r.id === activeId);
  const activeRank = activeRow
    ? sorted.findIndex((r) => r.id === activeId) + 1
    : null;

  // CXI lives on a 0-100 scale (high=good). Bar width reads the CXI value
  // directly, so a CXI-10 row shows a tiny bar (lots of room to improve)
  // and a CXI-90 voice-agent overlay nearly fills it (best in class).
  const SCALE = 100;
  const pct = (n: number) => `${Math.max(2, Math.round((n / SCALE) * 100))}%`;

  return (
    <section className="rounded-xl bg-surface border border-line shadow-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[12px] uppercase tracking-[0.2em] text-muted font-semibold">
              Peer benchmark
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-ink mb-2">
            Cohort comparison · {rows.length} tenants audited
          </h2>
          <p className="text-[15px] text-muted leading-snug max-w-2xl">
            {sorted.length} of {rows.length} tenants run an IVR — the
            scored cohort lands consistently in the low-CXI band, with a
            50-70 point lift between today's IVR and a voice agent.{' '}
            {noIvrRows.length > 0 &&
              `The remaining ${noIvrRows.length} route calls straight to a person (or that person's voicemail) — no IVR to score.`}
          </p>
        </div>
        {activeRow && activeRank ? (
          <div className="text-right">
            <div className="text-[12px] uppercase tracking-[0.16em] text-muted font-semibold mb-1.5">
              {shortLabel(activeRow.name)} ranks
            </div>
            <div className="text-4xl font-semibold text-ink tabular-nums leading-none">
              #{activeRank}
              <span className="text-[16px] text-muted ml-1.5 font-normal">
                of {sorted.length}
              </span>
            </div>
          </div>
        ) : (
          (() => {
            const noIvrActive = noIvrRows.find((r) => r.id === activeId);
            if (!noIvrActive) return null;
            return (
              <div className="text-right">
                <div className="text-[12px] uppercase tracking-[0.16em] text-muted font-semibold mb-1.5">
                  {shortLabel(noIvrActive.name)}
                </div>
                <div className="text-[15px] font-semibold text-muted2 leading-none">
                  No IVR — not ranked
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Cohort summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat
          label="Cohort avg CXI today"
          value={Math.round(avgCxiToday)}
          tone="bad"
          suffix="/100"
        />
        <Stat
          label="Cohort avg CXI with voice agent"
          value={Math.round(avgCxiVoice)}
          tone="good"
          suffix="/100"
        />
        <Stat
          label="Avg CXI lift"
          value={Math.round(avgLift)}
          tone="accent"
          prefix="+"
          suffix=" pts"
        />
      </div>

      {/* Ranked bars */}
      <div className="space-y-1.5">
        {/* Scale header */}
        <div className="grid grid-cols-[240px_1fr_80px] gap-4 px-2 pb-2 text-[12px] uppercase tracking-[0.14em] text-muted font-semibold">
          <span>Tenant</span>
          <span>Today CXI (red) → Voice agent CXI (green)</span>
          <span className="text-right">Lift</span>
        </div>

        {sorted.map((r) => {
          const isActive = r.id === activeId;
          const cxiToday = cxi(r.currentScore);
          const cxiVoice = cxi(r.voiceAgentScore);
          const lift = cxiVoice - cxiToday;
          const colors = cxiBadgeClasses(cxiToday);
          // Bar fill bands the row by CXI. Voice-agent overlay almost
          // always lands in the "best" band since projections > 80.
          const todayBar = brandClasses(cxiToday);
          const voiceBar = brandClasses(cxiVoice);

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={
                'w-full grid grid-cols-[240px_1fr_80px] gap-4 items-center px-3 py-2.5 rounded-md text-left transition ' +
                (isActive
                  ? 'bg-accent/10 ring-1 ring-accent/40'
                  : 'hover:bg-bg/60')
              }
            >
              {/* Name */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={
                    'text-[15px] tracking-tight truncate ' +
                    (isActive
                      ? 'font-semibold text-ink'
                      : 'font-medium text-ink2')
                  }
                  title={r.name}
                >
                  {shortLabel(r.name)}
                </span>
                {isActive && (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-accent font-bold shrink-0">
                    you
                  </span>
                )}
              </div>

              {/* Bar */}
              <div className="relative h-9 rounded-md bg-bg/60 border border-line overflow-hidden">
                {/* Voice agent CXI — colored by its own band (almost
                    always green). Drawn first/wider; today's narrower
                    red bar overlays on top so both numbers stay
                    readable. */}
                <div
                  className={`absolute inset-y-0 left-0 ${voiceBar.barFill} flex items-center justify-end pr-2.5`}
                  style={{ width: pct(cxiVoice) }}
                >
                  <span className="text-[13px] font-bold text-white tabular-nums drop-shadow">
                    {cxiVoice}
                  </span>
                </div>
                {/* Today CXI — narrower red wedge at the left. */}
                <div
                  className={`absolute inset-y-0 left-0 ${todayBar.barFill} flex items-center justify-end pr-2`}
                  style={{ width: pct(cxiToday) }}
                >
                  <span className="text-[12px] font-bold text-white tabular-nums drop-shadow">
                    {cxiToday}
                  </span>
                </div>
              </div>

              {/* Lift */}
              <div className="text-right">
                <span
                  className={
                    'text-[14px] font-bold tabular-nums px-2 py-1 rounded border ' +
                    colors.bg +
                    ' ' +
                    colors.text +
                    ' ' +
                    colors.border
                  }
                >
                  +{lift}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {noIvrRows.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2 pl-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted font-semibold">
              Not ranked · No IVR
            </span>
            <span className="text-[11px] text-muted2">
              {noIvrRows.length}{' '}
              {noIvrRows.length === 1 ? 'line goes' : 'lines go'} straight to
              a person (or that person's voicemail)
            </span>
          </div>
          <div className="space-y-1.5">
            {noIvrRows.map((r) => {
              const isActive = r.id === activeId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelect(r.id)}
                  className={
                    'w-full grid grid-cols-[240px_1fr_80px] gap-4 items-center px-3 py-2.5 rounded-md text-left transition ' +
                    (isActive
                      ? 'bg-accent/10 ring-1 ring-accent/40'
                      : 'hover:bg-bg/60')
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={
                        'text-[15px] tracking-tight truncate ' +
                        (isActive
                          ? 'font-semibold text-ink'
                          : 'font-medium text-ink2')
                      }
                      title={r.name}
                    >
                      {shortLabel(r.name)}
                    </span>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-accent font-bold shrink-0">
                        you
                      </span>
                    )}
                  </div>
                  <div className="h-9 rounded-md bg-bg/40 border border-dashed border-line flex items-center px-3 text-[12.5px] text-muted2">
                    No IVR detected — calls connect directly to a person
                    (voicemail when unavailable)
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-surface text-muted2 border-line2">
                      No IVR
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-line text-[13px] text-muted flex items-center justify-between flex-wrap gap-2">
        <span>
          Click any row to open that tenant's full report.
        </span>
        <span className="tabular-nums">
          sorted by CXI · ascending (worst first)
        </span>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'accent';
  prefix?: string;
  suffix?: string;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-good2'
      : tone === 'bad'
      ? 'text-bad2'
      : 'text-accent';
  return (
    <div className="rounded-lg bg-bg/60 border border-line p-4">
      <div className="text-[12px] uppercase tracking-[0.16em] text-muted font-semibold mb-2">
        {label}
      </div>
      <div className={'text-4xl font-semibold tracking-tight tabular-nums leading-none ' + toneClass}>
        {prefix}
        {value}
        <span className="text-[14px] text-muted font-normal ml-1">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// Helper used by App.tsx to derive cohort rows from the full universities list.
export function deriveCohortRows(
  universities: { id: string; name: string }[],
  getFriction: (id: string) => { current: FrictionResult; voiceAgent: FrictionResult } | null
): CohortRow[] {
  const rows: CohortRow[] = [];
  for (const u of universities) {
    const f = getFriction(u.id);
    if (!f) continue;
    rows.push({
      id: u.id,
      name: u.name,
      currentScore: f.current.totalScore,
      voiceAgentScore: f.voiceAgent.totalScore,
      grade: f.current.grade,
    });
  }
  return rows;
}
