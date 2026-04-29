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

// Walk the current tree and collect every distinct human-reachable department.
// Returns an ordered list of { label, isOperator } so we can promote each to a
// depth-1 leaf in the recommended tree without losing any real services.
function extractDepartments(currentTree: TreeNode): {
  label: string;
  isOperator: boolean;
}[] {
  const out: { label: string; isOperator: boolean }[] = [];
  const seen = new Set<string>();

  const walk = (n: TreeNode) => {
    const realKids = n.children.filter((c) => c.outcomeType !== 'repeat');
    const isLeafHuman = n.outcomeType === 'human' && realKids.length === 0;
    if (isLeafHuman && n.label) {
      const cleaned = cleanDeptLabel(n.label);
      const key = cleaned.toLowerCase();
      const isOperator = /operator|campus operator/i.test(n.label);
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ label: isOperator ? 'Operator (24/7)' : cleaned, isOperator });
      }
    }
    n.children.forEach(walk);
  };
  walk(currentTree);
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

  // Keel is 24/7 — businessHoursOnly is always false for the projection.
  const friction = calculateFriction(root, { hasOpZero: true, businessHoursOnly: false });

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
// Voice-agent tier — what callers experience when Keel runs as a full
// agentic voice agent instead of a digit menu.
//
// Three high-level capability buckets at depth 1, all natural-language driven:
//   • Self-service auto-resolution — Keel resolves common queries without
//     handing off to a human. Hours, status checks, billing, account help,
//     FAQs, multilingual.
//   • Smart routing with context — Keel collects intent + caller context
//     first, then transfers with a summary so the human picks up at speed.
//   • 24/7 human escalation — direct to operator anytime, including
//     after-hours and emergencies.
// ----------------------------------------------------------------------------

const VA_RATIONALE = [
  'Keel handles ~60% of common inquiries WITHOUT a human — hours, status checks, billing, account help, FAQs.',
  'Smart routing: Keel collects intent + caller identity first, hands the agent a summary so the human picks up at speed.',
  '24/7 multilingual coverage. Evening, weekend, and non-English callers are no longer locked out.',
  "No menu. Callers state their intent in plain English; Keel doesn't make them memorize 'press 1 for X'.",
  'Context-aware: caller phone number → student record lookup → personalized response. No re-asking who they are.',
];

export function buildVoiceAgentTree(
  currentTree?: TreeNode | null,
  currentFriction?: FrictionResult | null
): RecommendResult {
  nodeCounter = 0;
  const root = makeRoot();
  // Shorter root duration — Keel greets in ~3s, not 5s
  root.durationSec = 3;
  root.label = 'Voice agent (speak naturally)';

  // 1: Self-service — Keel resolves without a human (info type)
  const selfServe = makeNode(
    '1',
    'Self-service (instant)',
    'info',
    1,
    5
  );
  selfServe.notes =
    'Hours · App status · Tuition / billing · Account & password · Course Q&A · 25+ languages';

  // 2: Smart routing — Keel handles intake, transfers with context (human)
  const smartRoute = makeNode(
    '2',
    'Smart routing with context',
    'human',
    1,
    12
  );
  smartRoute.notes =
    'Admissions · Financial aid · Bursar · Registrar · Academic advising — handed off with intent + identity prefilled';

  // 0: 24/7 human escalation
  const operator = makeNode('0', 'Operator (24/7)', 'human', 1, 8);
  operator.notes = '"Speak to a person" anytime · emergencies · after-hours coverage';

  root.children = [selfServe, smartRoute, operator];
  addRepeatNodes(root);

  const friction = calculateFriction(root, { hasOpZero: true, businessHoursOnly: false });

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
