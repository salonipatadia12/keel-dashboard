import type { FrictionResult } from '../lib/types';
import { TrendingDown } from './Icons';

interface Props {
  university: string;
  current: FrictionResult;
  recommended: FrictionResult;
}

function ScoreRing({
  value,
  color,
  label,
  size = 132,
}: {
  value: number;
  color: string;
  label: string;
  size?: number;
}) {
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#22222e"
          strokeWidth={9}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight tabular-nums leading-none">
          {value}
        </div>
        <div
          className="text-[10px] uppercase tracking-[0.16em] mt-1.5 font-semibold"
          style={{ color }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export default function HeroScore({ university, current, recommended }: Props) {
  const drop = current.totalScore - recommended.totalScore;
  const dropPct = Math.round((drop / Math.max(current.totalScore, 1)) * 100);

  const colorCurrent =
    current.grade === 'Excellent'
      ? '#10b981'
      : current.grade === 'Good'
      ? '#fbbf24'
      : current.grade === 'Fair'
      ? '#f59e0b'
      : '#f43f5e';
  const colorRec = '#10b981';

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-surface2 border border-line shadow-card">
      <div className="absolute inset-0 bg-mesh-dark pointer-events-none" />
      <div className="relative grid grid-cols-12 gap-6 p-7">
        <div className="col-span-7 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
              IVR Friction Score
            </span>
            <span className="text-[9px] uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded px-1.5 py-0.5">
              transformation
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1 leading-tight">
            {university.split(',')[0]} can move from{' '}
            <span style={{ color: colorCurrent }}>{current.grade.toLowerCase()}</span> to{' '}
            <span style={{ color: colorRec }}>excellent</span> in one cutover.
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Friction is the composite cost callers pay to reach a person — depth,
            options, dead-ends, time. Lower is better. Keel's voice agent
            replaces the menu tree and changes the math.
          </p>

          <div className="mt-auto pt-6 flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-good/10 border border-good/20 text-good">
              <TrendingDown size={13} />
              <span className="text-xs font-semibold tabular-nums">
                −{drop} pts ({dropPct}%)
              </span>
            </div>
            <span className="text-[11px] text-muted">
              ·{' '}
              {current.maxDepth - recommended.maxDepth > 0
                ? `${current.maxDepth - recommended.maxDepth} fewer levels`
                : 'same depth'}
            </span>
            <span className="text-[11px] text-muted">·</span>
            <span className="text-[11px] text-muted">
              {current.deadEndCount} dead-ends → 0
            </span>
          </div>
        </div>

        <div className="col-span-5 flex items-center justify-end gap-7 pr-2">
          <div className="text-center">
            <ScoreRing
              value={current.totalScore}
              color={colorCurrent}
              label={current.grade}
            />
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted2 mt-3">
              Today
            </div>
          </div>
          <div className="flex flex-col items-center">
            <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
              <path
                d="M2 7h32m-6-5l6 5-6 5"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[9px] uppercase tracking-wider text-accent mt-1.5">
              with Keel
            </span>
          </div>
          <div className="text-center">
            <ScoreRing
              value={recommended.totalScore}
              color={colorRec}
              label={recommended.grade}
            />
            <div className="text-[10px] uppercase tracking-[0.14em] text-good mt-3">
              Projected
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
