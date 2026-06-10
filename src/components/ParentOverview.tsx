import { brandClasses } from '../lib/scoreColor';
import { cxi } from '../lib/cxi';
import { ArrowRight, ArrowLeft, Layers } from './Icons';

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface ChildSummary {
  id: string;
  name: string;
  childKind: string | null;
  currentScore: number; // friction score (raw)
  voiceAgentScore: number;
  todayWaitSec: number;
  voiceWaitSec: number;
  maxDepth: number;
  hasNoIvr: boolean;
}

interface Props {
  parentLabel: string;
  workspaceLabel: string;
  children: ChildSummary[];
  onSelectChild: (id: string) => void;
  onBack: () => void;
}

// Display order for child kinds: district office first, then by school
// level (high → middle → elementary → adult → preschool).
const CHILD_KIND_ORDER: Record<string, number> = {
  'district-office': 0,
  'high': 1,
  'high-private': 1,
  'middle': 2,
  'elementary': 3,
  'adult': 4,
  'preschool': 5,
};

export default function ParentOverview({
  parentLabel,
  workspaceLabel,
  children,
  onSelectChild,
  onBack,
}: Props) {
  const sorted = [...children].sort((a, b) => {
    const ka = CHILD_KIND_ORDER[a.childKind ?? ''] ?? 99;
    const kb = CHILD_KIND_ORDER[b.childKind ?? ''] ?? 99;
    if (ka !== kb) return ka - kb;
    return a.name.localeCompare(b.name);
  });

  // Only IVR-having children count toward the rollup averages. A campus
  // with no IVR (direct-to-human line) would skew the CXI baseline down.
  const scored = sorted.filter((c) => !c.hasNoIvr);
  const avgCxiToday =
    scored.length > 0
      ? scored.reduce((s, c) => s + cxi(c.currentScore), 0) / scored.length
      : 0;
  const avgCxiVoice =
    scored.length > 0
      ? scored.reduce((s, c) => s + cxi(c.voiceAgentScore), 0) / scored.length
      : 0;
  const avgWaitToday =
    scored.length > 0
      ? scored.reduce((s, c) => s + c.todayWaitSec, 0) / scored.length
      : 0;
  const avgWaitVoice =
    scored.length > 0
      ? scored.reduce((s, c) => s + c.voiceWaitSec, 0) / scored.length
      : 0;
  const avgDepth =
    scored.length > 0
      ? scored.reduce((s, c) => s + c.maxDepth, 0) / scored.length
      : 0;
  const lift = avgCxiVoice - avgCxiToday;

  const todayBand = brandClasses(avgCxiToday);
  const voiceBand = brandClasses(avgCxiVoice);

  return (
    <section>
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[12px] text-muted hover:text-ink2 transition"
      >
        <ArrowLeft size={12} />
        <span>{workspaceLabel}</span>
        <span className="text-line2">/</span>
        <span className="font-semibold text-ink2">{parentLabel}</span>
      </button>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={13} className="text-accent" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
            Organization rollup
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight leading-none text-ink mb-2">
          {parentLabel}
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-snug">
          {children.length} {children.length === 1 ? 'campus' : 'campuses'} audited
          {scored.length < children.length &&
            ` · ${children.length - scored.length} with no IVR (excluded from averages)`}
          . Click any campus below to open its individual report.
        </p>
      </div>

      {/* Rollup KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <RollupStat
          label="Avg CXI today"
          value={Math.round(avgCxiToday)}
          bandClass={`${todayBand.cellBg} ${todayBand.cellBorder}`}
          suffix="/100"
        />
        <RollupStat
          label="Avg CXI with voice"
          value={Math.round(avgCxiVoice)}
          bandClass={`${voiceBand.cellBg} ${voiceBand.cellBorder}`}
          suffix="/100"
        />
        <RollupStat
          label="Avg wait time today"
          value={fmtDuration(avgWaitToday)}
          bandClass="bg-band_red_dark border-band_red/30"
          textValue
        />
        <RollupStat
          label="Avg menu depth"
          value={avgDepth.toFixed(1)}
          bandClass={
            avgDepth >= 3
              ? 'bg-band_red_dark border-band_red/30'
              : avgDepth >= 1
                ? 'bg-band_yellow border-band_yellow_dark/30'
                : 'bg-band_green_dark border-band_green/30'
          }
          textValue
        />
      </div>

      <div className="rounded-xl bg-good/10 border border-good/30 px-4 py-3 mb-6 text-[13px] text-good">
        <span className="font-semibold">Group lift:</span> a voice agent
        rollout across all {scored.length} campuses raises the average CXI
        by{' '}
        <span className="font-bold tabular-nums">
          {Math.round(lift)} points
        </span>
        , and cuts average wait time from{' '}
        <span className="font-bold tabular-nums">{fmtDuration(avgWaitToday)}</span>{' '}
        to{' '}
        <span className="font-bold tabular-nums">{fmtDuration(avgWaitVoice)}</span>
        .
      </div>

      {/* Children grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((c) => {
          // Only compute CXI badges for children with IVR — no-IVR
          // children render a "No IVR" pill instead and the numbers
          // would be synthetic.
          const childCxi = c.hasNoIvr ? null : cxi(c.currentScore);
          const childVoiceCxi = c.hasNoIvr ? null : cxi(c.voiceAgentScore);
          const childToday = childCxi !== null ? brandClasses(childCxi) : null;
          const childVoice = childVoiceCxi !== null ? brandClasses(childVoiceCxi) : null;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectChild(c.id)}
              className="group text-left rounded-lg bg-surface border border-line shadow-card hover:border-line2 hover:shadow-lg transition p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted2 font-semibold mb-1">
                  {childKindLabel(c.childKind)}
                </div>
                <div className="text-[14px] font-semibold tracking-tight text-ink truncate">
                  {c.name}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                  {c.hasNoIvr ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-surface text-muted2 border-line2">
                      No IVR
                    </span>
                  ) : (
                    <>
                      <span>Wait {fmtDuration(c.todayWaitSec)}</span>
                      <span className="text-line2">·</span>
                      <span>Depth {c.maxDepth}</span>
                    </>
                  )}
                </div>
              </div>
              {childToday && childVoice && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[12px] font-bold tabular-nums px-2 py-1 rounded border ${childToday.pillBg} ${childToday.pillText} ${childToday.pillBorder}`}
                    title="Today CXI"
                  >
                    {childCxi}
                  </span>
                  <span className="text-muted2 text-[10px]">→</span>
                  <span
                    className={`text-[12px] font-bold tabular-nums px-2 py-1 rounded border ${childVoice.pillBg} ${childVoice.pillText} ${childVoice.pillBorder}`}
                    title="Voice-agent CXI"
                  >
                    {childVoiceCxi}
                  </span>
                </div>
              )}
              <span className="text-muted2 group-hover:text-accent transition shrink-0">
                <ArrowRight size={14} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function childKindLabel(kind: string | null): string {
  if (!kind) return 'Campus';
  if (kind === 'district-office') return 'District office';
  if (kind === 'high') return 'High school';
  if (kind === 'high-private') return 'Private high school';
  if (kind === 'middle') return 'Middle school';
  if (kind === 'elementary') return 'Elementary school';
  if (kind === 'adult') return 'Adult school';
  if (kind === 'preschool') return 'Preschool';
  return kind;
}

function RollupStat({
  label,
  value,
  bandClass,
  suffix,
  textValue,
}: {
  label: string;
  value: number | string;
  bandClass: string;
  suffix?: string;
  textValue?: boolean;
}) {
  // Yellow cells use #FFEF00 fill, which white text can't sit on (AA fails).
  // The brand_X_dark variants (red, green) pair with white. Detect the
  // yellow case by the literal class string so the rollup tiles read on
  // every band.
  const isYellow = bandClass.includes('bg-band_yellow') && !bandClass.includes('bg-band_yellow_dark');
  const labelClass = isYellow ? 'text-ink/85' : 'text-white/85';
  const valueClass = isYellow ? 'text-ink' : 'text-white';
  return (
    <div
      className={`rounded-lg border px-3 py-3 flex flex-col gap-1.5 ${bandClass}`}
    >
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${labelClass}`}>
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums leading-none ${valueClass} ${textValue ? '' : ''}`}>
        {value}
        {suffix && (
          <span className="text-[12px] font-normal opacity-80 ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
