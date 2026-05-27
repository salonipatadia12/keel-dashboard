import type { FrictionResult, TreeNode } from './types';
import type { MenuStats } from './menuStats';

// A single prescriptive recommendation, derived from comparing the
// current IVR tree (and its observed friction) to the trees the
// dashboard will actually render below. Every claim ties to a number
// the reader can verify by counting nodes in the rendered graphs.
export interface AuditBullet {
  // Short label, e.g. "Flatten the menu" — used as a leading anchor.
  topic: string;
  // The full prescriptive sentence with concrete before/after numbers.
  detail: string;
}

function countLeavesByOutcome(
  root: TreeNode,
  outcome: TreeNode['outcomeType']
): number {
  let n = 0;
  const walk = (node: TreeNode) => {
    if (
      node !== root &&
      node.outcomeType !== 'repeat' &&
      node.outcomeType === outcome &&
      node.children.filter((c) => c.outcomeType !== 'repeat').length === 0
    ) {
      n += 1;
    }
    node.children.forEach(walk);
  };
  walk(root);
  return n;
}

function countLeaves(root: TreeNode): number {
  let n = 0;
  const walk = (node: TreeNode) => {
    if (
      node !== root &&
      node.outcomeType !== 'repeat' &&
      node.children.filter((c) => c.outcomeType !== 'repeat').length === 0
    ) {
      n += 1;
    }
    node.children.forEach(walk);
  };
  walk(root);
  return n;
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '~';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Build a prescriptive recommendations list whose numbers all come from
// the actual trees being rendered. The goal is that every bullet tallies
// with what the reader sees in the Optimized IVR and Voice Agent panels
// below — no "5-7 buckets" when the tree shows 9, no "0/12 questions
// covered" when the dashboard already counts 6.
export function buildAuditNarrative(args: {
  currentFriction: FrictionResult;
  currentMenu: MenuStats;
  recommendedTree: TreeNode;
  recommendedFriction: FrictionResult;
  voiceAgentTree: TreeNode;
  voiceAgentFriction: FrictionResult;
  todayQuestionsCovered: number;
  questionsTotal: number;
  hasNoIvr?: boolean;
}): AuditBullet[] {
  const {
    currentFriction: cur,
    currentMenu,
    recommendedTree,
    recommendedFriction: rec,
    voiceAgentFriction: va,
    todayQuestionsCovered,
    questionsTotal,
    hasNoIvr,
  } = args;

  const bullets: AuditBullet[] = [];

  // 1) Friction headline — derived from totals visible at the top of
  //    each tree panel.
  bullets.push({
    topic: 'Cut friction end-to-end',
    detail:
      `Friction drops from ${cur.totalScore} (${cur.grade}) today to ` +
      `${rec.totalScore} (${rec.grade}) with the Optimized IVR and ` +
      `${va.totalScore} (${va.grade}) with the Voice Agent — a ${cur.totalScore - va.totalScore}-point swing visible on the three trees below.`,
  });

  // 2) Flatten the menu — uses the actual unique level-0 count and the
  //    exact leaf count from the rendered Optimized IVR tree.
  const recRealLeaves = countLeaves(recommendedTree);
  const recHumanLeaves = countLeavesByOutcome(recommendedTree, 'human');
  const recInfoLeaves = countLeavesByOutcome(recommendedTree, 'info');
  const level0Today = currentMenu.uniqueLevel0.length;

  if (hasNoIvr) {
    bullets.push({
      topic: 'Add an IVR',
      detail:
        `Today this line has no menu at all — every caller waits for the same person or hits voicemail. ` +
        `The Optimized IVR introduces ${recRealLeaves} routed options at depth 1 (${recHumanLeaves} department leaves, ${recInfoLeaves} self-serve), plus 24/7 operator-zero.`,
    });
  } else {
    bullets.push({
      topic: 'Flatten the menu',
      detail:
        `Replace today's ${level0Today}-option, ${cur.maxDepth}-level menu with a flat ${recRealLeaves}-option Optimized IVR at depth ${rec.maxDepth} ` +
        `(${recHumanLeaves} intent-aligned department leaves, ${recInfoLeaves} self-serve, plus operator-zero). ` +
        `Voice Agent collapses it further to ${countLeaves(args.voiceAgentTree)} leaves at depth ${va.maxDepth} — the trees below show every node.`,
    });
  }

  // 3) Question coverage — uses today's measured info-leaf coverage and
  //    the Optimized IVR's preserved coverage (no regression).
  const recCovered = Math.round(rec.selfServiceCoverage * questionsTotal);
  const vaCovered = Math.round(va.selfServiceCoverage * questionsTotal);
  bullets.push({
    topic: 'Cover more questions without a human',
    detail:
      `Today's IVR resolves ${todayQuestionsCovered}/${questionsTotal} typical questions on its own. ` +
      `The Optimized IVR's FAQ leaf takes that to ${recCovered}/${questionsTotal}. ` +
      `The Voice Agent reaches ${vaCovered}/${questionsTotal} — same questions, no human needed.`,
  });

  // 4) Dead ends — exact count from the current tree, exact count from
  //    the Optimized IVR (which is always 0 by construction).
  if (cur.deadEndCount > 0) {
    bullets.push({
      topic: 'Eliminate dead-end paths',
      detail:
        `${cur.deadEndCount} ${cur.deadEndCount === 1 ? 'path goes' : 'paths go'} nowhere on today's IVR. ` +
        `Optimized IVR: ${rec.deadEndCount}. Voice Agent: ${va.deadEndCount}.`,
    });
  }

  // 5) Wait time — uses the actual measured/projected averages shown on
  //    the Wait Time tile.
  if (cur.avgDurationSec > 0) {
    bullets.push({
      topic: 'Cut wait time',
      detail:
        `Average call duration drops from ${fmtDuration(cur.avgDurationSec)} today to ${fmtDuration(rec.avgDurationSec)} (Optimized IVR) and ${fmtDuration(va.avgDurationSec)} (Voice Agent). ` +
        `Time-to-resolution drops even faster: the Voice Agent handles unlimited topics in one call versus today's hang-up-and-redial loop.`,
    });
  }

  // 6) Operator-zero coverage — only surface if today's tree lacks it
  //    and the Optimized IVR adds it.
  if (!cur.hasOpZero && rec.hasOpZero) {
    bullets.push({
      topic: 'Add 24/7 operator-zero',
      detail:
        `Today the only escape hatch is staffed business hours; nights and weekends drop to voicemail. ` +
        `Both Optimized IVR and Voice Agent expose operator-zero around the clock.`,
    });
  }

  return bullets;
}
