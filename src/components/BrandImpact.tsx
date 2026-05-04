import type { BrandIndex } from '../lib/brand';
import { TrendingUp, Shield } from './Icons';

interface Props {
  university: string;
  current: BrandIndex;
  recommended: BrandIndex;
  voiceAgent: BrandIndex;
  currentNarrative: string;
  recommendedNarrative: string;
  voiceAgentNarrative: string;
}

type Tone = 'now' | 'after' | 'best';

function Card({
  title,
  index,
  narrative,
  tone,
  tagline,
}: {
  title: string;
  index: BrandIndex;
  narrative: string;
  tone: Tone;
  tagline: string[];
}) {
  const cardCls =
    tone === 'now'
      ? 'bg-surface border-line'
      : tone === 'after'
        ? 'bg-gradient-to-br from-accent/5 via-surface to-surface border-accent/30'
        : 'bg-gradient-to-br from-good/8 via-surface to-surface border-good/40';
  const labelCls = tone === 'now' ? 'text-muted' : tone === 'after' ? 'text-accent' : 'text-good';
  const badgeCls =
    tone === 'now'
      ? 'border-bad/35 text-bad bg-bad/10'
      : tone === 'after'
        ? 'border-accent/35 text-accent bg-accent/10'
        : 'border-good/35 text-good bg-good/10';
  const tagCls =
    tone === 'now'
      ? 'bg-bad/10 text-bad border-bad/35'
      : tone === 'after'
        ? 'bg-accent/10 text-accent border-accent/35'
        : 'bg-good/10 text-good border-good/35';

  return (
    <div className={`rounded-2xl p-5 relative overflow-hidden shadow-card border ${cardCls}`}>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${labelCls}`}
          >
            {title}
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${badgeCls}`}
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
          {tagline.map((p) => (
            <span
              key={p}
              className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-semibold border ${tagCls}`}
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
  const delta = voiceAgent.score - current.score;
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
            does to them. Three stages: today, optimized IVR, full voice
            agent.
          </p>
          {/* spacing kept tight; copy intentionally avoids dashes */}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-good/10 border border-good/25 text-good">
          <TrendingUp size={13} />
          <span className="text-xs font-semibold tabular-nums">+{delta} pts</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title={`${university} today`}
          index={current}
          narrative={currentNarrative}
          tone="now"
          tagline={['Bureaucratic', 'Hard to reach', 'Indifferent']}
        />
        <Card
          title={`Optimized IVR`}
          index={recommended}
          narrative={recommendedNarrative}
          tone="after"
          tagline={['Fast', '24/7', 'No dead ends']}
        />
        <Card
          title={`Voice agent`}
          index={voiceAgent}
          narrative={voiceAgentNarrative}
          tone="best"
          tagline={['Conversational', 'Multilingual', 'Self service']}
        />
      </div>
    </section>
  );
}
