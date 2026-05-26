import type { FrictionResult } from '../lib/types';

export interface CohortRow {
  id: string;
  name: string;
  currentScore: number;
  voiceAgentScore: number;
  grade: string;
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
  // Sort by current friction descending (worst first — matches pitch narrative).
  const sorted = [...rows].sort((a, b) => b.currentScore - a.currentScore);

  // Cohort stats for the summary line.
  const avgCurrent = sorted.reduce((s, r) => s + r.currentScore, 0) / sorted.length;
  const avgVoice = sorted.reduce((s, r) => s + r.voiceAgentScore, 0) / sorted.length;
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
            Every university we have audited lands in the friction-heavy band.
            The gap between today's IVR and a voice agent is consistently
            50-70 points — the problem and the fix are the same shape across
            the cohort.
          </p>
        </div>
        {activeRow && activeRank && (
          <div className="text-right">
            <div className="text-[12px] uppercase tracking-[0.16em] text-muted font-semibold mb-1.5">
              {shortLabel(activeRow.name)} ranks
            </div>
            <div className="text-4xl font-semibold text-ink tabular-nums leading-none">
              #{activeRank}
              <span className="text-[16px] text-muted ml-1.5 font-normal">
                of {rows.length}
              </span>
            </div>
          </div>
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
