import type { BrandIndex } from '../lib/brand';
import { TrendingUp, Shield } from './Icons';

interface Props {
  university: string;
  current: BrandIndex;
  recommended: BrandIndex;
  currentNarrative: string;
  recommendedNarrative: string;
}

function Card({
  title,
  index,
  narrative,
  tone,
}: {
  title: string;
  index: BrandIndex;
  narrative: string;
  tone: 'now' | 'after';
}) {
  const isAfter = tone === 'after';
  const tags = isAfter
    ? ['Modern', 'Responsive', 'Caller-first']
    : ['Bureaucratic', 'Hard to reach', 'Indifferent'];

  return (
    <div
      className={`rounded-2xl p-5 relative overflow-hidden shadow-card border ${
        isAfter ? 'bg-gradient-to-br from-good/5 via-surface to-surface border-good/30' : 'bg-surface border-line'
      }`}
    >
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${
              isAfter ? 'text-good' : 'text-muted'
            }`}
          >
            {title}
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${
              isAfter
                ? 'border-good/35 text-good bg-good/10'
                : 'border-bad/35 text-bad bg-bad/10'
            }`}
          >
            {index.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-ink">
            {index.score}
          </span>
          <span className="text-xs text-muted2">/100</span>
        </div>

        <p className="text-[12.5px] leading-relaxed mb-4 text-ink2">{narrative}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map((p) => (
            <span
              key={p}
              className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-semibold border ${
                isAfter
                  ? 'bg-good/10 text-good border-good/35'
                  : 'bg-bad/10 text-bad border-bad/35'
              }`}
            >
              {p}
            </span>
          ))}
        </div>

        <details className="group">
          <summary className="text-[10px] text-muted hover:text-ink2 cursor-pointer list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
            <span>How {index.score} is calculated</span>
          </summary>
          <pre className="mt-2 text-[10px] text-muted2 font-mono leading-snug bg-surface2/70 border border-line/70 rounded p-2.5 whitespace-pre-wrap">
            {index.breakdown.formula}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function BrandImpact({
  university,
  current,
  recommended,
  currentNarrative,
  recommendedNarrative,
}: Props) {
  const delta = recommended.score - current.score;
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-md bg-surface border border-line flex items-center justify-center text-accent">
          <Shield size={14} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">Brand impact</h2>
          <p className="text-[11px] text-muted leading-snug">
            How callers perceive {university} based on what their phone tree
            does to them. Click "How it's calculated" to see the math.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-good/10 border border-good/25 text-good">
          <TrendingUp size={13} />
          <span className="text-xs font-semibold tabular-nums">+{delta} pts</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={`${university} today`}
          index={current}
          narrative={currentNarrative}
          tone="now"
        />
        <Card
          title={`${university} with Keel`}
          index={recommended}
          narrative={recommendedNarrative}
          tone="after"
        />
      </div>
    </section>
  );
}
