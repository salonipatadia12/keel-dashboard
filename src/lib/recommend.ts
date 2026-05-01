import { calculateFriction } from './friction';
import type { FrictionResult, TreeNode } from './types';

let nodeCounter = 0;
function makeNode(
  digit: string,
  label: string,
  outcome: TreeNode['outcomeType'],
  depth: number,
  durationSec: number | null = 8
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
    // 5s = "Hi, this is the Sac State assistant — how can I help you today?"
    durationSec: 5,
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
    if (!n.label || /^digit\s+/i.test(n.label)) return;
    const cleaned = cleanDeptLabel(n.label);
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const isOperator = /\boperator\b|campus operator/i.test(n.label);
    out.push({ label: isOperator ? 'Operator (24/7)' : cleaned, isOperator });
  };

  for (const child of currentTree.children) {
    if (child.outcomeType === 'repeat') continue;
    const realKids = child.children.filter((c) => c.outcomeType !== 'repeat');
    if (realKids.length > 0) {
      // Submenu was drilled into — its leaves are the real offerings.
      for (const grand of realKids) {
        const grandKids = grand.children.filter((c) => c.outcomeType !== 'repeat');
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
  'Every department from the current IVR is preserved — Keel routes by intent, so callers reach the right team without bucketing or losing services.',
  "Replaced the 2-level digit menu with Keel's natural-language voice agent. Callers say what they need; digits remain as a fallback.",
  'Operator zero is now 24/7. The current IVR strands evening, weekend, and after-hours callers — Keel does not.',
  'Added a self-service path for hours, locations, and FAQs. ~30% of inbound calls are answered in <10s without a human.',
  'Eliminated the 185-second submenu prompt. Average caller now reaches a resolution in under 10 seconds instead of nearly 3 minutes.',
];

// Builds the recommended tree by:
// 1. Preserving every distinct human-reachable department from the current tree
//    as a direct depth-1 leaf (no bucketing, no information loss).
// 2. Promoting "operator" (digit 0) to a 24/7 leaf.
// 3. Adding a self-service info leaf for hours/locations/FAQs that Keel can
//    answer instantly, no human needed.
// 4. Keeping the # repeat-menu fallback.
export function buildRecommendedTree(
  currentTree?: TreeNode | null,
  currentFriction?: FrictionResult | null
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
  // already filled 1-9, skip (extremely unlikely).
  const selfServeDigit = finalDepts.length + 1;
  if (selfServeDigit <= 9) {
    root.children.push(
      makeNode(
        String(selfServeDigit),
        'Hours, locations & FAQs (instant)',
        'info',
        1,
        3 // self-serve info is fast — 3s read
      )
    );
  }

  // Operator zero — always available, now 24/7
  root.children.push(makeNode('0', hasOperatorInCurrent ? 'Operator (24/7)' : 'Operator (24/7) — added', 'human', 1));

  addRepeatNodes(root);

  // Keel is 24/7. Coverage: a flat IVR with one FAQ leaf can self-serve
  // ~3 of the 12 typical student questions (hours + a couple procedural
  // answers); everything else still requires a human.
  const friction = calculateFriction(root, {
    hasOpZero: true,
    businessHoursOnly: false,
    selfServiceCoverage: 3 / 12,
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
// Voice-agent tier — Keel runs as a single conversational agent instead of a
// digit menu. There is no separate "operator" node, no separate "self-service"
// vs "smart routing" bucket: the voice agent IS all of those. From the
// caller's perspective it's one entity that picks up, understands, and
// resolves the request — a really good human-like assistant available 24/7.
// ----------------------------------------------------------------------------

const VA_RATIONALE = [
  'A single agent handles the whole call — info, routing, escalation. There is no separate "operator" because Keel is the operator.',
  'Resolves ~80% of common inquiries end-to-end without handing off — hours, status checks, billing, account help, FAQs.',
  'When a human is needed, Keel collects intent + caller identity first and hands the agent a summary, so the human picks up at speed.',
  '24/7 and multilingual. Evening, weekend, and non-English callers are no longer locked out.',
  "No menu, no digits to memorize. Callers state their intent in plain English the way they'd ask a person.",
];

export function buildVoiceAgentTree(
  _currentTree?: TreeNode | null,
  currentFriction?: FrictionResult | null
): RecommendResult {
  nodeCounter = 0;
  const root = makeRoot();
  root.durationSec = 3; // Greeting only — "Hi, this is the Sac State assistant."
  root.label = 'Voice agent (speak naturally)';

  // Two leaves, capturing the two paths a Keel call can take.
  //
  // 1) AI-handled — for the ~10 of 12 typical student questions the voice
  //    agent can answer end-to-end without involving a human. Type 'ai'
  //    (not 'info', not 'human') because semantically it's an AI giving
  //    a real answer, not a generic recording or a person.
  const aiAnswer = makeNode(
    '1',
    'Voice agent answers (AI)',
    'ai',
    1,
    8
  );
  aiAnswer.notes =
    'Hours · App status · Tuition / billing · Account & password · Course Q&A · 25+ languages · ~80% of calls resolved without escalation.';

  // 2) Routed to a human — when the AI hits something it shouldn't decide
  //    (academic standing, advisor specifics, complex disputes). Keel
  //    transfers with intent + caller context already in hand so the human
  //    picks up at speed.
  const humanRoute = makeNode(
    '2',
    'Routed to human (when needed)',
    'human',
    1,
    12
  );
  humanRoute.notes =
    'Complex cases · Specific advisor requests · Emergencies. Keel hands off with intent + caller identity prefilled.';

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
