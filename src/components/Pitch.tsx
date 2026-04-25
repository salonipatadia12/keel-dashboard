import { Zap } from './Icons';

interface Props {
  university: string;
  currentScore: number;
  recommendedScore: number;
}

export default function Pitch({
  university,
  currentScore,
  recommendedScore,
}: Props) {
  const drop = currentScore - recommendedScore;
  return (
    <section className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden relative">
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-sub/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative p-7">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
            <Zap size={14} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">
            The pitch
          </span>
        </div>
        <p className="text-xl text-ink leading-relaxed font-medium tracking-tight max-w-4xl">
          {university}'s callers are walking into a{' '}
          <span className="bg-bad/10 text-bad border border-bad/30 px-2 py-0.5 rounded-md font-semibold">
            {currentScore}-point friction wall
          </span>{' '}
          today. Keel replaces the menu tree with a voice agent that drops
          friction by{' '}
          <span className="bg-good/10 text-good border border-good/30 px-2 py-0.5 rounded-md font-semibold">
            {drop} points
          </span>
          , erases every dead-end, and gets every caller to the right person —
          or the right answer — in two key presses or fewer.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button className="text-sm text-white bg-gradient-to-r from-accent to-sub hover:opacity-90 rounded-lg px-5 py-2.5 transition font-semibold shadow-glow">
            Book a 15-min walkthrough
          </button>
          <button className="text-sm text-ink2 hover:text-ink bg-surface2 hover:bg-surface3 border border-line rounded-lg px-5 py-2.5 transition font-medium">
            Download as PDF
          </button>
        </div>
      </div>
    </section>
  );
}
