import { useMemo, useState } from 'react';
import raw from './data.json';
import type { RawData, UniversityData } from './lib/types';
import { buildPathTree } from './lib/pathTree';
import {
  calculateFriction,
  frictionFromSheet,
  questionListForWorkspace,
} from './lib/friction';
import { buildRecommendedTree, buildVoiceAgentTree } from './lib/recommend';
import { brandNarrative, brandReputationIndex } from './lib/brand';
import { computeMenuStats } from './lib/menuStats';
import { buildAuditNarrative } from './lib/auditNarrative';
import TopBar from './components/TopBar';
import MetricCards from './components/MetricCards';
import TreePanel from './components/TreePanel';
import BrandImpact from './components/BrandImpact';
import Pitch from './components/Pitch';
import UniversitySelector from './components/UniversitySelector';
import CohortComparison, { type CohortRow } from './components/CohortComparison';
import ParentLanding, { type ParentCard } from './components/ParentLanding';
import ParentOverview, { type ChildSummary } from './components/ParentOverview';
import BookMeetingCta from './components/BookMeetingCta';
import { Activity } from './components/Icons';
import { SHOW_OPTIMIZED_IVR } from './lib/config';

const data = raw as unknown as RawData;

// Universities Saloni has confirmed by manual call have no IVR at all —
// calls route straight to a person (or that person's voicemail when
// unavailable). The friction score doesn't apply to these lines; the
// dashboard surfaces them with a distinct "No IVR" label instead of a
// misleading friction number.
const NO_IVR_IDS = new Set<string>([
  'northwestern',
  'loyola-chicago',
  'uc-san-diego',
  'sdsu',
  'iu-indianapolis',
  'ball-state',
  'iu-bloomington',
  'illinois-state',
  'stanford',
]);

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
  // locations, and procedural answers). Ghost (un-dialed) options don't
  // count — we have no proof those branches actually deliver info. The
  // question-list size is workspace-keyed so K-12 lines score against
  // department reach instead of student questions.
  const questionList = questionListForWorkspace(uni.workspace);
  const infoLeafCount = built.allNodes.filter(
    (n) => n.outcomeType === 'info' && n.children.length === 0 && !n.isGhost
  ).length;
  const todayQuestionsCovered = Math.min(
    questionList.length,
    infoLeafCount * 3
  );
  const todayCoverage = todayQuestionsCovered / questionList.length;

  // queueOnly: no menu, just a single forced hold queue (Santa Clara pattern).
  // Detect by counting non-repeat tree nodes — if there's at most one and
  // it's a human leaf, the "IVR" is just a hold queue. Ghosts (un-dialed
  // MM options) are visualization sugar and must not affect this decision.
  const realLeaves = built.allNodes.filter(
    (n) => n.id !== 'root' && n.outcomeType !== 'repeat' && !n.isGhost
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

  // Use the tree-computed coverage (info-leaf count) as the floor, NOT
  // the sheet's selfServiceCoverage — older Friction Score rows pre-date
  // the coverage column and report it as 0, which would let the optimized
  // tree silently regress from today's working FAQ leaves.
  const recommended = buildRecommendedTree(
    built.root,
    currentFriction,
    Math.max(todayCoverage, currentFriction.selfServiceCoverage)
  );
  const voiceAgent = buildVoiceAgentTree(built.root, currentFriction);

  // Refs come from dialed nodes only. Ghosts are always constructed with
  // empty url/phone arrays today, but filter defensively so future ghost
  // generation can't accidentally inflate the reference KPIs.
  const webRefs = built.allNodes
    .filter((n) => !n.isGhost)
    .flatMap((n) => n.urls);
  const phoneRefs = built.allNodes
    .filter((n) => !n.isGhost)
    .flatMap((n) => n.phones);

  const brandCurrent = brandReputationIndex(currentFriction);
  const brandRecommended = brandReputationIndex(recommended.friction);
  const brandVoice = brandReputationIndex(voiceAgent.friction);

  // Filter menu options to this tenant only — sheets often pool rows
  // for multiple tenants in shared workbooks.
  const tenantMenuOptions = uni.menuMapping.filter(
    (m) => m.university === universityName
  );

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
    menuOptions: tenantMenuOptions,
  };
}

function shortLabel(name: string): string {
  return name.split(',')[0];
}

type Page = 'report' | 'rankings';

const FALLBACK_WORKSPACES = [
  {
    id: 'universities',
    label: 'University audits',
    audienceCaption:
      'Every caller-facing path on your line, scored on the friction a real caller experiences.',
  },
];

