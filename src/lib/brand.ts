import type { FrictionResult } from './types';

export interface BrandIndex {
  score: number;
  label: 'At Risk' | 'Below Bar' | 'Solid' | 'Best in Class';
  perception: string[];
  // Formula breakdown — surfaced in the UI so the number isn't a black box
  breakdown: {
    frictionInverse: number;
    humanRatio: number;
    clarityInverse: number;
    formula: string;
  };
}

const PERCEPTION_BAD = ['Bureaucratic', 'Hard to reach', 'Indifferent'];
const PERCEPTION_GOOD = ['Modern', 'Responsive', 'Caller first'];

export function brandReputationIndex(friction: FrictionResult): BrandIndex {
  // Humans AND AI agents both count as "the brand actually responded".
  // A voice agent answering in 8 seconds is not a worse outcome than a
  // human answering in 8 seconds — for brand perception it's better
  // (no hold time, 24/7).
  const responderRatioPct = Math.round(
    ((friction.humanReachableCount + friction.aiReachableCount) /
      Math.max(friction.totalNodes, 1)) *
      100
  );
  const frictionInverse = Math.max(0, 100 - friction.totalScore);
  const clarityInverse = Math.max(0, 100 - friction.components.clarity);

  let score = Math.round(
    0.5 * frictionInverse + 0.3 * responderRatioPct + 0.2 * clarityInverse
  );
  // Forced-queue IVRs (no menu, no self-service, no parallel routing) feel
  // antiquated and unprofessional regardless of how friendly the human on the
  // other end is. Penalize directly.
  if (friction.queueOnly) score -= 30;

  let label: BrandIndex['label'];
  if (score <= 25) label = 'At Risk';
  else if (score <= 50) label = 'Below Bar';
  else if (score <= 75) label = 'Solid';
  else label = 'Best in Class';

  const perception = score >= 60 ? PERCEPTION_GOOD : PERCEPTION_BAD;

  const formula =
    `BRI = 50% × (100 minus friction)\n     + 30% × responder reachability %\n     + 20% × (100 minus clarity)\n` +
    `\n` +
    `    = 50% × ${frictionInverse}\n` +
    `    + 30% × ${responderRatioPct}\n` +
    `    + 20% × ${clarityInverse}\n` +
    `    = ${score} / 100`;

  return {
    score: Math.max(0, Math.min(100, score)),
    label,
    perception,
    breakdown: {
      frictionInverse,
      humanRatio: responderRatioPct,
      clarityInverse,
      formula,
    },
  };
}

export function brandNarrative(
  friction: FrictionResult,
  isRecommended: boolean
): string {
  const dePct = Math.round(
    (friction.deadEndCount / Math.max(friction.totalNodes, 1)) * 100
  );
  if (isRecommended) {
    return `Callers reach the right person in ${friction.maxDepth} levels with no dead ends. The brand reads as modern, responsive, caller first.`;
  }
  return `Callers wait ${friction.maxDepth} menu levels and hit a dead end on ${dePct}% of paths. The brand reads as bureaucratic, hard to reach, indifferent.`;
}
