import type { MenuItemRow } from './types';

// The Menu Mapping sheet is a flat log of every option captured by every
// discovery call. A single IVR root menu gets re-captured on each test
// call, so a 9-option root menu sampled across 10 calls shows up as 90
// rows. Anywhere we surface counts to a human (TreePanel stat chips,
// worst-component recommendation text), we want the deduped numbers —
// not the raw row count.
//
// Dedup key: (menu_level, digit, normalized option_label, type). We do
// NOT include callId in the key, because the whole point is to collapse
// "the same option captured on different calls" into one row.

export interface MenuStats {
  // All rows, identical to the input — useful for the tree label lookup.
  raw: MenuItemRow[];
  // Deduped rows. One entry per distinct option across all levels.
  unique: MenuItemRow[];
  // Unique options at menu_level === 0 — the root menu the caller hears
  // first. This is the number that matters for the "Reduce first-level
  // menu from N options" recommendation.
  uniqueLevel0: MenuItemRow[];
  // Unique options grouped by menu_level for the directory view.
  uniqueByLevel: Map<number, MenuItemRow[]>;
  // Distinct callIds the captured rows came from. Tells us how many test
  // calls produced this menuMapping — useful for explaining the gap
  // between raw and unique counts.
  callCount: number;
}

function normLabel(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupKey(m: MenuItemRow): string {
  return [
    m.menu_level ?? 0,
    m.digit ?? '',
    normLabel(m.option_label),
    m.type ?? '',
  ].join('|');
}

export function computeMenuStats(menu: MenuItemRow[]): MenuStats {
  const seen = new Map<string, MenuItemRow>();
  for (const m of menu) {
    const key = dedupKey(m);
    if (!seen.has(key)) seen.set(key, m);
  }
  const unique = Array.from(seen.values());
  const uniqueByLevel = new Map<number, MenuItemRow[]>();
  for (const m of unique) {
    const level = m.menu_level ?? 0;
    const arr = uniqueByLevel.get(level) ?? [];
    arr.push(m);
    uniqueByLevel.set(level, arr);
  }
  const uniqueLevel0 = uniqueByLevel.get(0) ?? [];
  const callIds = new Set<string>();
  for (const m of menu) {
    if (m.callId) callIds.add(m.callId);
  }
  return {
    raw: menu,
    unique,
    uniqueLevel0,
    uniqueByLevel,
    callCount: callIds.size,
  };
}

// Rewrite an upstream-generated recommendation string to replace stale
// inline counts with dashboard-verified numbers. The n8n workflow that
// writes worst_component / recommendations often counts raw Menu
// Mapping rows (including cross-call duplicates) and reports
// questions_covered as 0 even when the tree exposes info leaves. This
// patches those inline claims so the deck doesn't quote a number the
// reader can disprove by counting the graph.
export function correctRecommendationText(
  text: string,
  stats: MenuStats,
  questionsCovered: number,
  questionsTotal: number
): string {
  if (!text) return text;
  let out = text;

  // "X/Y typical questions are resolved" — replace X with our computed
  // coverage number.
  out = out.replace(
    /(\d+)\s*\/\s*(\d+)\s+typical questions/gi,
    (_m, _a, _b) => `${questionsCovered}/${questionsTotal} typical questions`
  );

  // "X options in the menu tree" — total unique options, not row count.
  out = out.replace(
    /(\d+)\s+options in the menu tree/gi,
    () => `${stats.unique.length} unique options in the menu tree`
  );

  // "Reduce first-level menu from X options" — first-level = level 0.
  out = out.replace(
    /Reduce first-level menu from\s+(\d+)\s+options/gi,
    () => `Reduce first-level menu from ${stats.uniqueLevel0.length} options`
  );

  // Trailing rationale "— X choices is the root cause" referring back
  // to the same count.
  out = out.replace(
    /—\s+(\d+)\s+choices is the root cause/gi,
    () => `— ${stats.uniqueLevel0.length} choices is the root cause`
  );

  return out;
}
