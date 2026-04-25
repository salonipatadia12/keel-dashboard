import KpiTile from './KpiTile';
import type { FrictionResult, Reference } from '../lib/types';
import type { BrandIndex } from '../lib/brand';
import { Activity, Layers, Globe, Phone, Sparkles } from './Icons';

interface Props {
  current: FrictionResult;
  recommended: FrictionResult;
  webRefs: Reference[];
  phoneRefs: Reference[];
  brandCurrent: BrandIndex;
  brandRecommended: BrandIndex;
  brandFormula: string;
}

export default function MetricCards({
  current,
  recommended,
  webRefs,
  phoneRefs,
  brandCurrent,
  brandRecommended,
  brandFormula,
}: Props) {
  const frictionDelta = current.totalScore - recommended.totalScore;
  const levelsDelta = current.maxDepth - recommended.maxDepth;
  const brandDelta = brandRecommended.score - brandCurrent.score;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <KpiTile
        icon={<Activity size={14} />}
        label="Friction Score"
        todayValue={current.totalScore}
        todayCaption={current.grade}
        futureValue={recommended.totalScore}
        futureCaption={recommended.grade}
        delta={{ value: `−${frictionDelta} pts`, tone: 'good' }}
        emphasis
      />
      <KpiTile
        icon={<Layers size={14} />}
        label="Menu Levels"
        todayValue={current.maxDepth}
        todayCaption="levels deep"
        futureValue={recommended.maxDepth}
        futureCaption={`${recommended.maxDepth} or fewer`}
        delta={{
          value: levelsDelta > 0 ? `−${levelsDelta}` : '—',
          tone: levelsDelta > 0 ? 'good' : 'neutral',
        }}
      />
      <KpiTile
        icon={<Globe size={14} />}
        label="Web Redirects"
        todayValue={webRefs.length}
        todayCaption="links spoken to caller"
        futureValue={0}
        futureCaption="no offload"
        delta={{
          value: webRefs.length > 0 ? `−${webRefs.length}` : '—',
          tone: webRefs.length > 0 ? 'good' : 'neutral',
        }}
        refs={webRefs}
      />
      <KpiTile
        icon={<Phone size={14} />}
        label="Phone Transfers"
        todayValue={phoneRefs.length}
        todayCaption="numbers given mid-call"
        futureValue={0}
        futureCaption="no offload"
        delta={{
          value: phoneRefs.length > 0 ? `−${phoneRefs.length}` : '—',
          tone: phoneRefs.length > 0 ? 'good' : 'neutral',
        }}
        refs={phoneRefs}
      />
      <KpiTile
        icon={<Sparkles size={14} />}
        label="Brand Reputation"
        todayValue={brandCurrent.score}
        todayCaption={brandCurrent.label}
        futureValue={brandRecommended.score}
        futureCaption={brandRecommended.label}
        delta={{ value: `+${brandDelta} pts`, tone: 'good' }}
        emphasis
        formula={brandFormula}
      />
    </div>
  );
}
