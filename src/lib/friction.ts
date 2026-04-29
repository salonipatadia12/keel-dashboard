import type { FrictionResult, FrictionScoreRow, TreeNode } from './types';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface FrictionInputs {
  hasOpZero: boolean;
  // True when most human-reachable paths only operate during limited business
  // hours (e.g., M-F 8a-5p) and the IVR has no 24/7 escalation. Drives the
  // operator-availability penalty.
  businessHoursOnly: boolean;
  // Fraction (0-1) of the typical-student-questions list this IVR answers
  // WITHOUT requiring a human. CSU's existing IVR routes every question to
  // a human → 0. A flat IVR with one FAQ leaf might cover ~25%. A full
  // voice agent handles ~80%+. This is the heaviest single signal in the
  // model — caller pain is dominated by "I had to wait on hold to get an
  // answer the IVR could have given me."
  selfServiceCoverage: number;
}

// Canonical list of common student-side questions used to compute self-service
// coverage. Tuned for university-IVR audits; size is the denominator on the
// "Question Coverage" KPI tile in the dashboard.
export const TYPICAL_STUDENT_QUESTIONS = [
  'Admission deadlines and requirements',
  'Application status',
  'Financial aid / FAFSA status',
  'Tuition balance and billing',
  'Course registration',
  'Class schedule and catalog',
  'Transcript requests',
  'Account / password help',
  'Office hours and locations',
  'Add / drop classes',
  'GPA and academic standing',
  'Advisor and department contact info',
] as const;

// Convert a row from the Friction Score sheet (WorkflowC output) into the
// FrictionResult shape the dashboard consumes. WorkflowC is the production
// scorer — we trust its numbers when the row exists.
export function frictionFromSheet(row: FrictionScoreRow): FrictionResult {
  // Apply the same floor used in calculateFriction.
  const score = Math.max(10, Math.round(row.total_score));
  let grade: FrictionResult['grade'];
  if (typeof row.grade === 'string' && ['Excellent', 'Good', 'Fair', 'Poor'].includes(row.grade)) {
    grade = row.grade as FrictionResult['grade'];
  } else if (score <= 15) grade = 'Excellent';
  else if (score <= 35) grade = 'Good';
  else if (score <= 65) grade = 'Fair';
  else grade = 'Poor';

  const coverage =
    row.questions_covered != null && row.questions_total
      ? row.questions_covered / row.questions_total
      : 0;

  return {
    totalScore: score,
    grade,
    components: {
      depth: row.depth_score,
      options: row.options_score,
      time: row.time_score,
      dead_end: row.dead_end_score,
      agent_access: row.agent_access_score,
      clarity: row.clarity_score,
      operator: row.operator_score,
      self_service: row.self_service_score ?? 0,
    },
    maxDepth: row.max_depth,
    avgOptions: Math.round(row.avg_options * 10) / 10,
    totalNodes: row.total_nodes,
    deadEndCount: row.dead_end_count,
    voicemailCount: row.voicemail_count ?? 0,
    humanReachableCount: row.human_reachable_count,
    hasOpZero: row.operator_score === 0,
    selfServiceCoverage: coverage,
  };
}

