import { useMemo } from 'react';
import raw from './data.json';
import type { RawData } from './lib/types';
import { buildPathTree } from './lib/pathTree';
import { calculateFriction, frictionFromSheet } from './lib/friction';
import { buildRecommendedTree } from './lib/recommend';
import { brandNarrative, brandReputationIndex } from './lib/brand';
import TopBar from './components/TopBar';
import MetricCards from './components/MetricCards';
import TreePanel from './components/TreePanel';
import BrandImpact from './components/BrandImpact';
import Pitch from './components/Pitch';
import { Activity } from './components/Icons';

const data = raw as unknown as RawData;

function treeHeight(maxDepth: number): number {
  const levels = maxDepth + 1;
  return Math.max(360, levels * 92 + maxDepth * 64 + 80);
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

    // Prefer the WorkflowC scorer's output (production-grade, in
    // data.frictionScore). Fall back to the in-browser scorer if that sheet
    // hasn't been populated yet.
    const sheetRow = data.frictionScore.find(
      (r) => r.university === universityName
    );
    const currentFriction = sheetRow
      ? frictionFromSheet(sheetRow)
      : calculateFriction(built.root, { hasOpZero });

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
      sheetRow,
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
    sheetRow,
  } = view;

  const shortName = universityName.split(',')[0];

  const currentHeight = Math.max(640, treeHeight(currentFriction.maxDepth));
  const recommendedHeight = Math.max(560, treeHeight(recommended.friction.maxDepth));

  // Plain-English breakdown for the Brand Reputation tile's formula popover.
  const brandFormula = brandCurrent.breakdown.formula;

  return (
    <div className="min-h-screen">
      <TopBar
        university={universityName}
        phone={phone}
        generatedAt={data.generatedAt}
      />

      <main className="max-w-[1440px] mx-auto px-8 py-7">
        {/* Compact heading row — no oversized hero */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} className="text-accent" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
                IVR Opportunity Report
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight leading-none text-ink">
              {universityName}
            </h1>
            <p className="text-sm text-muted mt-2 max-w-2xl leading-snug">
              Where every caller-facing path stands today, and where Keel takes
              it. Numbers below come straight from{' '}
              {sheetRow ? 'the production friction scorer (WorkflowC)' : 'the in-browser scorer'}
              .
            </p>
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

        {/* KPI strip — top of page, no hero block */}
        <div className="mb-8">
          <MetricCards
            current={currentFriction}
            recommended={recommended.friction}
            webRefs={webRefs}
            phoneRefs={phoneRefs}
            brandCurrent={brandCurrent}
            brandRecommended={brandRecommended}
            brandFormula={brandFormula}
          />
        </div>

        {/* Worst component callout — what specifically is broken */}
        {sheetRow?.worst_component && (
          <div className="mb-6 rounded-xl bg-surface border border-line shadow-card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-bad/10 border border-bad/25 flex items-center justify-center text-bad shrink-0 mt-0.5">
              <Activity size={14} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold mb-1">
                Worst component
              </div>
              <div className="text-sm font-semibold text-ink">
                {sheetRow.worst_component}
              </div>
              {sheetRow.recommendations && (
                <div className="text-[12px] text-ink2 leading-relaxed mt-1.5 max-w-3xl">
                  {sheetRow.recommendations}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tree comparison stacked full-width — graphs stay readable */}
        <div className="space-y-4 mb-6">
          <TreePanel
            variant="current"
            tree={built.root}
            friction={currentFriction}
            height={currentHeight}
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
