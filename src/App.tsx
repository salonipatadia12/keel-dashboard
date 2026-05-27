import { useMemo, useState } from 'react';
import raw from './data.json';
import type { RawData, UniversityData } from './lib/types';
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
import UniversitySelector from './components/UniversitySelector';
import CohortComparison, { type CohortRow } from './components/CohortComparison';
import { Activity } from './components/Icons';

const data = raw as unknown as RawData;

// Universities Saloni has confirmed by manual call have no IVR at all —
// calls route straight to a person (or that person's voicemail when
// unavailable). The friction score doesn't apply to these lines; the
// dashboard surfaces them with a distinct "No IVR" label instead of a
// misleading friction number.
const NO_IVR_IDS = new Set<string>(['northwestern', 'loyola-chicago']);

function treeHeight(maxDepth: number): number {
  const levels = maxDepth + 1;
  return Math.max(360, levels * 92 + maxDepth * 64 + 80);
}

function buildView(uni: UniversityData) {
  const universityName = uni.name;
  const phone = uni.phone;

  const built = buildPathTree(
    uni.overview,
    uni.menuMapping,
    uni.scriptCapture,
    universityName,
    phone
  );

  const sysCharForUni = uni.systemCharacteristics.filter(
    (s) => s.university === universityName
  );
  const hasOpZero = sysCharForUni.some((s) => s.has_operator_zero === true);

  // businessHoursOnly: any human-reachable path that the IVR explicitly
  // gates behind business hours.
  const humanRows = uni.overview.filter(
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
  // assumed to bundle ~3 typical student questions (FAQ pages bundle hours,
  // locations, and procedural answers).
  const infoLeafCount = built.allNodes.filter(
    (n) => n.outcomeType === 'info' && n.children.length === 0
  ).length;
  const todayQuestionsCovered = Math.min(
    TYPICAL_STUDENT_QUESTIONS.length,
    infoLeafCount * 3
  );
  const todayCoverage = todayQuestionsCovered / TYPICAL_STUDENT_QUESTIONS.length;

  // queueOnly: no menu, just a single forced hold queue (Santa Clara pattern).
  // Detect by counting non-repeat tree nodes — if there's at most one and
  // it's a human leaf, the "IVR" is just a hold queue.
  const realLeaves = built.allNodes.filter(
    (n) => n.id !== 'root' && n.outcomeType !== 'repeat'
  );
  const queueOnly =
    realLeaves.length === 0 ||
    (realLeaves.length === 1 && realLeaves[0].outcomeType === 'human');

  const sheetRow = uni.frictionScore[0];
  const currentFriction = sheetRow
    ? frictionFromSheet(sheetRow)
    : calculateFriction(built.root, {
        hasOpZero,
        businessHoursOnly,
        selfServiceCoverage: todayCoverage,
        queueOnly,
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
}

function shortLabel(name: string): string {
  return name.split(',')[0];
}

type Page = 'report' | 'rankings';

export default function App() {
  const universities = data.universities;
  const [activeId, setActiveId] = useState(
    universities[0]?.id ?? 'unknown'
  );
  const [page, setPage] = useState<Page>('report');
  const active =
    universities.find((u) => u.id === activeId) ?? universities[0];

  const view = useMemo(() => buildView(active), [active]);

  // Compute current + voice-agent friction for every university in the cohort
  // so the comparison panel can show all rows side by side. Cheap because
  // friction calc is in-memory tree work — done once per page load.
  const cohortRows = useMemo<CohortRow[]>(() => {
    return universities.map((u) => {
      const v = buildView(u);
      return {
        id: u.id,
        name: u.name,
        currentScore: v.currentFriction.totalScore,
        voiceAgentScore: v.voiceAgent.friction.totalScore,
        grade: v.currentFriction.grade,
        hasNoIvr: NO_IVR_IDS.has(u.id),
      };
    });
  }, [universities]);
  const selectorScoresById = useMemo(() => {
    return Object.fromEntries(
      cohortRows.map((r) => [
        r.id,
        { total: r.currentScore, grade: r.grade, hasNoIvr: !!r.hasNoIvr },
      ])
    );
  }, [cohortRows]);
  const activeHasNoIvr = NO_IVR_IDS.has(active.id);

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

  const shortName = shortLabel(universityName);
  const currentHeight = Math.max(640, treeHeight(currentFriction.maxDepth));
  const recommendedHeight = Math.max(560, treeHeight(recommended.friction.maxDepth));
  const voiceAgentHeight = Math.max(520, treeHeight(voiceAgent.friction.maxDepth));
  const brandFormula = brandCurrent.breakdown.formula;

  return (
    <div className="min-h-screen">
      <TopBar
        university={universityName}
        phone={phone}
        generatedAt={data.generatedAt}
      />

      <main className="max-w-[1440px] mx-auto px-8 py-7">
        {/* Page tabs */}
        <div className="mb-6 flex items-center justify-between border-b border-line">
          <nav className="flex items-end gap-2">
            <PageTab
              label="University report"
              active={page === 'report'}
              onClick={() => setPage('report')}
            />
            <PageTab
              label="Rankings"
              active={page === 'rankings'}
              onClick={() => setPage('rankings')}
              badge={universities.length}
            />
          </nav>
          <div className="pb-3 text-[12px] uppercase tracking-[0.18em] text-muted font-semibold">
            {universities.length} universities audited
          </div>
        </div>

        {page === 'report' && (
          <>
        {/* University selector — dropdown with search, sorted by friction */}
        {universities.length > 1 && (
          <div className="mb-5 flex items-center">
            <UniversitySelector
              universities={universities}
              activeId={active.id}
              onSelect={setActiveId}
              scoresById={selectorScoresById}
            />
          </div>
        )}

        {/* Compact heading row */}
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
              Every caller facing path on your line, scored on the friction a
              real caller experiences. Wait time, business hours dependency,
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

        {/* No-IVR banner — surfaced above the KPI strip so it's obvious the
            friction score below is computed against an empty IVR, not a real
            menu. */}
        {activeHasNoIvr && (
          <div className="mb-5 rounded-xl border border-line2 bg-surface2/40 px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-bg border border-line flex items-center justify-center text-muted shrink-0 mt-0.5">
              <Activity size={13} />
            </div>
            <div className="text-[13px] leading-snug text-ink2">
              <span className="font-semibold text-ink">No IVR on this line.</span>{' '}
              Calls route straight to a person — and to that person's voicemail
              when they're away. There's no menu, no self-service path, and no
              after-hours coverage. The KPIs below show the lift an IVR or
              voice agent would deliver versus today's direct-to-human pattern.
            </div>
          </div>
        )}

        {/* KPI strip */}
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

        {/* Worst component callout */}
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

        {/* Tree comparison stacked full-width */}
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
          </>
        )}

        {page === 'rankings' && (
          <CohortComparison
            rows={cohortRows}
            activeId={active.id}
            onSelect={(id) => {
              setActiveId(id);
              setPage('report');
            }}
          />
        )}

        <div className="mt-8 text-center text-[10px] text-muted2 tracking-wider uppercase">
          Voice agents that don't make callers wait
        </div>
      </main>
    </div>
  );
}

function PageTab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-2.5 px-6 py-4 text-[17px] font-semibold tracking-tight border-b-[3px] transition -mb-px ' +
        (active
          ? 'text-ink border-accent'
          : 'text-muted hover:text-ink2 border-transparent hover:border-line2')
      }
    >
      {label}
      {typeof badge === 'number' && (
        <span
          className={
            'text-[13px] font-bold px-2 py-0.5 rounded tabular-nums ' +
            (active
              ? 'bg-accent/15 text-accent'
              : 'bg-surface text-muted border border-line')
          }
        >
          {badge}
        </span>
      )}
    </button>
  );
}