// Caller-experience friction model.
//
// Two big drivers:
//   1. How long does the call take? (time / clarity / operator)
//   2. Could the IVR have answered without a human? (self_service)
//
// The single biggest pain point in the existing CSU IVR — and most
// university IVRs — is that callers wait several minutes on hold for
// answers the IVR could have given them in 5 seconds. So self_service
// (% of typical student questions covered without a human) is the
// heaviest individual weight.
//
// Calibration target: voice-agent projection lands at ~10 (top of the
// Excellent band, not zero — no real system has zero friction). Optimized
// digit-menu IVR lands ~25-30 (Good). Today's CSU IVR lands ~78 (Poor).
//
//   self_service  25%  questions answered without a human
//   time          22%  avg call duration to resolution
//   operator      18%  business-hours dependency
//   clarity       15%  longest menu prompt the caller had to sit through
//   options        8%  cognitive load from menu breadth
//   depth          5%  cognitive load from menu nesting
//   dead_end       4%  share of paths that go nowhere
//   agent_access   3%  ease of reaching a human
export function calculateFriction(
  root: TreeNode,
  inputs: FrictionInputs
): FrictionResult {
  // All non-root, non-repeat nodes
  const all: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    if (n.digit !== '' && n.outcomeType !== 'repeat') all.push(n);
    n.children.forEach(walk);
  };
  walk(root);

  const totalNodes = Math.max(all.length, 1);
  const maxDepth = all.length ? Math.max(...all.map((n) => n.depth)) : 1;

  // Branching factor (avg real children at branching nodes)
  const branching: number[] = [];
  const collectBranch = (n: TreeNode) => {
    const realKids = n.children.filter((c) => c.outcomeType !== 'repeat');
    if (realKids.length > 0) branching.push(realKids.length);
    n.children.forEach(collectBranch);
  };
  collectBranch(root);
  const avgOptions =
    branching.length > 0 ? branching.reduce((a, b) => a + b, 0) / branching.length : 0;

  // Outcome counts
  const deadEnds = all.filter((n) => n.outcomeType === 'dead_end').length;
  const voicemails = all.filter((n) => n.outcomeType === 'voicemail').length;
  const humanCount = all.filter((n) => n.outcomeType === 'human').length;
  const humanRatio = humanCount / totalNodes;

  // Duration analysis — the part this model is built around.
  const durations = all
    .map((n) => n.durationSec)
    .filter((d): d is number => d !== null && d !== undefined);
  const avgDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Longest single menu-listen the caller experienced (a branching node's
  // duration is how long the call sat at that menu).
  const branchDurations = all
    .filter((n) => n.children.filter((c) => c.outcomeType !== 'repeat').length > 0)
    .map((n) => n.durationSec)
    .filter((d): d is number => d !== null && d !== undefined);
  const maxBranchDuration = branchDurations.length > 0 ? Math.max(...branchDurations) : 0;

  // Component scores
  // time_score: 30s baseline → 0; 180s → 100. Sigmoid-ish via clamp.
  const timeScore = clamp((avgDuration - 30) / 1.5);

  // operator_score: business-hours dependency dominates; op-zero alone isn't
  // enough if those operators are only there 8-5 M-F.
  const operatorScore = inputs.businessHoursOnly
    ? 80
    : inputs.hasOpZero
      ? 0
      : 100;

  // clarity_score: longest menu prompt above 30s of cumulative listen time
  // gets penalized. CSU's "1" submenu sits at 185s — that's punishing.
  const clarityScore = clamp((maxBranchDuration - 30) * 1.0);

  // depth_score: any depth above 1 starts penalizing (depth 1 = direct routing).
  const depthScore = clamp((maxDepth - 1) * 30);

  // options_score: 3 options is the comfortable cap; each extra option adds 25.
  const optionsScore = clamp((avgOptions - 3) * 25);

  // dead_end_score: dead ends + voicemails as % of nodes.
  const deadEndScore = clamp(((deadEnds + voicemails * 0.5) / totalNodes) * 100);

  // agent_access_score: low when callers can reach a human easily (op-zero +
  // most paths route to one). High when humans are hidden behind menus or
  // unreachable.
  let agentAccessScore = 100 - humanRatio * 100;
  if (inputs.hasOpZero) agentAccessScore -= 20;
  agentAccessScore = clamp(agentAccessScore);

  // self_service_score: 0% coverage → 100 friction; 100% coverage → 0 friction.
  const selfServiceScore = clamp(
    (1 - clamp(inputs.selfServiceCoverage, 0, 1)) * 100
  );

  const components = {
    depth: depthScore,
    options: optionsScore,
    time: timeScore,
    dead_end: deadEndScore,
    agent_access: agentAccessScore,
    clarity: clarityScore,
    operator: operatorScore,
    self_service: selfServiceScore,
  };

  const total =
    selfServiceScore * 0.25 +
    timeScore * 0.22 +
    operatorScore * 0.18 +
    clarityScore * 0.15 +
    optionsScore * 0.08 +
    depthScore * 0.05 +
    deadEndScore * 0.04 +
    agentAccessScore * 0.03;
  // Friction floor of 10: no real-world phone system has zero friction. Even
  // an ideal voice agent has greeting time, intent capture, occasional
  // mis-recognition, latency, and ~20% of inquiries that legitimately need
  // a human. The floor lands the voice-agent projection at the top of the
  // [10, 15] target band.
  const totalScore = Math.max(10, Math.round(total));

  let grade: FrictionResult['grade'];
  if (totalScore <= 15) grade = 'Excellent';
  else if (totalScore <= 35) grade = 'Good';
  else if (totalScore <= 65) grade = 'Fair';
  else grade = 'Poor';

  return {
    totalScore,
    grade,
    components,
    maxDepth,
    avgOptions: Math.round(avgOptions * 10) / 10,
    totalNodes,
    deadEndCount: deadEnds,
    voicemailCount: voicemails,
    humanReachableCount: humanCount,
    hasOpZero: inputs.hasOpZero,
    selfServiceCoverage: clamp(inputs.selfServiceCoverage, 0, 1),
  };
}
