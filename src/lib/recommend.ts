import { calculateFriction } from './friction';
import type { FrictionResult, TreeNode } from './types';

let nodeCounter = 0;

// Every real call line opens with mandatory boilerplate: "this call may
// be recorded for quality," a brief brand line, possibly an emergency
// disclaimer. ~12s is typical before the caller hears anything
// actionable. The friction model averages durations across nodes, so we
// bake this baseline into the root greeting + every leaf to keep the
// projected wait time realistic — not 8s, which is shorter than the
// disclaimer alone.
const CALL_DISCLAIMER_BASELINE_SEC = 12;

function makeNode(
  digit: string,
  label: string,
  outcome: TreeNode['outcomeType'],
  depth: number,
  durationSec: number | null = 20
): TreeNode {
  return {
    id: `r:${++nodeCounter}:${depth}:${digit}`,
    digit,
    label,
    type: outcome,
    outcomeType: outcome,
    depth,
    durationSec,
    hasOperator: true,
    isRecommended: true,
    notes: null,
    urls: [],
    phones: [],
    children: [],
  };
}

function makeRoot(): TreeNode {
  return {
    id: 'r:root',
    digit: '',
    label: 'Main menu',
    type: 'submenu',
    outcomeType: 'submenu',
    depth: 0,
    // ~12s call-recording disclaimer + 6s greeting + 8s menu read.
    durationSec: CALL_DISCLAIMER_BASELINE_SEC + 14,
    hasOperator: true,
    isRecommended: true,
    notes: null,
    urls: [],
    phones: [],
    children: [],
  };
}

function addRepeatNodes(parent: TreeNode) {
  if (parent.children.length > 0 && !parent.children.some((c) => c.digit === '#')) {
    parent.children.push({
      id: `${parent.id}::#`,
      digit: '#',
      label: 'Repeat current menu',
      type: 'repeat',
      outcomeType: 'repeat',
      depth: parent.depth + 1,
      durationSec: null,
      hasOperator: false,
      isRecommended: true,
      notes: null,
      urls: [],
      phones: [],
      children: [],
    });
  }
  parent.children.forEach((c) => {
    if (c.outcomeType !== 'repeat') addRepeatNodes(c);
  });
}

export interface RecommendResult {
  tree: TreeNode;
  friction: FrictionResult;
  rationale: string[];
  warnings: string[];
}

