import { useMemo } from 'react';
import raw from './data.json';
import type { RawData } from './lib/types';
import { buildPathTree } from './lib/pathTree';
import { calculateFriction } from './lib/friction';
import { buildRecommendedTree } from './lib/recommend';
import { brandNarrative, brandReputationIndex } from './lib/brand';
import TopBar from './components/TopBar';
import HeroScore from './components/HeroScore';
import MetricCards from './components/MetricCards';
import TreePanel from './components/TreePanel';
import BrandImpact from './components/BrandImpact';
import Pitch from './components/Pitch';
import { Activity } from './components/Icons';

const data = raw as unknown as RawData;

function treeHeight(maxDepth: number): number {
  // (root + maxDepth levels) × node + (maxDepth) × ranksep + buffer
  const levels = maxDepth + 1;
  return Math.max(380, levels * 92 + maxDepth * 56 + 60);
}

export default function App() {
  const view = useMemo(() => {
    const uni = data.universityList[0];
    const universityName = uni?.university || 'Unknown';
    const phone = uni?.phone ? String(uni.phone) : '';

    const built = buildPathTree(
      data.overview,
      data.menuMapping,
      data.scriptCapture,
      universityName,
      phone
    );

    const sysCharForUni = data.systemCharacteristics.filter(
      (s) => s.university === universityName
    );
    const hasOpZero = sysCharForUni.some((s) => s.has_operator_zero === true);

    const currentFriction = calculateFriction(built.root, { hasOpZero });
    const recommended = buildRecommendedTree();

    const webRefs = built.allNodes.flatMap((n) => n.urls);
    const phoneRefs = built.allNodes.flatMap((n) => n.phones);

    const brandCurrent = brandReputationIndex(currentFriction);
    const brandRecommended = brandReputationIndex(recommended.friction);

    return {
      universityName,
      phone,
      built,
      currentFriction,
      recommended,
      webRefs,
      phoneRefs,
      brandCurrent,
      brandRecommended,
    };
  }, []);

  const {
    universityName,
    phone,
    built,
    currentFriction,
    recommended,
    webRefs,
    phoneRefs,
    brandCurrent,
    brandRecommended,
  } = view;

  const shortName = universityName.split(',')[0];

  // Trees are now stacked full-width so they breathe. Pick a generous height
  // that comfortably fits the deeper tree.
  const currentHeight = Math.max(640, treeHeight(currentFriction.maxDepth));
  const recommendedHeight = Math.max(560, treeHeight(recommended.friction.maxDepth));

  return (
    <div className="min-h-screen">
      <TopBar
        university={universityName}
        phone={phone}
        generatedAt={data.generatedAt}
      />

      <main className="max-w-[1440px] mx-auto px-8 py-7">
        {/* Page title row */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} className="text-accent" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
                IVR opportunity report
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight leading-none">
              {universityName}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span>
              Tree:{' '}
              <span className="text-ink2 font-medium">
                {currentFriction.totalNodes} nodes · depth {currentFriction.maxDepth}
              </span>
            </span>
            <span className="text-line2">·</span>
            <span>
              Operator zero{' '}
              <span className="text-good font-medium">
                {currentFriction.hasOpZero ? 'present' : 'missing'}
              </span>
            </span>
            <span className="text-line2">·</span>
            <span>
              Voicemail{' '}
              <span className="text-muted2 font-medium">
                {currentFriction.voicemailCount > 0 ? 'available' : 'missing'}
              </span>
            </span>
          </div>
        </div>

        {/* Hero + Metrics row */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-12 lg:col-span-8">
            <HeroScore
              university={universityName}
              current={currentFriction}
              recommended={recommended.friction}
            />
          </div>
          <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-4">
            <div className="rounded-2xl bg-surface border border-line shadow-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold mb-3">
                Friction breakdown
              </div>
              <FrictionBars current={currentFriction} recommended={recommended.friction} />
            </div>
            <div className="rounded-2xl bg-surface border border-line shadow-card p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold mb-2">
                System characteristics
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Stat label="Live operator" value={currentFriction.humanReachableCount > 0 ? 'Yes' : 'No'} good={currentFriction.humanReachableCount > 0} />
                <Stat label="Press 0 → operator" value={currentFriction.hasOpZero ? 'Yes' : 'No'} good={currentFriction.hasOpZero} />
                <Stat label="Voicemail" value={currentFriction.voicemailCount > 0 ? 'Yes' : 'No'} good={currentFriction.voicemailCount > 0} />
                <Stat label="Avg options/menu" value={currentFriction.avgOptions.toFixed(1)} good={currentFriction.avgOptions <= 5} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric cards row */}
        <div className="mb-6">
          <MetricCards
            current={currentFriction}
            recommended={recommended.friction}
            webRefs={webRefs}
            phoneRefs={phoneRefs}
            brandCurrent={brandCurrent}
            brandRecommended={brandRecommended}
          />
        </div>

        {/* Tree comparison — stacked full-width so trees stay readable */}
        <div className="space-y-4 mb-6">
          <TreePanel
            variant="current"
            tree={built.root}
            friction={currentFriction}
            height={currentHeight}
            prunedCount={built.prunedCount}
          />
          <TreePanel
            variant="recommended"
            tree={recommended.tree}
            friction={recommended.friction}
            height={recommendedHeight}
            rationale={recommended.rationale}
          />
        </div>

        {/* Brand impact */}
        <div className="mb-6">
          <BrandImpact
            university={shortName}
            current={brandCurrent}
            recommended={brandRecommended}
            currentNarrative={brandNarrative(currentFriction, false)}
            recommendedNarrative={brandNarrative(recommended.friction, true)}
          />
        </div>

        {/* Pitch */}
        <Pitch
          university={shortName}
          currentScore={currentFriction.totalScore}
          recommendedScore={recommended.friction.totalScore}
        />

        <div className="mt-8 text-center text-[10px] text-muted2 tracking-wider uppercase">
          Keel · Voice agents that don't make callers wait
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between bg-bg2 border border-line rounded-md px-2.5 py-1.5">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${good ? 'text-good' : 'text-bad2'}`}>{value}</span>
    </div>
  );
}

function FrictionBars({
  current,
  recommended,
}: {
  current: import('./lib/types').FrictionResult;
  recommended: import('./lib/types').FrictionResult;
}) {
  const rows: { key: keyof import('./lib/types').FrictionComponents; label: string }[] = [
    { key: 'depth', label: 'Depth' },
    { key: 'time', label: 'Time' },
    { key: 'dead_end', label: 'Dead-ends' },
    { key: 'agent_access', label: 'Agent access' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'operator', label: 'Operator' },
  ];
  return (
    <div className="space-y-2">
      {rows.map(({ key, label }) => {
        const c = Math.round(current.components[key] || 0);
        const r = Math.round(recommended.components[key] || 0);
        return (
          <div key={key} className="text-[10px]">
            <div className="flex items-center justify-between text-muted mb-0.5">
              <span>{label}</span>
              <span className="font-mono tabular-nums">
                <span className={c > 50 ? 'text-bad2' : c > 25 ? 'text-warn' : 'text-muted'}>{c}</span>
                <span className="text-line2 mx-1">→</span>
                <span className="text-good">{r}</span>
              </span>
            </div>
            <div className="relative h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-bad/40"
                style={{ width: `${c}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full bg-good"
                style={{ width: `${r}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
