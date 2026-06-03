import type { FrictionResult } from './types';

// Brand Reputation Index — high = good, low = bad. Computed internally as
// brand damage (50% friction + 30% unreachable + 20% clarity + 30 queue
// penalty) and then inverted at the end so the output reads as a positive
// reputation score (0 = catastrophic brand, 100 = best in class).
//
// The interface name stays `BrandIndex` for historical compatibility.
// Pair the score with `brandBand`/`brandClasses` (high=good) for color.
export interface BrandIndex {
  // 0 = brand-destroying line; 100 = best in class.
  score: number;
  label: 'Poor' | 'At Risk' | 'Average' | 'Strong' | 'Best in Class';
  perception: string[];
  // Formula breakdown — surfaced in the UI so the number isn't a black box.
  breakdown: {
    frictionContrib: number; // raw friction score (high=bad), contributing 50%
    unreachableRatio: number; // % of tree nodes that AREN'T a human/AI responder
    clarityContrib: number; // raw clarity penalty (high=bad), contributing 20%
    formula: string;
  };
}

const PERCEPTION_BAD = ['Bureaucratic', 'Hard to reach', 'Indifferent'];
const PERCEPTION_GOOD = ['Modern', 'Responsive', 'Caller first'];

export function brandReputationIndex(friction: FrictionResult): BrandIndex {
  // Humans AND AI agents both count as "the brand actually responded".
  // A voice agent answering in 8 seconds is not a worse outcome than a
  // human answering in 8 seconds.
  const responderRatioPct = Math.round(
    ((friction.humanReachableCount + friction.aiReachableCount) /
      Math.max(friction.totalNodes, 1)) *
      100
  );
  const unreachableRatioPct = Math.max(0, 100 - responderRatioPct);
  const frictionContrib = friction.totalScore;
  const clarityContrib = friction.components.clarity;

  let damage = Math.round(
    0.5 * frictionContrib + 0.3 * unreachableRatioPct + 0.2 * clarityContrib
  );
  // Forced-queue IVRs (no menu, no self-service, no parallel routing) feel
  // antiquated and unprofessional regardless of how friendly the human on
  // the other end is. Add 30 damage points directly.
  if (friction.queueOnly) damage += 30;
  damage = Math.max(0, Math.min(100, damage));

  // Invert: reputation = 100 - damage. High score now means a brand-positive
  // line; low score means the line is actively hurting the brand.
  const score = 100 - damage;

  // Bands align with the shared brandBand() thresholds (20-point buckets,
  // high=good) so the label and the cell color always agree.
  let label: BrandIndex['label'];
  if (score >= 80) label = 'Best in Class';
  else if (score >= 60) label = 'Strong';
  else if (score >= 40) label = 'Average';
  else if (score >= 20) label = 'At Risk';
  else label = 'Poor';

  // Perception flips at the "Strong" boundary — anything Average or worse
  // reads as a brand the caller fights against.
  const perception = score >= 60 ? PERCEPTION_GOOD : PERCEPTION_BAD;

  const queueLine = friction.queueOnly ? `    + 30 (forced-queue penalty)\n` : '';
  const formula =
    `Brand Reputation = 100 − Brand Damage\n` +
    `\n` +
    `Brand Damage = 50% × friction score\n` +
    `             + 30% × unreachable %\n` +
    `             + 20% × clarity penalty\n` +
    (friction.queueOnly ? `             + 30 (forced-queue penalty)\n` : '') +
    `\n` +
    `    = 50% × ${frictionContrib}\n` +
    `    + 30% × ${unreachableRatioPct}\n` +
    `    + 20% × ${clarityContrib}\n` +
    queueLine +
    `    = ${damage} damage  →  ${score} / 100 reputation`;

  return {
    score,
    label,
    perception,
    breakdown: {
      frictionContrib,
      unreachableRatio: unreachableRatioPct,
      clarityContrib,
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
