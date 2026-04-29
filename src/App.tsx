import { useMemo } from 'react';
import raw from './data.json';
import type { RawData } from './lib/types';
import { buildPathTree } from './lib/pathTree';
import {
  calculateFriction,
  frictionFromSheet,
  TYPICAL_STUDENT_QUESTIONS,
} from './lib/friction';
import { buildRecommendedTree, buildVoiceAgentTree } from './lib/recommend';
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

    // businessHoursOnly: any human-reachable path that the IVR explicitly
    // gates behind business hours (M-F + AM/PM markers in the row's
    // business_hours field). When true, the IVR has no 24/7 escalation.
    const humanRows = data.overview.filter(
      (o) =>
        o.university === universityName &&
        o.outcome_type === 'human' &&
        typeof o.business_hours === 'string' &&
        o.business_hours.length > 0
    );
    const businessHoursOnly = humanRows.some((o) =>
      /monday|m-f|am|pm/i.test(String(o.business_hours))
    );

    // self-service coverage of the existing IVR: each `info`-type leaf is
    // assumed to cover ~3 of the typical student questions (FAQ-style
    // pages tend to bundle hours, locations, and one or two procedural
    // answers together). Routing-to-human leaves don't count — the
    // question wasn't answered, just queued.
    const infoLeafCount = built.allNodes.filter(
      (n) => n.outcomeType === 'info' && n.children.length === 0
    ).length;
    const todayQuestionsCovered = Math.min(
      TYPICAL_STUDENT_QUESTIONS.length,
      infoLeafCount * 3
    );
    const todayCoverage = todayQuestionsCovered / TYPICAL_STUDENT_QUESTIONS.length;

    // Prefer the friction-scorer row from the sheet. Fall back to the
    // in-browser scorer if that sheet hasn't been populated yet.
    const sheetRow = data.frictionScore.find(
      (r) => r.university === universityName
    );
    const currentFriction = sheetRow
      ? frictionFromSheet(sheetRow)
      : calculateFriction(built.root, {
          hasOpZero,
          businessHoursOnly,
          selfServiceCoverage: todayCoverage,
        });

    const recommended = buildRecommendedTree(built.root, currentFriction);
    const voiceAgent = buildVoiceAgentTree(built.root, currentFriction);

    const webRefs = built.allNodes.flatMap((n) => n.urls);
    const phoneRefs = built.allNodes.flatMap((n) => n.phones);

    const brandCurrent = brandReputationIndex(currentFriction);
    const brandRecommended = brandReputationIndex(recommended.friction);
    const brandVoice = brandReputationIndex(voiceAgent.friction);

    return {
      universityName,
      phone,
      built,
      currentFriction,
      recommended,
      voiceAgent,
      webRefs,
      phoneRefs,
      brandCurrent,
      brandRecommended,
      brandVoice,
      sheetRow,
      todayQuestionsCovered,
    };
  }, []);

  const {
    universityName,
    phone,
    built,
    currentFriction,
    recommended,
    voiceAgent,
    webRefs,
    phoneRefs,
    brandCurrent,
    brandRecommended,
    brandVoice,
    sheetRow,
    todayQuestionsCovered,
  } = view;

  const shortName = universityName.split(',')[0];

  const currentHeight = Math.max(640, treeHeight(currentFriction.maxDepth));
  const recommendedHeight = Math.max(560, treeHeight(recommended.friction.maxDepth));
  const voiceAgentHeight = Math.max(520, treeHeight(voiceAgent.friction.maxDepth));

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
              Every caller-facing path on your line, scored on the friction a
              real caller experiences — wait time, business-hours dependency,
              menu listening, and prompt clarity.
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
            voiceAgent={voiceAgent.friction}
            webRefs={webRefs}
            phoneRefs={phoneRefs}
            brandCurrent={brandCurrent}
            brandRecommended={brandRecommended}
            brandVoice={brandVoice}
            brandFormula={brandFormula}
            todayQuestionsCovered={todayQuestionsCovered}
          />
        </div>

        {/* Worst component callout — what specifically is broken */}
        {sheetRow?.worst_component && (
          <div className="mb-6 rounded-xl bg-surface border border-line shadow-card p-4">
            <div className="flex items-start gap-3 mb-3">
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
              </div>
            </div>
            {sheetRow.recommendations && (
              <ul className="space-y-1.5 pl-11 max-w-3xl">
                {sheetRow.recommendations
                  .split(';')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((line, i) => {
                    const cleaned = line.replace(/\s+[—–]\s+/g, ': ');
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12.5px] text-ink2 leading-snug"
                      >
                        <span className="font-mono text-[10px] text-muted2 mt-1 shrink-0">
                          0{i + 1}
                        </span>
                        <span>{cleaned}</span>
                      </li>
                    );
                  })}
              </ul>
            )}
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
          <TreePanel
            variant="voice_agent"
            tree={voiceAgent.tree}
            friction={voiceAgent.friction}
            height={voiceAgentHeight}
            rationale={voiceAgent.rationale}
          />
        </div>

        {/* Brand impact */}
        <div className="mb-6">
          <BrandImpact
            university={shortName}
            current={brandCurrent}
            recommended={brandRecommended}
            voiceAgent={brandVoice}
            currentNarrative={brandNarrative(currentFriction, false)}
            recommendedNarrative={brandNarrative(recommended.friction, true)}
            voiceAgentNarrative={brandNarrative(voiceAgent.friction, true)}
          />
        </div>

        {/* Pitch */}
        <Pitch
          university={shortName}
          currentScore={currentFriction.totalScore}
          recommendedScore={recommended.friction.totalScore}
          voiceAgentScore={voiceAgent.friction.totalScore}
        />

        <div className="mt-8 text-center text-[10px] text-muted2 tracking-wider uppercase">
          Keel · Voice agents that don't make callers wait
        </div>
      </main>
    </div>
  );
}
