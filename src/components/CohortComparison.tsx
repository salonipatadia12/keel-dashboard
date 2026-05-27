import type { FrictionResult } from '../lib/types';

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

function gradeColors(grade: string): { bg: string; text: string; border: string } {
  const g = grade.toLowerCase();
  if (g === 'poor') return { bg: 'bg-bad/15', text: 'text-bad2', border: 'border-bad/30' };
  if (g === 'fair') return { bg: 'bg-warn/15', text: 'text-warn2', border: 'border-warn/30' };
  if (g === 'good') return { bg: 'bg-good/15', text: 'text-good2', border: 'border-good/30' };
  if (g === 'excellent') return { bg: 'bg-good/20', text: 'text-good2', border: 'border-good/40' };
  return { bg: 'bg-surface', text: 'text-muted', border: 'border-line' };
}

export default function CohortComparison({ rows, activeId, onSelect }: Props) {
  // Split universities with no IVR out — they aren't comparable to the
  // friction-scored cohort and would skew the averages downward. They get
  // their own grouped section below the ranked bars.
  const ivrRows = rows.filter((r) => !r.hasNoIvr);
  const noIvrRows = rows.filter((r) => r.hasNoIvr);

  // Sort by current friction descending (worst first — matches pitch narrative).
  const sorted = [...ivrRows].sort((a, b) => b.currentScore - a.currentScore);

  // Cohort stats for the summary line. Computed across the scored cohort
  // only so a uni with no IVR doesn't pull the averages down with a
  // calculated-from-empty-tree score.
  const avgCurrent =
    sorted.length > 0
      ? sorted.reduce((s, r) => s + r.currentScore, 0) / sorted.length
      : 0;
  const avgVoice =
    sorted.length > 0
      ? sorted.reduce((s, r) => s + r.voiceAgentScore, 0) / sorted.length
      : 0;
  const avgDrop = avgCurrent - avgVoice;
  const activeRow = sorted.find((r) => r.id === activeId);
  const activeRank = activeRow
    ? sorted.findIndex((r) => r.id === activeId) + 1
    : null;

  // The bar treats friction as a 0-100 scale where higher = worse, so the
  // current bar takes up most of the row and the voice-agent bar is a thin
  // green wedge at the left — visually reinforcing the gap.
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
            Cohort comparison · {rows.length} universities audited
          </h2>
          <p className="text-[15px] text-muted leading-snug max-w-2xl">
            {sorted.length} of {rows.length} universities run an IVR — the
            scored cohort lands consistently in the friction-heavy band, with
            a 50-70 point gap between today's IVR and a voice agent.{' '}
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
          label="Cohort avg today"
          value={Math.round(avgCurrent)}
          tone="bad"
          suffix="/100"
        />
        <Stat
          label="Cohort avg with voice agent"
          value={Math.round(avgVoice)}
          tone="good"
          suffix="/100"
        />
        <Stat
          label="Avg friction removed"
          value={Math.round(avgDrop)}
          tone="accent"
          prefix="−"
          suffix=" pts"
        />
      </div>

      {/* Ranked bars */}
      <div className="space-y-1.5">
        {/* Scale header */}
        <div className="grid grid-cols-[240px_1fr_80px] gap-4 px-2 pb-2 text-[12px] uppercase tracking-[0.14em] text-muted font-semibold">
          <span>University</span>
          <span>Today (red) → Voice agent (green)</span>
          <span className="text-right">Drop</span>
        </div>

        {sorted.map((r) => {
          const isActive = r.id === activeId;
          const drop = r.currentScore - r.voiceAgentScore;
          const colors = gradeColors(r.grade);

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
                {/* Current friction (red) */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-bad to-bad2/80 flex items-center justify-end pr-2.5"
                  style={{ width: pct(r.currentScore) }}
                >
                  <span className="text-[13px] font-bold text-white tabular-nums drop-shadow">
                    {r.currentScore}
                  </span>
                </div>
                {/* Voice agent friction (green) — overlaid at left */}
                <div
                  className="absolute inset-y-0 left-0 bg-good flex items-center justify-end pr-2 border-r border-good2"
                  style={{ width: pct(r.voiceAgentScore) }}
                >
                  <span className="text-[12px] font-bold text-white tabular-nums drop-shadow">
                    {r.voiceAgentScore}
                  </span>
                </div>
              </div>

              {/* Drop */}
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
                  −{drop}
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
          Click any row to open that university's full report.
        </span>
        <span className="tabular-nums">
          sorted by today's friction · highest first
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
