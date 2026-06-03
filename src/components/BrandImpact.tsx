import type { BrandIndex } from '../lib/brand';
import { TrendingUp, Shield } from './Icons';
import { brandClasses } from '../lib/scoreColor';
import { SHOW_OPTIMIZED_IVR } from '../lib/config';

interface Props {
  university: string;
  current: BrandIndex;
  recommended: BrandIndex;
  voiceAgent: BrandIndex;
  currentNarrative: string;
  recommendedNarrative: string;
  voiceAgentNarrative: string;
}

function Card({
  title,
  index,
  narrative,
  tagline,
}: {
  title: string;
  index: BrandIndex;
  narrative: string;
  tagline: string[];
}) {
  // Brand Reputation is high-is-good, so brandBand maps it directly:
  // 80+ green, 60-79 blue, 40-59 yellow, 20-39 pink, <20 red.
  const c = brandClasses(index.score);

  return (
    <div
      className={`rounded-2xl p-5 relative overflow-hidden shadow-card border bg-surface ${c.cellBorder}`}
    >
      {/* Soft tint band along the top edge so the card reads as colored
          without overwhelming the body copy. */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${c.barFill}`}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${c.cellText}`}
          >
            {title}
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${c.pillBg} ${c.pillText} ${c.pillBorder}`}
          >
            {index.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span
            className={`text-5xl font-bold tabular-nums tracking-tight ${c.cellText}`}
          >
            {index.score}
          </span>
          <span className="text-xs text-muted2">/100</span>
        </div>

        <p className="text-[12.5px] leading-relaxed mb-4 text-ink2">{narrative}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {tagline.map((p) => (
            <span
              key={p}
              className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-semibold border ${c.pillBg} ${c.pillText} ${c.pillBorder}`}
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
  voiceAgent,
  currentNarrative,
  recommendedNarrative,
  voiceAgentNarrative,
}: Props) {
  // High = better, so the "win" is voice minus current (positive = reputation
  // gained). If the voice tree somehow scored worse, format with a "−N"
  // prefix so the negative case doesn't render as the malformed "+-N pts".
  const delta = voiceAgent.score - current.score;
  const deltaLabel = delta >= 0 ? `+${delta} pts` : `−${Math.abs(delta)} pts`;
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
            does to them. {SHOW_OPTIMIZED_IVR ? 'Three stages: today, optimized IVR, full voice agent.' : 'Two stages: today and full voice agent.'}{' '}
            Higher is better.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-good/10 border border-good/25 text-good">
          <TrendingUp size={13} />
          <span className="text-xs font-semibold tabular-nums">{deltaLabel}</span>
        </div>
      </div>
      <div
        className={
          'grid grid-cols-1 gap-4 ' +
          (SHOW_OPTIMIZED_IVR ? 'lg:grid-cols-3' : 'lg:grid-cols-2')
        }
      >
        <Card
          title={`${university} today`}
          index={current}
          narrative={currentNarrative}
          tagline={['Bureaucratic', 'Hard to reach', 'Indifferent']}
        />
        {SHOW_OPTIMIZED_IVR && (
          <Card
            title={`Optimized IVR`}
            index={recommended}
            narrative={recommendedNarrative}
            tagline={['Fast', '24/7', 'No dead ends']}
          />
        )}
        <Card
          title={`Voice agent`}
          index={voiceAgent}
          narrative={voiceAgentNarrative}
          tagline={['Conversational', 'Multilingual', 'Self service']}
        />
      </div>
    </section>
  );
}
