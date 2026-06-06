import { useEffect, useRef, useState, useMemo } from 'react';
import type { UniversityData } from '../lib/types';
import { brandClasses } from '../lib/scoreColor';
import { cxi } from '../lib/cxi';

interface Props {
  universities: UniversityData[];
  activeId: string;
  onSelect: (id: string) => void;
  // `total` is the underlying friction score (high=bad). The selector
  // converts it to CXI = 100 − friction at render time so the badge
  // direction matches every other surface (high=good).
  scoresById: Record<
    string,
    { total: number; grade: string; hasNoIvr?: boolean }
  >;
}

function shortLabel(name: string): string {
  return name.split(',')[0];
}

function scoreOf(
  u: UniversityData,
  scoresById: Record<
    string,
    { total: number; grade: string; hasNoIvr?: boolean }
  >
): { cxiScore: number | null; grade: string; hasNoIvr: boolean } {
  const score = scoresById[u.id];
  if (!score) return { cxiScore: null, grade: '', hasNoIvr: false };
  return {
    cxiScore: cxi(score.total),
    grade: score.grade,
    hasNoIvr: !!score.hasNoIvr,
  };
}

// Color the CXI badge using the high=good band palette: green ≥80,
// blue 60-79, yellow 40-59, pink 20-39, red <20. Matches the KPI tile
// and Rankings page direction.
function badgeClasses(cxiScore: number | null): string {
  if (cxiScore === null) return 'bg-surface text-muted border-line';
  const c = brandClasses(cxiScore);
  return `${c.pillBg} ${c.pillText} ${c.pillBorder}`;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={
      'transition-transform duration-150 ' + (open ? 'rotate-180' : '')
    }
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx={11} cy={11} r={7} />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export default function UniversitySelector({
  universities,
  activeId,
  onSelect,
  scoresById,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = universities.find((u) => u.id === activeId) ?? universities[0];

  // Sort by CXI ascending (worst first — same as the Rankings page).
  // Tenants with no score (e.g. malformed sheet) sort to the bottom.
  const sorted = useMemo(() => {
    return [...universities].sort((a, b) => {
      const sa = scoreOf(a, scoresById).cxiScore ?? 101;
      const sb = scoreOf(b, scoresById).cxiScore ?? 101;
      return sa - sb;
    });
  }, [universities, scoresById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((u) => u.name.toLowerCase().includes(q));
  }, [sorted, query]);

  // Group by parentOrg so multi-campus orgs (e.g. Torrance USD) render as
  // a labeled parent header with its children indented underneath. Single-
  // tenant parents (or universities without parentOrg) render flat. Sort
  // order within a parent: district-office first, then by childKind, then
  // by friction score.
  const grouped = useMemo(() => {
    const childKindOrder: Record<string, number> = {
      'district-office': 0,
      'high': 1,
      'middle': 2,
      'elementary': 3,
      'adult': 4,
      'preschool': 5,
    };
    const byParent = new Map<string | null, UniversityData[]>();
    for (const u of filtered) {
      const key = u.parentOrg ?? null;
      const list = byParent.get(key) ?? [];
      list.push(u);
      byParent.set(key, list);
    }
    type Group = {
      parentOrg: string | null;
      parentLabel: string;
      children: UniversityData[];
    };
    const groups: Group[] = [];
    for (const [parentOrg, kids] of byParent.entries()) {
      // Sort priority within a group:
      //   1. childKind order (district-office → high → middle → ...) when
      //      tenants carry a childKind. K-12 campuses use this.
      //   2. CXI ascending (worst first) when no childKind is set. The
      //      universities workspace has no parentOrg today, so every
      //      university lands in a single null-parent group and gets
      //      sorted by CXI here — restores the "lead with the most-
      //      broken line" flow that the earlier alphabetical fallback
      //      was silently breaking.
      const sortedKids = [...kids].sort((a, b) => {
        const ka = childKindOrder[a.childKind ?? ''] ?? 99;
        const kb = childKindOrder[b.childKind ?? ''] ?? 99;
        if (ka !== kb) return ka - kb;
        const sa = scoreOf(a, scoresById).cxiScore ?? 101;
        const sb = scoreOf(b, scoresById).cxiScore ?? 101;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      });
      // Parent label = the district-office display name with "— District
      // Office" stripped, falling back to the first child's name.
      const districtChild = sortedKids.find((k) => k.childKind === 'district-office');
      const parentLabel = districtChild
        ? districtChild.name.replace(/\s+[—-]\s+District Office\s*$/i, '')
        : (sortedKids[0]?.name ?? 'Standalone');
      groups.push({ parentOrg, parentLabel, children: sortedKids });
    }
    return groups;
  }, [filtered, scoresById]);
  const hasMultiCampusGroup = grouped.some((g) => g.parentOrg !== null && g.children.length > 1);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const activeScore = scoreOf(active, scoresById);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          'group flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-md border bg-surface/60 ' +
          'hover:bg-surface hover:border-line2 transition ' +
          (open ? 'border-accent/60 ring-1 ring-accent/20' : 'border-line')
        }
      >
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold">
          {hasMultiCampusGroup ? 'Campus' : 'University'}
        </span>
        <span className="h-3.5 w-px bg-line" />
        <span className="text-[13px] font-semibold tracking-tight text-ink">
          {shortLabel(active.name).replace(/^.*?\s+[—-]\s+/, '')}
        </span>
        {activeScore.hasNoIvr ? (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-surface text-muted2 border-line2"
            title="No IVR — calls route directly to a person or voicemail"
          >
            No IVR
          </span>
        ) : (
          activeScore.cxiScore !== null && (
            <span
              className={
                'text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ' +
                badgeClasses(activeScore.cxiScore)
              }
              title="CXI score"
            >
              {activeScore.cxiScore}
            </span>
          )
        )}
        <span className="text-muted ml-0.5">
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-[360px] rounded-lg border border-line bg-bg shadow-2xl overflow-hidden"
          role="listbox"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface/60">
            <span className="text-muted"><SearchIcon /></span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${universities.length} ${hasMultiCampusGroup ? 'campuses' : 'universities'}…`}
              className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[10px] text-muted hover:text-ink2 transition"
              >
                clear
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-[12px] text-muted text-center">
                No matches for "{query}"
              </div>
            ) : (
              grouped.map((group) => {
                const isMultiCampus =
                  group.parentOrg !== null && group.children.length > 1;
                return (
                  <div key={group.parentOrg ?? '__flat__'} className={isMultiCampus ? 'mb-1' : ''}>
                    {isMultiCampus && (
                      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted2 font-semibold flex items-center justify-between">
                        <span>{group.parentLabel}</span>
                        <span className="tabular-nums text-muted2">
                          {group.children.length} campuses
                        </span>
                      </div>
                    )}
                    {group.children.map((u) => {
                      const isActive = u.id === active.id;
                      const { cxiScore, hasNoIvr } = scoreOf(u, scoresById);
                      const childLabel = isMultiCampus
                        ? // Strip the parent-org prefix so "Torrance USD — District
                          // Office" reads as just "District Office" under the parent
                          // header. Leaves "Adams Elementary" etc. untouched since
                          // they don't carry the prefix.
                          u.name.replace(/^.*?\s+[—-]\s+/, '')
                        : u.name;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSelect(u.id);
                            setOpen(false);
                            setQuery('');
                          }}
                          role="option"
                          aria-selected={isActive}
                          className={
                            'w-full flex items-center gap-3 py-2 text-left transition ' +
                            (isMultiCampus ? 'pl-6 pr-3 ' : 'px-3 ') +
                            (isActive
                              ? 'bg-accent/10 text-ink'
                              : 'text-ink2 hover:bg-surface')
                          }
                        >
                          <span
                            className={
                              'flex-1 text-[12.5px] tracking-tight truncate ' +
                              (isActive ? 'font-semibold text-ink' : 'font-medium')
                            }
                          >
                            {childLabel}
                          </span>
                          {hasNoIvr ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-surface text-muted2 border-line2">
                              No IVR
                            </span>
                          ) : (
                            cxiScore !== null && (
                              <span
                                className={
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ' +
                                  badgeClasses(cxiScore)
                                }
                                title="CXI score"
                              >
                                {cxiScore}
                              </span>
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-line bg-surface/40 flex items-center justify-between text-[10px] text-muted">
            <span>
              {filtered.length} of {universities.length}
            </span>
            <span className="tabular-nums">sorted by CXI · worst first</span>
          </div>
        </div>
      )}
    </div>
  );
}
