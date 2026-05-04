import KpiTile from './KpiTile';
import type { FrictionResult, Reference } from '../lib/types';
import type { BrandIndex } from '../lib/brand';
import { TYPICAL_STUDENT_QUESTIONS } from '../lib/friction';
import { Activity, Layers, Globe, Phone, Sparkles, HelpCircle } from './Icons';

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return 'n/a';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  current: FrictionResult;
  recommended: FrictionResult;
  voiceAgent: FrictionResult;
  webRefs: Reference[];
  phoneRefs: Reference[];
  brandCurrent: BrandIndex;
  brandRecommended: BrandIndex;
  brandVoice: BrandIndex;
  brandFormula: string;
  todayQuestionsCovered: number;
}

export default function MetricCards({
  current,
  recommended,
  voiceAgent,
  webRefs,
  phoneRefs,
  brandCurrent,
  brandRecommended,
  brandVoice,
  brandFormula,
  todayQuestionsCovered,
}: Props) {
  const Q = TYPICAL_STUDENT_QUESTIONS.length;
  const ivrCovered = Math.round(recommended.selfServiceCoverage * Q);
  const voiceCovered = Math.round(voiceAgent.selfServiceCoverage * Q);

  const frictionDelta = current.totalScore - voiceAgent.totalScore;
  const brandDelta = brandVoice.score - brandCurrent.score;
  const coverageDelta = voiceCovered - todayQuestionsCovered;

  const coverageFormula =
    `Coverage = student questions answered without a human / ${Q} typical questions tracked\n\n` +
    'Tracked questions:\n' +
    TYPICAL_STUDENT_QUESTIONS.map((q, i) => `  ${i + 1}. ${q}`).join('\n');

  // Wait Time tile values
  const todayWait = current.avgDurationSec ?? 0;
  const ivrWait = recommended.avgDurationSec ?? 0;
  const voiceWait = voiceAgent.avgDurationSec ?? 0;
  const waitDelta = Math.max(0, todayWait - voiceWait);

  // Today caption depends on the failure mode: queueOnly = pure hold,
  // otherwise the time is split between menu listening and transfer wait.
  const todayWaitCaption = current.queueOnly
    ? '100% on hold'
    : todayWait >= 60
      ? 'on hold plus menu nav'
      : 'on the line';

  return (
    <div className="space-y-3">
      {/* Hero row, the four numbers the pitch lives on */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<Activity size={14} />}
          label="Friction Score"
          today={{ value: current.totalScore, caption: current.grade }}
          ivr={{ value: recommended.totalScore, caption: recommended.grade }}
          voice={{ value: voiceAgent.totalScore, caption: voiceAgent.grade }}
          delta={{ value: `down ${frictionDelta} pts`, tone: 'good' }}
          emphasis
        />
        <KpiTile
          icon={<HelpCircle size={14} />}
          label="Question Coverage"
          today={{
            value: `${todayQuestionsCovered} of ${Q}`,
            caption: todayQuestionsCovered === 0 ? 'all need human' : 'partial',
          }}
          ivr={{
            value: `${ivrCovered} of ${Q}`,
            caption: 'FAQ leaf',
          }}
          voice={{
            value: `${voiceCovered} of ${Q}`,
            caption: 'AI self resolves',
          }}
          delta={{ value: `up ${coverageDelta} answered`, tone: 'good' }}
          emphasis
          formula={coverageFormula}
        />
        <KpiTile
          icon={<Phone size={14} />}
          label="Wait Time"
          today={{ value: fmtDuration(todayWait), caption: todayWaitCaption }}
          ivr={{ value: fmtDuration(ivrWait), caption: 'menu plus route' }}
          voice={{ value: fmtDuration(voiceWait), caption: 'instant intent' }}
          delta={{ value: `${fmtDuration(waitDelta)} saved`, tone: 'good' }}
          emphasis
        />
        <KpiTile
          icon={<Sparkles size={14} />}
          label="Brand Reputation"
          today={{ value: brandCurrent.score, caption: brandCurrent.label }}
          ivr={{ value: brandRecommended.score, caption: brandRecommended.label }}
          voice={{ value: brandVoice.score, caption: brandVoice.label }}
          delta={{ value: `up ${brandDelta} pts`, tone: 'good' }}
          emphasis
          formula={brandFormula}
        />
      </div>

      {/* Secondary row, structural metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiTile
          icon={<Layers size={14} />}
          label="Menu Levels"
          today={{ value: current.maxDepth, caption: 'levels deep' }}
          ivr={{ value: recommended.maxDepth, caption: 'flat menu' }}
          voice={{ value: voiceAgent.maxDepth, caption: 'no menu' }}
          delta={{
            value: `down ${current.maxDepth - voiceAgent.maxDepth}`,
            tone: 'good',
          }}
        />
        <KpiTile
          icon={<Globe size={14} />}
          label="Web Redirects"
          today={{ value: webRefs.length, caption: 'links spoken' }}
          ivr={{ value: 0, caption: 'no offload' }}
          voice={{ value: 0, caption: 'no offload' }}
          delta={{
            value: webRefs.length > 0 ? `down ${webRefs.length}` : 'none',
            tone: webRefs.length > 0 ? 'good' : 'neutral',
          }}
          refs={webRefs}
        />
        <KpiTile
          icon={<Phone size={14} />}
          label="Phone Transfers"
          today={{ value: phoneRefs.length, caption: 'numbers given' }}
          ivr={{ value: 0, caption: 'no offload' }}
          voice={{ value: 0, caption: 'no offload' }}
          delta={{
            value: phoneRefs.length > 0 ? `down ${phoneRefs.length}` : 'none',
            tone: phoneRefs.length > 0 ? 'good' : 'neutral',
          }}
          refs={phoneRefs}
        />
      </div>
    </div>
  );
}