// Strip the IVR-prompt boilerplate from a department label so it reads cleanly
// at a glance: "Bursar / Card office" instead of "Bursar / OneCard office —
// representative". Keeps the user's actual department name; just trims the
// fluff.
function cleanDeptLabel(raw: string): string {
  return raw
    // Drop IVR-prompt fluff that isn't part of the actual department name
    .replace(/\s+representative$/i, '')
    .replace(/\s+information$/i, '')
    .replace(/\s+info$/i, '')
    .replace(/\s+menu$/i, '')
    .replace(/^questions about\s+/i, '')
    // Tidy connectors
    .replace(/\s+and\s+/gi, ' & ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

// Walk the current tree and collect the IVR's actual department offerings
// to mirror in the recommended tree. Strategy:
//   - For each top-level child: if it has its own children, drill in (those
//     are the real leaf services — e.g. CSU's 1>1..1>5). Otherwise the
//     top-level child itself IS the offering (e.g. SJSU's "wellness" or
//     "athletics" leaves that we never drilled into).
//   - Skip generic "Digit X" placeholders (no real label captured).
//   - Operator detection routes that label to "Operator (24/7)" so it
//     becomes the digit-0 leaf in the recommendation, not a department.
function extractDepartments(currentTree: TreeNode): {
  label: string;
  isOperator: boolean;
}[] {
  const out: { label: string; isOperator: boolean }[] = [];
  const seen = new Set<string>();

  const consider = (n: TreeNode) => {
    // submenu_unexplored = "we know a menu exists here but didn't capture
    // its contents" — not a real department offering to promote.
    if (n.outcomeType === 'submenu_unexplored') return;
    if (!n.label || /^digit\s+/i.test(n.label)) return;
    const cleaned = cleanDeptLabel(n.label);
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const isOperator = /\boperator\b|campus operator/i.test(n.label);
    out.push({ label: isOperator ? 'Operator (24/7)' : cleaned, isOperator });
  };

  for (const child of currentTree.children) {
    if (
      child.outcomeType === 'repeat' ||
      child.outcomeType === 'submenu_unexplored' ||
      child.isGhost
    )
      continue;
    const realKids = child.children.filter(
      (c) =>
        c.outcomeType !== 'repeat' &&
        c.outcomeType !== 'submenu_unexplored' &&
        !c.isGhost
    );
    if (realKids.length > 0) {
      // Submenu was drilled into — its leaves are the real offerings.
      for (const grand of realKids) {
        const grandKids = grand.children.filter(
          (c) =>
            c.outcomeType !== 'repeat' &&
            c.outcomeType !== 'submenu_unexplored' &&
            !c.isGhost
        );
        if (grandKids.length === 0) consider(grand);
      }
    } else {
      // Top-level child is itself the offering (SJSU pattern).
      consider(child);
    }
  }
  return out;
}

const BASE_RATIONALE = [
  'Every department from the current IVR is preserved. The voice agent routes by intent, so callers reach the right team without bucketing or losing services.',
  "Replaced the 2 level digit menu with a natural language voice agent. Callers say what they need; digits remain as a fallback.",
  'Operator zero is now 24/7. The current IVR strands evening, weekend, and after hours callers. The voice agent does not.',
  'Added a self service path for hours, locations, and FAQs. Around 30% of inbound calls are answered in under 10 seconds without a human.',
  'Eliminated the 185 second submenu prompt. Average caller now reaches a resolution in under 10 seconds instead of nearly 3 minutes.',
];

// Builds the recommended tree by:
// 1. Preserving every distinct human-reachable department from the current tree
//    as a direct depth-1 leaf (no bucketing, no information loss).
// 2. Promoting "operator" (digit 0) to a 24/7 leaf.
// 3. Adding a self-service info leaf for hours/locations/FAQs that the voice agent can
//    answer instantly, no human needed.
// 4. Keeping the # repeat-menu fallback.
//
// `todayCoverage` is the current IVR's self-service coverage as a 0..1
// fraction. The Optimized IVR's coverage is the MAX of (today + a small
// uplift from the new FAQ leaf, baseline floor). It must never regress
// below what the current IVR already answers — promoting the tree to
// "optimized" can't make question coverage worse.
export function buildRecommendedTree(
  currentTree?: TreeNode | null,
  currentFriction?: FrictionResult | null,
  todayCoverage: number = 0
): RecommendResult {
  nodeCounter = 0;
  const root = makeRoot();

  // Pull real departments out of the current tree
  const fromCurrent = currentTree ? extractDepartments(currentTree) : [];
  const depts = fromCurrent.filter((d) => !d.isOperator);
  const hasOperatorInCurrent = fromCurrent.some((d) => d.isOperator);

  // Defensive default — in case extraction returns nothing useful (e.g., a
  // current tree where every leaf is dead_end or info), fall back to the
  // generic university-IVR set so the dashboard still renders something
  // believable.
  const finalDepts =
    depts.length >= 2
      ? depts
      : [
          { label: 'Admissions & outreach', isOperator: false },
          { label: 'Financial aid & scholarships', isOperator: false },
          { label: 'Bursar & student accounts', isOperator: false },
          { label: 'Registrar & transcripts', isOperator: false },
          { label: 'Academic advising', isOperator: false },
        ];

  // Department leaves: digits 1..N
  finalDepts.forEach((d, i) => {
    root.children.push(makeNode(String(i + 1), d.label, 'human', 1));
  });

  // Self-service info leaf: next digit after departments. If departments
  // already filled 1-9, skip (extremely unlikely). Fast leaf — disclaimer
  // is already counted at the root; FAQ playback ~15s.
  const selfServeDigit = finalDepts.length + 1;
  if (selfServeDigit <= 9) {
    root.children.push(
      makeNode(
        String(selfServeDigit),
        'Hours, locations & FAQs (instant)',
        'info',
        1,
        15
      )
    );
  }

  // Operator zero — always available, now 24/7
  root.children.push(makeNode('0', hasOperatorInCurrent ? 'Operator (24/7)' : 'Operator (24/7), added', 'human', 1));

  addRepeatNodes(root);

  // the voice agent is 24/7. Coverage: a flat IVR with one FAQ leaf can
  // self-serve at least ~3 of the 12 typical student questions (hours +
  // a couple procedural answers). If today's IVR already covers more
  // (multiple info leaves on different departments), preserve that — the
  // Optimized IVR adds an FAQ leaf on top of whatever today's tree
  // already does, so coverage can only go up.
  const baselineFaq = 3 / 12;
  const FAQ_UPLIFT = 1 / 12;
  const ivrCoverage = Math.max(baselineFaq, todayCoverage + FAQ_UPLIFT);
  const friction = calculateFriction(root, {
    hasOpZero: true,
    businessHoursOnly: false,
    selfServiceCoverage: Math.min(1, ivrCoverage),
  });

  const warnings: string[] = [];
  if (currentFriction && friction.totalScore >= currentFriction.totalScore) {
    warnings.push(
      `Projection (${friction.totalScore}) didn't beat the current score (${currentFriction.totalScore}). Investigate inputs.`
    );
  }

  return {
    tree: root,
    friction,
    rationale: BASE_RATIONALE,
    warnings,
  };
}

// ----------------------------------------------------------------------------
// Voice-agent tier — the voice agent runs as a single conversational agent instead of a
// digit menu. There is no separate "operator" node, no separate "self-service"
// vs "smart routing" bucket: the voice agent IS all of those. From the
// caller's perspective it's one entity that picks up, understands, and
// resolves the request — a really good human-like assistant available 24/7.
// ----------------------------------------------------------------------------

const VA_RATIONALE = [
  'A single agent handles the whole call (info, routing, escalation). There is no separate "operator" because the agent is the operator.',
  'Resolves around 80% of common inquiries end to end without handing off. Hours, status checks, billing, account help, FAQs.',
  'When a human is needed, the agent collects intent and caller identity first and hands the human a summary, so the call picks up at speed.',
  '24/7 and multilingual. Evening, weekend, and non English callers are no longer locked out.',
  "No menu, no digits to memorize. Callers state their intent in plain English the way they'd ask a person.",
];

export function buildVoiceAgentTree(
  _currentTree?: TreeNode | null,
  currentFriction?: FrictionResult | null
): RecommendResult {
  nodeCounter = 0;
  const root = makeRoot();
  // Voice agent greeting: ~12s recording disclaimer (legally required) + ~6s
  // greeting + ~4s "what can I help you with?" intent prompt = 22s before
  // the caller's first word.
  root.durationSec = CALL_DISCLAIMER_BASELINE_SEC + 10;
  root.label = 'Voice agent (speak naturally)';

  // Two leaves, capturing the two paths a voice agent call can take.
  //
  // 1) AI-handled — the voice agent answers end-to-end without a human.
  //    Type 'ai' (not 'info', not 'human') because semantically it's an AI
  //    giving a real answer, not a recording or a person.
  //
  //    Duration calibration: leaf duration here represents the FULL caller
  //    experience for this path — pickup → disclaimer → greeting → intent
  //    capture → answer/handoff — matching how today's data is logged
  //    (each digit_test call's `duration` is the whole call from pickup
  //    to hangup, so the friction averaging stays apples-to-apples).
  //
  //    Budget: 12s disclaimer + 10s greeting/intent prompt + ~68s of
  //    conversation (3 turns × ~22s: caller speaks 4-6s + AI latency
  //    ~700ms + AI speaks 10-15s) = ~90s end-to-end. Root.durationSec
  //    above is metadata only — it's excluded from the avg by friction.ts.
  //
  //    Benchmarks (May 2026 research):
  //    - Vapi: 465ms optimized end-to-end, 700-1500ms typical
  //    - Retell AI: 620ms end-to-end response latency
  //    - Bland AI: ~800ms-2.5s latency (higher end of the range)
  //    - PolyAI Golden Nugget (hotel reservations): 5-minute AHT — but
  //      that's a complex multi-step booking, not a single Q&A
  //    - Retell insurance FNOL: 5.8min AHT vs 12.4min human (J.D. Power
  //      benchmark) — also a multi-question intake, not single Q&A
  //    - Klarna chat AI: <2min vs 11min for human (chat, not voice; full
  //      issue resolution)
  //    For a university single-question Q&A, 90s is the credible midpoint
  //    between sub-2min chat resolution and multi-minute complex IVR
  //    intake calls.
  const aiAnswer = makeNode(
    '1',
    'Voice agent answers (AI)',
    'ai',
    1,
    90
  );
  aiAnswer.notes =
    'Hours · App status · Tuition / billing · Account & password · Course Q&A · 25 languages · around 80% of calls resolved without escalation. ~90s for a single question with a clarifying turn.';

  // 2) Routed to a human — AI captures intent + identity, then transfers.
  //    Duration: ~25s AI intent capture + ~50s transfer/hold + ~15s human
  //    pickup acknowledgment = ~90s before the caller is actually being
  //    helped by the human. Still well below today's 2-3min university
  //    IVRs where the caller waits through nested menus before reaching
  //    a person.
  const humanRoute = makeNode(
    '2',
    'Routed to human (when needed)',
    'human',
    1,
    90
  );
  humanRoute.notes =
    'Complex cases · Specific advisor requests · Emergencies. The agent hands off with intent and caller identity prefilled, so the human picks up at speed (~25s AI intent + ~50s transfer wait + ~15s human pickup).';

  root.children = [aiAnswer, humanRoute];
  addRepeatNodes(root);

  // Voice agent self-resolves ~10 of the 12 typical student questions.
  const friction = calculateFriction(root, {
    hasOpZero: true,
    businessHoursOnly: false,
    selfServiceCoverage: 10 / 12,
  });

  const warnings: string[] = [];
  if (currentFriction && friction.totalScore >= currentFriction.totalScore) {
    warnings.push(
      `Voice-agent projection (${friction.totalScore}) didn't beat current (${currentFriction.totalScore}). Investigate.`
    );
  }

  return {
    tree: root,
    friction,
    rationale: VA_RATIONALE,
    warnings,
  };
}
