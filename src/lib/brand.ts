import type { FrictionResult } from './types';

export interface BrandIndex {
  score: number;
  label: 'At Risk' | 'Below Bar' | 'Solid' | 'Best-in-Class';
  perception: string[];
}

const PERCEPTION_BAD = [
  'Bureaucratic',
  'Hard to reach',
  'Indifferent to the caller',
];
const PERCEPTION_GOOD = ['Modern', 'Responsive', 'Caller-first'];

export function brandReputationIndex(friction: FrictionResult): BrandIndex {
  const humanRatio = friction.humanReachableCount / friction.totalNodes;
  const score = Math.round(
    0.5 * (100 - friction.totalScore) +
      0.3 * humanRatio * 100 +
      0.2 * (100 - friction.components.clarity)
  );

  let label: BrandIndex['label'];
  if (score <= 25) label = 'At Risk';
  else if (score <= 50) label = 'Below Bar';
  else if (score <= 75) label = 'Solid';
  else label = 'Best-in-Class';

  const perception = score >= 60 ? PERCEPTION_GOOD : PERCEPTION_BAD;
  return { score: Math.max(0, Math.min(100, score)), label, perception };
}

export function brandNarrative(
  friction: FrictionResult,
  isRecommended: boolean
): string {
  const dePct = Math.round(
    (friction.deadEndCount / Math.max(friction.totalNodes, 1)) * 100
  );
  if (isRecommended) {
    return `Callers reach the right person in ${friction.maxDepth} levels with no dead ends. The brand reads as: modern, responsive, caller-first.`;
  }
  return `Callers wait ${friction.maxDepth} menu levels and hit a dead-end on ${dePct}% of paths. The brand reads as: bureaucratic, hard to reach, indifferent to the caller.`;
}
