import KpiTile from './KpiTile';
import type { FrictionResult, Reference } from '../lib/types';
import type { BrandIndex } from '../lib/brand';
import { Activity, Layers, Globe, Phone, Sparkles } from './Icons';

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
}: Props) {
  const frictionDelta = current.totalScore - voiceAgent.totalScore;
  const brandDelta = brandVoice.score - brandCurrent.score;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiTile
        icon={<Activity size={14} />}
        label="Friction Score"
        today={{ value: current.totalScore, caption: current.grade }}
        ivr={{ value: recommended.totalScore, caption: recommended.grade }}
        voice={{ value: voiceAgent.totalScore, caption: voiceAgent.grade }}
        delta={{ value: `−${frictionDelta} pts`, tone: 'good' }}
        emphasis
      />
      <KpiTile
        icon={<Layers size={14} />}
        label="Menu Levels"
        today={{ value: current.maxDepth, caption: 'levels deep' }}
        ivr={{ value: recommended.maxDepth, caption: 'flat menu' }}
        voice={{ value: voiceAgent.maxDepth, caption: 'no menu — speak' }}
        delta={{
          value: `−${current.maxDepth - voiceAgent.maxDepth}`,
          tone: 'good',
        }}
      />
      <KpiTile
        icon={<Globe size={14} />}
        label="Web Redirects"
        today={{ value: webRefs.length, caption: 'links spoken to caller' }}
        ivr={{ value: 0, caption: 'no offload' }}
        voice={{ value: 0, caption: 'resolved in-call' }}
        delta={{
          value: webRefs.length > 0 ? `−${webRefs.length}` : '—',
          tone: webRefs.length > 0 ? 'good' : 'neutral',
        }}
        refs={webRefs}
      />
      <KpiTile
        icon={<Phone size={14} />}
        label="Phone Transfers"
        today={{ value: phoneRefs.length, caption: 'numbers given mid-call' }}
        ivr={{ value: 0, caption: 'no offload' }}
        voice={{ value: 0, caption: 'no offload' }}
        delta={{
          value: phoneRefs.length > 0 ? `−${phoneRefs.length}` : '—',
          tone: phoneRefs.length > 0 ? 'good' : 'neutral',
        }}
        refs={phoneRefs}
      />
      <KpiTile
        icon={<Sparkles size={14} />}
        label="Brand Reputation"
        today={{ value: brandCurrent.score, caption: brandCurrent.label }}
        ivr={{ value: brandRecommended.score, caption: brandRecommended.label }}
        voice={{ value: brandVoice.score, caption: brandVoice.label }}
        delta={{ value: `+${brandDelta} pts`, tone: 'good' }}
        emphasis
        formula={brandFormula}
      />
    </div>
  );
}