// Deep-link plumbing. The dashboard's URL is the share artifact for
// outreach campaigns: hand a CIO a URL with ?tenant=alabama-state and
// they land directly on their report without scrolling through 28 other
// universities. We read the param once at mount to seed activeId, and
// write it back whenever the user navigates so the back-button works.
function readTenantFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('tenant');
}

function updateUrlForTenant(tenantId: string, workspaceId: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tenant', tenantId);
  url.searchParams.set('workspace', workspaceId);
  window.history.replaceState({}, '', url.toString());
}

export default function App() {
  const allTenants = data.universities;
  const workspaces =
    data.workspaces && data.workspaces.length > 0
      ? data.workspaces
      : FALLBACK_WORKSPACES;

  // Initial state from URL. ?tenant=alabama-state takes priority over
  // the default first-tenant in workspace.
  const urlTenantId = readTenantFromUrl();
  const urlTenant = urlTenantId
    ? allTenants.find((u) => u.id === urlTenantId)
    : undefined;
  const initialWorkspaceId =
    urlTenant?.workspace ?? workspaces[0]?.id ?? 'universities';

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialWorkspaceId);
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const universities = useMemo(
    () => allTenants.filter((u) => (u.workspace ?? 'universities') === activeWorkspaceId),
    [allTenants, activeWorkspaceId]
  );

  const [activeId, setActiveId] = useState(
    urlTenant?.id ?? universities[0]?.id ?? 'unknown'
  );
  const [page, setPage] = useState<Page>('report');

  // Parent-org drill-down state. null = workspace landing (parent grid);
  // 'tusd' = inside TUSD context (overview + child list, or one child's
  // report when activeId points to that child). Only meaningful in
  // workspaces that have multi-campus parents — universities currently
  // have no parentOrg set, so this stays null there.
  // Deep-link seed: if the URL targets a child of a multi-campus parent,
  // start inside that parent context with the tenant report (overview off).
  const [activeParentOrg, setActiveParentOrg] = useState<string | null>(
    urlTenant?.parentOrg ?? null
  );
  // True when the parent org is selected but no specific child has been
  // clicked — render the rollup overview. False when a child is in focus
  // and we render the tenant report (with a parent breadcrumb).
  const [showOverview, setShowOverview] = useState(false);

  // Write the active tenant back to the URL whenever it changes so the
  // current state is shareable + bookmarkable.
  if (typeof window !== 'undefined') {
    const currentParam = readTenantFromUrl();
    if (currentParam !== activeId) {
      updateUrlForTenant(activeId, activeWorkspaceId);
    }
  }

  // Parents = unique parentOrg ids in the active workspace. A parent with
  // 1 child is "standalone" — clicking its card bypasses the rollup and
  // goes straight to the child report.
  const parentGroups = useMemo(() => {
    const map = new Map<string, UniversityData[]>();
    for (const u of universities) {
      const key = u.parentOrg ?? null;
      if (!key) continue; // skip universities with no parentOrg (flat tenants)
      const list = map.get(key) ?? [];
      list.push(u);
      map.set(key, list);
    }
    return map;
  }, [universities]);
  const hasParentGroups = parentGroups.size > 0;

  // Whenever the workspace changes, snap activeId back to the first tenant
  // and reset the parent-org context so the user lands on the workspace
  // landing again.
  const firstInWorkspace = universities[0]?.id ?? 'unknown';
  if (
    universities.length > 0 &&
    !universities.find((u) => u.id === activeId)
  ) {
    // running this during render is fine — state setter call is queued and
    // re-renders without an extra effect.
    setActiveId(firstInWorkspace);
    setActiveParentOrg(null);
    setShowOverview(false);
  }
  // Workspaces with a single tenant don't have a Rankings page (cohort
  // comparison needs more than one row). If the user lands on Rankings then
  // switches into such a workspace, snap back to Report.
  if (page === 'rankings' && universities.length <= 1) {
    setPage('report');
  }
  const active =
    universities.find((u) => u.id === activeId) ?? universities[0];

  const view = useMemo(() => buildView(active), [active]);

  // Compute current + voice-agent friction for every tenant in the active
  // workspace so the comparison panel can show all rows side by side.
  // Cheap because friction calc is in-memory tree work — done once per
  // page load.
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

  // Parent-landing data: one card per parent org in the workspace, with
  // aggregated CXI averages across its children.
  const parentCards = useMemo<ParentCard[]>(() => {
    const cards: ParentCard[] = [];
    for (const [parentOrg, kids] of parentGroups.entries()) {
      const scored = kids.filter((k) => !NO_IVR_IDS.has(k.id));
      const cxiToday = (id: string) => {
        const row = cohortRows.find((r) => r.id === id);
        if (!row) return 0;
        return Math.max(0, Math.min(100, 100 - row.currentScore));
      };
      const cxiVoice = (id: string) => {
        const row = cohortRows.find((r) => r.id === id);
        if (!row) return 0;
        return Math.max(0, Math.min(100, 100 - row.voiceAgentScore));
      };
      const avgCxiToday =
        scored.length > 0
          ? scored.reduce((s, k) => s + cxiToday(k.id), 0) / scored.length
          : 0;
      const avgCxiVoice =
        scored.length > 0
          ? scored.reduce((s, k) => s + cxiVoice(k.id), 0) / scored.length
          : 0;
      // Parent label = district-office display name stripped of the
      // " — District Office" suffix, falling back to the first child's
      // name (for single-school orgs like Pacifica).
      const districtChild = kids.find((k) => k.childKind === 'district-office');
      const parentLabel = districtChild
        ? districtChild.name.replace(/\s+[—-]\s+District Office\s*$/i, '')
        : kids[0]?.name ?? 'Organization';
      cards.push({
        parentOrg,
        parentLabel,
        childCount: kids.length,
        standaloneChildId: kids.length === 1 ? kids[0].id : undefined,
        avgCxiToday,
        avgCxiVoice,
        childrenSummaries: kids.map((k) => ({
          id: k.id,
          name: k.name,
          childKind: k.childKind ?? null,
        })),
      });
    }
    return cards;
  }, [parentGroups, cohortRows]);

  // Children of the currently-selected parent (for ParentOverview).
  const parentChildren = useMemo<ChildSummary[]>(() => {
    if (!activeParentOrg) return [];
    const kids = parentGroups.get(activeParentOrg) ?? [];
    return kids.map((k) => {
      const v = buildView(k);
      return {
        id: k.id,
        name: k.name,
        childKind: k.childKind ?? null,
        currentScore: v.currentFriction.totalScore,
        voiceAgentScore: v.voiceAgent.friction.totalScore,
        todayWaitSec: v.currentFriction.avgDurationSec ?? 0,
        voiceWaitSec: v.voiceAgent.friction.avgDurationSec ?? 0,
        maxDepth: v.currentFriction.maxDepth,
        hasNoIvr: NO_IVR_IDS.has(k.id),
      };
    });
  }, [activeParentOrg, parentGroups]);

  // Routing decisions for the Report page. Three modes:
  //   - "landing": workspace has multi-campus parents and none is selected.
  //   - "overview": a multi-campus parent IS selected and showOverview is on
  //     — render the rollup.
  //   - "tenant":  one tenant's individual report (the existing flow).
  //
  // Universities workspace has no parentOrg today, so hasParentGroups is
  // false there and viewMode falls through to "tenant" unchanged.
  type ViewMode = 'landing' | 'overview' | 'tenant';
  let viewMode: ViewMode = 'tenant';
  if (page === 'report') {
    if (hasParentGroups && activeParentOrg === null) viewMode = 'landing';
    else if (
      activeParentOrg !== null &&
      (parentGroups.get(activeParentOrg)?.length ?? 0) > 1 &&
      showOverview
    )
      viewMode = 'overview';
  }
  const activeParentLabel = activeParentOrg
    ? (parentCards.find((c) => c.parentOrg === activeParentOrg)?.parentLabel ??
      'Organization')
    : null;

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
    menuOptions,
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
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace.id}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          setPage('report');
        }}
      />

      <main className="max-w-[1200px] mx-auto px-8 py-7">
        {/* Page tabs */}
        <div className="mb-6 flex items-center justify-between border-b border-line">
          <nav className="flex items-end gap-2">
            <PageTab
              label="Report"
              active={page === 'report'}
              onClick={() => setPage('report')}
            />
            {universities.length > 1 && (
              <PageTab
                label="Rankings"
                active={page === 'rankings'}
                onClick={() => setPage('rankings')}
                badge={universities.length}
              />
            )}
          </nav>
          <div className="pb-3 text-[12px] uppercase tracking-[0.18em] text-muted font-semibold">
            {universities.length}{' '}
            {universities.length === 1 ? 'tenant' : 'tenants'} audited
          </div>
        </div>

        {/* Parent landing — workspace has multi-campus parents and none is
            selected. Click a parent card to drill in. */}
        {page === 'report' && viewMode === 'landing' && (
          <ParentLanding
            workspaceLabel={activeWorkspace.label}
            workspaceCaption={activeWorkspace.audienceCaption}
            cards={parentCards}
            onSelectParent={(orgId, standaloneChildId) => {
              setActiveParentOrg(orgId);
              if (standaloneChildId) {
                // Standalone parent (1 child) — jump straight to the
                // tenant report; the parent context still drives the
                // breadcrumb but there's no rollup to show.
                setActiveId(standaloneChildId);
                setShowOverview(false);
              } else {
                setShowOverview(true);
              }
            }}
          />
        )}

        {/* Parent overview — rollup of children for a multi-campus parent.
            Click a child to enter its individual report. */}
        {page === 'report' && viewMode === 'overview' && activeParentOrg && (
          <ParentOverview
            parentLabel={activeParentLabel ?? 'Organization'}
            workspaceLabel={activeWorkspace.label}
            children={parentChildren}
            onSelectChild={(childId) => {
              setActiveId(childId);
              setShowOverview(false);
            }}
            onBack={() => {
              setActiveParentOrg(null);
              setShowOverview(false);
            }}
          />
        )}

        {page === 'report' && viewMode === 'tenant' && (
          <>
        {/* Breadcrumb when we're inside a multi-campus parent context. */}
        {activeParentOrg && activeParentLabel && (parentGroups.get(activeParentOrg)?.length ?? 0) > 1 && (
          <div className="mb-3 flex items-center gap-1.5 text-[12px] text-muted">
            <button
              type="button"
              onClick={() => {
                setActiveParentOrg(null);
                setShowOverview(false);
              }}
              className="hover:text-ink2 transition"
            >
              {activeWorkspace.label}
            </button>
            <span className="text-line2">/</span>
            <button
              type="button"
              onClick={() => setShowOverview(true)}
              className="font-semibold text-ink2 hover:text-ink underline-offset-2 hover:underline transition"
            >
              {activeParentLabel}
            </button>
            <span className="text-line2">/</span>
            <span className="text-ink2">
              {shortLabel(active.name).replace(/^.*?\s+[—-]\s+/, '')}
            </span>
          </div>
        )}

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
              {activeWorkspace.audienceCaption} Wait time, business hours
              dependency, menu listening, and prompt clarity.
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
            workspaceId={active.workspace ?? 'universities'}
          />
        </div>

        {/* Audit narrative callout — every bullet is computed from the
            actual trees rendered below, so the numbers tally. */}
        {(() => {
          const bullets = buildAuditNarrative({
            currentFriction,
            currentMenu: computeMenuStats(menuOptions),
            recommendedTree: recommended.tree,
            recommendedFriction: recommended.friction,
            voiceAgentTree: voiceAgent.tree,
            voiceAgentFriction: voiceAgent.friction,
            todayQuestionsCovered,
            questionsTotal: questionListForWorkspace(active.workspace ?? 'universities').length,
            hasNoIvr: activeHasNoIvr,
            showOptimizedIvr: SHOW_OPTIMIZED_IVR,
          });
          if (bullets.length === 0) return null;
          return (
            <div className="mb-6 rounded-xl bg-surface border border-line shadow-card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-bad/10 border border-bad/25 flex items-center justify-center text-bad shrink-0 mt-0.5">
                  <Activity size={14} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold mb-1">
                    Audit summary
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {sheetRow?.worst_component
                      ? `Worst component: ${sheetRow.worst_component}`
                      : 'Tree-by-tree comparison'}
                  </div>
                </div>
              </div>
              <ul className="space-y-2 pl-11 max-w-3xl">
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[12.5px] text-ink2 leading-snug"
                  >
                    <span className="font-mono text-[10px] text-muted2 mt-1 shrink-0">
                      0{i + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-ink">{b.topic}.</span>{' '}
                      {b.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Tree comparison stacked full-width */}
        <div className="space-y-4 mb-6">
          <TreePanel
            variant="current"
            tree={built.root}
            friction={currentFriction}
            height={currentHeight}
            menuOptions={menuOptions}
          />
          {SHOW_OPTIMIZED_IVR && (
            <TreePanel
              variant="recommended"
              tree={recommended.tree}
              friction={recommended.friction}
              height={recommendedHeight}
              rationale={recommended.rationale}
            />
          )}
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
          voiceAgentScore={voiceAgent.friction.totalScore}
          voiceCoverage={voiceAgent.friction.selfServiceCoverage}
        />

        {/* Book a meeting — the campaign CTA. */}
        <div className="mt-5">
          <BookMeetingCta university={shortName} />
        </div>
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
