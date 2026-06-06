import KpiTile from './KpiTile';
import type { FrictionResult, Reference } from '../lib/types';
import type { BrandIndex } from '../lib/brand';
import { questionListForWorkspace } from '../lib/friction';
import { brandBand, type Band } from '../lib/scoreColor';
import { SHOW_OPTIMIZED_IVR } from '../lib/config';
import {
  Activity,
  Layers,
  Globe,
  Phone,
  Sparkles,
  HelpCircle,
  MessageCircle,
} from './Icons';

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return 'n/a';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Wait-time bands (client-specified thresholds, June 2026):
//   ≤ 1:30 (90s)   green   — voice-agent territory, target zone
//   1:30 – 3:00     yellow  — single-menu IVR typical range
//   > 3:00 (180s)  red     — multi-menu / hold-heavy lines
// Three-band system here is intentionally coarser than the 5-band CXI
// scale — the conversation is "how long do real callers wait" and three
// buckets map cleanly to the pitch.
function waitBand(sec: number): Band {
  if (!Number.isFinite(sec) || sec <= 90) return 'green';
  if (sec <= 180) return 'yellow';
  return 'red';
}

// Generic "count of bad things" mapping. 0 is best, each unit pushes up
// the score. 3 bands per client spec — no blue, no pink.
function countBand(n: number): Band {
  if (!Number.isFinite(n) || n <= 0) return 'green';
  if (n <= 2) return 'yellow';
  return 'red';
}

// Menu depth uses the same shape but starts "green" at zero (no menu),
// which is the K-12 / no-IVR pattern.
function depthBand(d: number): Band {
  if (!Number.isFinite(d) || d <= 0) return 'green';
  if (d <= 2) return 'yellow';
  return 'red';
}

// Question coverage is a fraction; we score it as a brand-style metric
// (high = good) on the 0-100 scale.
function coverageBand(covered: number, total: number): Band {
  if (total <= 0) return 'red';
  return brandBand((covered / total) * 100);
}

interface Props {
  current: FrictionResult;
  recommended: FrictionResult;
  voiceAgent: FrictionResult;
  webRefs: Reference[];
  phoneRefs: Reference[];
  brandCurrent: BrandIndex;
  brandRecommended: BrandIndex;
  brandVoice: BrandIndex;
  brandFormula: string;
  todayQuestionsCovered: number;
  // Workspace id ('universities' | 'k12-districts') — picks the right
  // question list (student questions vs. K-12 departments) and gates the
  // K-12-specific UI variant.
  workspaceId: string;
  // Count of tenants in the current workspace — surfaced in the K-12
  // Always-Available tile's formula tooltip as evidence ("derived from
  // N K-12 lines we've audited").
  workspaceTenantCount: number;
}

