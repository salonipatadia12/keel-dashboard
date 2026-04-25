import type { FrictionResult, FrictionScoreRow, TreeNode } from './types';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface FrictionInputs {
  hasOpZero: boolean;
}

// Convert a row from the Friction Score sheet (WorkflowC output) into the
// FrictionResult shape the dashboard consumes. WorkflowC is the production
// scorer — we trust its numbers when the row exists.
export function frictionFromSheet(row: FrictionScoreRow): FrictionResult {
  const score = Math.round(row.total_score);
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

// Computes the friction score from a tree (post-pruning) plus a couple of
// system flags. Mirrors the 7-component model documented in
// FRICTION_SCORE/friction_scoring_algorithm_guide.md.
export function calculateFriction(
  root: TreeNode,
  inputs: FrictionInputs
): FrictionResult {
  // Flatten everything except the synthetic root and the meta '#' repeat nodes
  // (# is a "press # to repeat" option — it's heard but doesn't navigate
  // anywhere, so it shouldn't count toward depth, options, or dead-ends.)
  const all: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    if (n.digit !== '' && n.outcomeType !== 'repeat') all.push(n);
    n.children.forEach(walk);
  };
  walk(root);

  const totalNodes = Math.max(all.length, 1);
  const maxDepth = all.length ? Math.max(...all.map((n) => n.depth)) : 1;

  // avg options = average #real-children (excluding '#') of any branching node
  const branching: number[] = [];
  const collectBranch = (n: TreeNode) => {
    const realKids = n.children.filter((c) => c.outcomeType !== 'repeat');
    if (realKids.length > 0) branching.push(realKids.length);
    n.children.forEach(collectBranch);
  };
  collectBranch(root);
  const avgOptions =
    branching.length > 0
      ? branching.reduce((a, b) => a + b, 0) / branching.length
      : 0;

  const deadEnds = all.filter((n) => n.outcomeType === 'dead_end').length;
  const voicemails = all.filter((n) => n.outcomeType === 'voicemail').length;
  const humanCount = all.filter((n) => n.outcomeType === 'human').length;
  const humanRatio = humanCount / totalNodes;

  const depthScore = clamp((maxDepth - 3) * 25);
  const optionsScore = clamp((avgOptions - 5) * 20);
  const estTime = maxDepth * 20 + avgOptions * 3;
  const timeScore = clamp((estTime - 60) / 0.6);
  const deadEndScore = clamp(((deadEnds + voicemails * 0.5) / totalNodes) * 100);
  let agentAccessScore = 100 - humanRatio * 100;
  if (inputs.hasOpZero) agentAccessScore -= 20;
  agentAccessScore = clamp(agentAccessScore);
  const clarityScore = clamp(avgOptions * 5 + maxDepth * 8);
  const operatorScore = inputs.hasOpZero ? 0 : 100;

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
    depthScore * 0.15 +
    optionsScore * 0.15 +
    timeScore * 0.2 +
    deadEndScore * 0.15 +
    agentAccessScore * 0.1 +
    clarityScore * 0.15 +
    operatorScore * 0.1;
  const totalScore = Math.round(total);

  // Tighter thresholds than the v1 rubric — better matches what an enterprise
  // brand audience would call "best in class" vs "needs work."
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
