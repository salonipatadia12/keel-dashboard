import { Zap } from './Icons';
import { fmtUsdPerCall, fmtUsdAnnual } from '../lib/cost';

interface Props {
  university: string;
  currentScore: number;
  voiceAgentScore: number;
  // Voice-agent self-service coverage as a 0-1 fraction. We surface the
  // percentage in the pitch sentence so "around X% of inquiries handled"
  // tracks the same number the Question Coverage / Always-Available tile
  // shows above.
  voiceCoverage: number;
  // When true, the standard "your IVR's CXI is X" template is wrong —
  // there's no IVR to score. We swap to a cost-led sentence that quotes
  // the dollars-per-call gap and projected annual savings.
  hasNoIvr: boolean;
  // Cost numbers computed once in App.tsx (same source the CostStrip
  // shows) so the dollar figures in the pitch always match the strip
  // above it.
  todayCostPerCall: number;
  voiceCostPerCall: number;
  annualSavings: number;
}

export default function Pitch({
  university,
  currentScore,
  voiceAgentScore,
  voiceCoverage,
  hasNoIvr,
  todayCostPerCall,
  voiceCostPerCall,
  annualSavings,
}: Props) {
  // CXI = 100 − Friction. The pitch reads in CXI throughout to match the
  // KPI tile direction (high=good). The "points of friction removed"
  // phrasing in the trailing clause is the same delta, just spoken in
  // the older friction frame because that's how the client wrote it.
  const cxiToday = Math.max(0, Math.min(100, 100 - currentScore));
  const cxiVoice = Math.max(0, Math.min(100, 100 - voiceAgentScore));
  const cxiLift = cxiVoice - cxiToday;
  const coveragePct = Math.round((voiceCoverage ?? 0) * 100);
  return (
    <section className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden relative">
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-band_green/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative p-7">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
            <Zap size={14} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">
            The pitch
          </span>
        </div>
        {hasNoIvr ? (
          <p className="text-xl text-ink leading-relaxed font-medium tracking-tight max-w-4xl">
            {university} routes every call to a live person — there's no
            IVR menu, no self-service, and no after-hours coverage.
            Callers wait for a free agent and the agent looks up the
            answer themselves. That works out to roughly{' '}
            <span className="bg-bad/10 text-bad border border-bad/30 px-2 py-0.5 rounded-md font-semibold">
              {fmtUsdPerCall(todayCostPerCall)} per call
            </span>{' '}
            in front-desk labor. A Conversational AI Voice Agent
            (natural language, multilingual, 24/7) answers in under two
            seconds, self-serves around {coveragePct} percent of
            inquiries, and costs{' '}
            <span className="bg-good/10 text-good border border-good/30 px-2 py-0.5 rounded-md font-semibold">
              {fmtUsdPerCall(voiceCostPerCall)} per call
            </span>
            . At your current volume that's{' '}
            <span className="bg-good/10 text-good border border-good/30 px-2 py-0.5 rounded-md font-semibold">
              {fmtUsdAnnual(annualSavings)} saved per year
            </span>{' '}
            — and your staff stops being the only path to an answer.
          </p>
        ) : (
          <p className="text-xl text-ink leading-relaxed font-medium tracking-tight max-w-4xl">
            {university}'s IVR reflects a{' '}
            <span className="bg-bad/10 text-bad border border-bad/30 px-2 py-0.5 rounded-md font-semibold">
              low CXI score of {cxiToday}
            </span>{' '}
            today. A Conversational AI Voice Agent (natural language,
            multilingual, self-service for around {coveragePct} percent
            of inquiries) increases that to{' '}
            <span className="bg-good/10 text-good border border-good/30 px-2 py-0.5 rounded-md font-semibold">
              {cxiVoice}
            </span>
            . That's{' '}
            <span className="bg-good/10 text-good border border-good/30 px-2 py-0.5 rounded-md font-semibold">
              {cxiLift} points
            </span>{' '}
            of friction removed for every caller — including evenings,
            weekends, and non-English callers — letting them reach the
            right answer in under two minutes in most cases.
          </p>
        )}
      </div>
    </section>
  );
}
