import type { FrictionResult } from './types';

// Brand Damage Index — high = bad, low = good. Matches the friction-score
// direction so every "high number is bad, low number is good" metric on
// the dashboard reads the same way.
//
// (Older versions of this file exposed a Brand Reputation Index where high
//  was good. We flipped the math in May 2026; the interface name stays as
//  BrandIndex but every consumer should treat `score` as damage now.)
export interface BrandIndex {
  // 0 = no brand damage; 100 = maximum.
  score: number;
  label: 'Minimal' | 'Low' | 'Moderate' | 'High' | 'Severe';
  perception: string[];
  // Formula breakdown — surfaced in the UI so the number isn't a black box.
  breakdown: {
    frictionContrib: number; // raw friction score, contributing 50%
    unreachableRatio: number; // % of tree nodes that AREN'T a human/AI responder
    clarityContrib: number; // raw clarity component, contributing 20%
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

  let score = Math.round(
    0.5 * frictionContrib + 0.3 * unreachableRatioPct + 0.2 * clarityContrib
  );
  // Forced-queue IVRs (no menu, no self-service, no parallel routing) feel
  // antiquated and unprofessional regardless of how friendly the human on
  // the other end is. Add 30 damage points directly.
  if (friction.queueOnly) score += 30;
  score = Math.max(0, Math.min(100, score));

  // Bands align with the shared frictionBand() thresholds (20-point buckets)
  // so the label and the cell color always agree.
  let label: BrandIndex['label'];
  if (score >= 80) label = 'Severe';
  else if (score >= 60) label = 'High';
  else if (score >= 40) label = 'Moderate';
  else if (score >= 20) label = 'Low';
  else label = 'Minimal';

  const perception = score >= 40 ? PERCEPTION_BAD : PERCEPTION_GOOD;

  const queueLine = friction.queueOnly ? `    + 30 (forced-queue penalty)\n` : '';
  const formula =
    `Brand Damage = 50% × friction score\n` +
    `             + 30% × unreachable %\n` +
    `             + 20% × clarity penalty\n` +
    (friction.queueOnly ? `             + 30 (forced-queue penalty)\n` : '') +
    `\n` +
    `    = 50% × ${frictionContrib}\n` +
    `    + 30% × ${unreachableRatioPct}\n` +
    `    + 20% × ${clarityContrib}\n` +
    queueLine +
    `    = ${score} / 100`;

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
