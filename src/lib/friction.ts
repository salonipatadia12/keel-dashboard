import type { FrictionResult, FrictionScoreRow, TreeNode } from './types';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface FrictionInputs {
  hasOpZero: boolean;
  // True when most human-reachable paths only operate during limited business
  // hours (e.g., M-F 8a-5p) and the IVR has no 24/7 escalation. Drives the
  // operator-availability penalty.
  businessHoursOnly: boolean;
}

// Convert a row from the Friction Score sheet (WorkflowC output) into the
// FrictionResult shape the dashboard consumes. WorkflowC is the production
// scorer — we trust its numbers when the row exists.
export function frictionFromSheet(row: FrictionScoreRow): FrictionResult {
  // Apply the same friction floor used in calculateFriction — no system
  // has true zero friction.
  const score = Math.max(5, Math.round(row.total_score));
  let grade: FrictionResult['grade'];
  if (typeof row.grade === 'string' && ['Excellent', 'Good', 'Fair', 'Poor'].includes(row.grade)) {
    grade = row.grade as FrictionResult['grade'];
  } else if (score <= 15) grade = 'Excellent';
  else if (score <= 35) grade = 'Good';
  else if (score <= 65) grade = 'Fair';
  else grade = 'Poor';

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
    },
    maxDepth: row.max_depth,
    avgOptions: Math.round(row.avg_options * 10) / 10,
    totalNodes: row.total_nodes,
    deadEndCount: row.dead_end_count,
    voicemailCount: row.voicemail_count ?? 0,
    humanReachableCount: row.human_reachable_count,
    hasOpZero: row.operator_score === 0,
  };
}

// Caller-experience friction model.
//
// Caller pain is dominated by *time spent on the call*, not by menu structure.
// A 2-press IVR that takes 3 minutes to reach a human is a worse experience
// than a 4-press IVR that takes 30 seconds. So `time` (avg call duration),
// `clarity` (longest menu-prompt duration), and `operator` (24/7 vs business
// hours) carry the bulk of the weight.
//
// Calibration target: a "best realistic" Keel deployment lands the projected
// score in the 10–15 band — flat depth-1 menu, every department preserved as
// a 1-press leaf, 24/7 operator zero, self-service info path, ~8s avg call
// time. The current/today score is whatever the SAME model computes for the
// scraped IVR; it isn't pinned to a specific number.
//
//   time          30%  avg call duration to resolution
//   operator      25%  business-hours dependency (no 24/7 = stranded callers)
//   clarity       20%  longest menu prompt the caller had to sit through
//   options       12%  cognitive load from menu breadth (drives the 10–15 floor)
//   depth          8%  cognitive load from menu nesting
//   dead_end       3%  share of paths that go nowhere
//   agent_access   2%  ease of reaching a human (op-zero + low ratio = good)
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

  const components = {
    depth: depthScore,
    options: optionsScore,
    time: timeScore,
    dead_end: deadEndScore,
    agent_access: agentAccessScore,
    clarity: clarityScore,
    operator: operatorScore,
  };

  const total =
    timeScore * 0.3 +
    operatorScore * 0.25 +
    clarityScore * 0.2 +
    optionsScore * 0.12 +
    depthScore * 0.08 +
    deadEndScore * 0.03 +
    agentAccessScore * 0.02;
  // Friction floor of 5: no real-world phone system has zero friction. There's
  // always greeting time, intent capture, slight latency, occasional
  // mis-recognition, etc. The floor stops the model from claiming a "perfect"
  // score for any deployment, including the voice-agent projection.
  const totalScore = Math.max(5, Math.round(total));

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
  };
}