export default function MetricCards({
  current,
  recommended,
  voiceAgent,
  webRefs,
  phoneRefs,
  brandCurrent,
  brandRecommended,
  brandVoice,
  brandFormula,
  todayQuestionsCovered,
  workspaceId,
  workspaceTenantCount,
}: Props) {
  const questionList = questionListForWorkspace(workspaceId);
  const isK12 = workspaceId === 'k12-districts';
  const k12AuditCount = workspaceTenantCount;
  const Q = questionList.length;
  const ivrCovered = Math.round(recommended.selfServiceCoverage * Q);
  const voiceCovered = Math.round(voiceAgent.selfServiceCoverage * Q);

  // CXI = Customer Experience Index = 100 − Friction (high=good).
  // Pre-compute once so the tile and the delta can't drift.
  const cxiToday = 100 - current.totalScore;
  const cxiIvr = 100 - recommended.totalScore;
  const cxiVoice = 100 - voiceAgent.totalScore;
  const cxiDelta = cxiVoice - cxiToday; // positive = improvement
  // Brand Reputation is high=good, so the win is voice minus current
  // (positive = reputation gained).
  const brandDelta = brandVoice.score - brandCurrent.score;
  const coverageDelta = voiceCovered - todayQuestionsCovered;

  // CXI grade — matches the brandBand thresholds so the label and the
  // color of the cell always agree.
  const cxiGrade = (v: number) =>
    v >= 80
      ? 'Excellent'
      : v >= 60
        ? 'Strong'
        : v >= 40
          ? 'Average'
          : v >= 20
            ? 'Poor'
            : 'Critical';

  const cxiFormula =
    `CXI · Customer Experience Index = 100 − Friction Score\n` +
    `(high = good. 100 is best-in-class; <20 is critical.)\n\n` +
    `Today    = 100 − ${current.totalScore} = ${cxiToday}\n` +
    `Voice AI = 100 − ${voiceAgent.totalScore} = ${cxiVoice}\n\n` +
    `Friction is computed from menu depth, dead-end rate, wait time,\n` +
    `clarity, and unreachable %. See the tree panels below for the\n` +
    `node-level reason each score lands where it does.`;

  const coverageNoun = isK12 ? 'departments' : 'student questions';
  const coverageFormula =
    `Coverage = ${coverageNoun} the IVR routes to without a human / ${Q} ${isK12 ? 'departments' : 'typical questions'} tracked\n\n` +
    `Tracked ${isK12 ? 'departments' : 'questions'}:\n` +
    questionList.map((q, i) => `  ${i + 1}. ${q}`).join('\n');

  // Wait Time tile values
  const todayWait = current.avgDurationSec ?? 0;
  const ivrWait = recommended.avgDurationSec ?? 0;
  const voiceWait = voiceAgent.avgDurationSec ?? 0;
  const waitDelta = Math.max(0, todayWait - voiceWait);

  // Today caption depends on the failure mode: queueOnly = pure hold,
  // otherwise the time is split between menu listening and transfer wait.
  const todayWaitCaption = current.queueOnly
    ? '100% on hold'
    : todayWait >= 60
      ? 'hold + menu'
      : 'on the line';

  const waitFormula =
    `Wait Time = average end-to-end call duration measured on our test calls\n` +
    `(seconds per node, averaged across every path our crawler walked).\n\n` +
    `Today (${fmtDuration(todayWait)}): the actual measured average.\n` +
    `  Includes the call-recording disclaimer (~12s on most lines), greeting,\n` +
    `  menu read, any hold-music, and the transfer or human pickup wait.\n\n` +
    (SHOW_OPTIMIZED_IVR
      ? `Optimized IVR (${fmtDuration(ivrWait)}): projected. Same call-recording\n` +
        `  baseline (~12s) + greeting + a flat one-level menu + transfer.\n` +
        `  Reduction comes from removing nested submenus and 24/7 operator zero.\n\n`
      : '') +
    `Voice Agent (${fmtDuration(voiceWait)}): projected. Recording disclaimer\n` +
    `  (~12s) + brief greeting + intent capture + answer or routed transfer.\n` +
    `  Disclaimer is unavoidable — every legitimate phone system reads it.\n\n` +
    `Time-to-resolution (what callers actually feel) drops far faster than the\n` +
    `total wall-clock duration: ${SHOW_OPTIMIZED_IVR ? 'an IVR forces a "hang up & redial" for any\n  second topic, while the voice agent handles unlimited topics in one call' : 'today\'s IVRs force a "hang up & redial" for any\n  second topic, while the voice agent handles unlimited topics in one call'}.`;

  // Pre-bind the dashboard-wide Optimized-IVR flag once so each tile call
  // below stays terse. Flipping SHOW_OPTIMIZED_IVR in lib/config.ts toggles
  // the middle column across every tile here without further edits.
  const hideIvr = !SHOW_OPTIMIZED_IVR;

  return (
    <div className="space-y-3">
      {/* Hero row, the four numbers the pitch lives on */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          hideIvr={hideIvr}
          icon={<Activity size={14} />}
          label="CXI · Customer Experience Index"
          today={{
            value: cxiToday,
            caption: cxiGrade(cxiToday),
            band: brandBand(cxiToday),
          }}
          ivr={{
            value: cxiIvr,
            caption: cxiGrade(cxiIvr),
            band: brandBand(cxiIvr),
          }}
          voice={{
            value: cxiVoice,
            caption: cxiGrade(cxiVoice),
            band: brandBand(cxiVoice),
          }}
          delta={{ value: `up ${cxiDelta} pts`, tone: 'good' }}
          emphasis
          formula={cxiFormula}
        />
        {isK12 ? (
          // K-12 swap: department coverage is noisy without normalized data
          // (Saloni's call). Replace with the 24/7 availability story which
          // is the actual K-12 talking point — phone line should match what
          // families can read on the website any time of day.
          <KpiTile
            hideIvr={hideIvr}
            icon={<HelpCircle size={14} />}
            label="Always Available"
            today={{
              // Short value mirrors the "24 / 7" framing on the voice cell
              // so the two numbers visually contrast at a glance. Full
              // "office hours" story moves into the caption.
              value: 'M–F 8–5',
              caption: 'office hours',
              band: 'red',
            }}
            ivr={{
              value: 'M–F 8–5',
              caption: 'office hours',
              band: 'red',
            }}
            voice={{
              value: '24 / 7',
              caption: 'any time of day',
              band: 'green',
            }}
            delta={{ value: 'always on', tone: 'good' }}
            emphasis
            formula={
              `Always Available = hours the line can actually answer a caller.\n\n` +
              `Today: humans only. Outside office hours the call hits voicemail\n` +
              `or goes unanswered — families with after-hours questions get nothing.\n\n` +
              `Voice Agent: 24 / 7. Same answers the front office gives during\n` +
              `the day, available the moment a parent calls. The phone line\n` +
              `finally matches what the website says at 8 PM on a Sunday.\n\n` +
              `Departments the AI handles (derived from ${k12AuditCount} K-12 lines\n` +
              `we've audited):\n` +
              questionList.map((q, i) => `  ${i + 1}. ${q}`).join('\n')
            }
          />
        ) : (
          <KpiTile
            hideIvr={hideIvr}
            icon={<HelpCircle size={14} />}
            label="Question Coverage"
            today={{
              value: `${todayQuestionsCovered} of ${Q}`,
              caption: todayQuestionsCovered === 0 ? 'all need human' : 'partial',
              band: coverageBand(todayQuestionsCovered, Q),
            }}
            ivr={{
              value: `${ivrCovered} of ${Q}`,
              caption: ivrCovered > todayQuestionsCovered
                ? '+FAQ leaf'
                : 'preserves today',
              band: coverageBand(ivrCovered, Q),
            }}
            voice={{
              value: `${voiceCovered} of ${Q}`,
              caption: 'AI self resolves',
              band: coverageBand(voiceCovered, Q),
            }}
            delta={{ value: `up ${coverageDelta} answered`, tone: 'good' }}
            emphasis
            formula={coverageFormula}
          />
        )}
        <KpiTile
          hideIvr={hideIvr}
          icon={<Phone size={14} />}
          label="Wait Time"
          today={{
            value: fmtDuration(todayWait),
            caption: todayWaitCaption,
            band: waitBand(todayWait),
          }}
          ivr={{
            value: fmtDuration(ivrWait),
            caption: 'menu + route',
            band: waitBand(ivrWait),
          }}
          voice={{
            value: fmtDuration(voiceWait),
            caption: 'instant intent',
            band: waitBand(voiceWait),
          }}
          delta={{ value: `${fmtDuration(waitDelta)} saved`, tone: 'good' }}
          emphasis
          formula={waitFormula}
        />
        <KpiTile
          hideIvr={hideIvr}
          icon={<Sparkles size={14} />}
          label="Brand Reputation"
          today={{
            value: brandCurrent.score,
            caption: brandCurrent.label,
            band: brandBand(brandCurrent.score),
          }}
          ivr={{
            value: brandRecommended.score,
            caption: brandRecommended.label,
            band: brandBand(brandRecommended.score),
          }}
          voice={{
            value: brandVoice.score,
            caption: brandVoice.label,
            band: brandBand(brandVoice.score),
          }}
          delta={{ value: `up ${brandDelta} pts`, tone: 'good' }}
          emphasis
          formula={brandFormula}
        />
      </div>

      {/* Secondary row, structural metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          hideIvr={hideIvr}
          icon={<Layers size={14} />}
          label="Menu Levels"
          today={{
            value: current.maxDepth,
            caption: 'levels deep',
            band: depthBand(current.maxDepth),
          }}
          ivr={{
            value: recommended.maxDepth,
            caption: 'flat menu',
            band: depthBand(recommended.maxDepth),
          }}
          voice={{
            value: voiceAgent.maxDepth,
            caption: 'no menu',
            band: depthBand(voiceAgent.maxDepth),
          }}
          delta={{
            value: `down ${current.maxDepth - voiceAgent.maxDepth}`,
            tone: 'good',
          }}
        />
        <KpiTile
          hideIvr={hideIvr}
          icon={<Globe size={14} />}
          label="Web Redirects"
          today={{
            value: webRefs.length,
            caption: 'links spoken',
            band: countBand(webRefs.length),
          }}
          ivr={{ value: 0, caption: 'no offload', band: countBand(0) }}
          voice={{ value: 0, caption: 'no offload', band: countBand(0) }}
          delta={{
            value: webRefs.length > 0 ? `down ${webRefs.length}` : 'none',
            tone: webRefs.length > 0 ? 'good' : 'neutral',
          }}
          refs={webRefs}
        />
        <KpiTile
          hideIvr={hideIvr}
          icon={<Phone size={14} />}
          label="Phone Transfers"
          today={{
            value: phoneRefs.length,
            caption: 'numbers given',
            band: countBand(phoneRefs.length),
          }}
          ivr={{ value: 0, caption: 'no offload', band: countBand(0) }}
          voice={{ value: 0, caption: 'no offload', band: countBand(0) }}
          delta={{
            value: phoneRefs.length > 0 ? `down ${phoneRefs.length}` : 'none',
            tone: phoneRefs.length > 0 ? 'good' : 'neutral',
          }}
          refs={phoneRefs}
        />
        <KpiTile
          hideIvr={hideIvr}
          icon={<MessageCircle size={14} />}
          label="Topics per Call"
          today={{
            value: 1,
            caption: 'hang up, redial',
            band: 'red',
          }}
          ivr={{
            value: 1,
            caption: 'one menu path',
            band: 'red',
          }}
          voice={{
            value: '∞',
            caption: 'multi-topic chat',
            band: 'green',
          }}
          delta={{ value: 'unlimited', tone: 'good' }}
        />
      </div>
    </div>
  );
}
