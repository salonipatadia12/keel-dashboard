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
      className={`rounded-2xl p-5 relative overflow-hidden ${
        isAfter
          ? 'bg-gradient-to-br from-good/15 via-surface to-surface border border-good/25'
          : 'bg-surface border border-line'
      } shadow-card`}
    >
      {isAfter && (
        <div className="absolute top-0 right-0 w-40 h-40 bg-good/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}
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
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              isAfter
                ? 'border-good/30 text-good bg-good/10'
                : 'border-bad/30 text-bad bg-bad/10'
            }`}
          >
            {index.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span
            className={`text-5xl font-semibold tabular-nums tracking-tight ${
              isAfter ? 'text-ink' : 'text-ink2'
            }`}
          >
            {index.score}
          </span>
          <span className="text-xs text-muted2">/100</span>
        </div>

        <p
          className={`text-[12.5px] leading-relaxed mb-4 ${
            isAfter ? 'text-ink2' : 'text-muted'
          }`}
        >
          {narrative}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((p) => (
            <span
              key={p}
              className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-semibold border ${
                isAfter
                  ? 'bg-good/15 text-good border-good/30'
                  : 'bg-bad/10 text-bad border-bad/30'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
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
          <h2 className="text-base font-semibold tracking-tight">Brand impact</h2>
          <p className="text-[11px] text-muted leading-snug">
            How callers perceive {university} based on what their phone tree
            does to them.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-good/10 border border-good/20 text-good">
          <TrendingUp size={13} />
          <span className="text-xs font-semibold tabular-nums">+{delta} pts</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
