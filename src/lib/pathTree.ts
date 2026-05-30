import { extractReferences } from './extract';
import type {
  MenuItemRow,
  OutcomeType,
  OverviewRow,
  Reference,
  ScriptCaptureRow,
  TreeNode,
} from './types';

function pathKey(p: unknown): string {
  if (p === null || p === undefined || p === '') return 'root';
  return String(p);
}

function digitStr(d: unknown): string {
  if (d === null || d === undefined) return '';
  return String(d).replace(/\.0$/, '');
}

function normalizeOutcome(t: string | null | undefined): OutcomeType {
  const s = (t || '').toLowerCase();
  if (s.includes('human') || s.includes('operator') || s.includes('transfer'))
    return 'human';
  if (s.includes('voicemail')) return 'voicemail';
  if (s.includes('dead')) return 'dead_end';
  if (s.includes('submenu')) return 'submenu';
  return 'info';
}

function findLabel(
  menu: MenuItemRow[],
  callId: string | null,
  digit: string,
  parentPath: string
): { label: string; type: string } {
  // Prefer a Menu Mapping row whose callId matches the parent of this node
  // (i.e., this digit was offered AT THAT parent's menu).
  for (const m of menu) {
    if (m.callId === callId && digitStr(m.digit) === digit) {
      return {
        label: m.option_label || `Digit ${digit}`,
        type: m.type || 'submenu',
      };
    }
  }
  // Fall back: search for any row whose path matches this node's path
  for (const m of menu) {
    if (pathKey(m.path) === parentPath && digitStr(m.digit) === digit) {
      return {
        label: m.option_label || `Digit ${digit}`,
        type: m.type || 'submenu',
      };
    }
  }
  return { label: `Digit ${digit}`, type: 'unknown' };
}

export interface BuiltTree {
  root: TreeNode;
  prunedCount: number;
  prunedPaths: string[];
  allNodes: TreeNode[]; // post-prune, in BFS order
}

// Builds the tree from Overview.path strings, then prunes ghost children of
// any human/voicemail node (caused by the upstream WorkflowB loop bug).
export function buildPathTree(
  overview: OverviewRow[],
  menu: MenuItemRow[],
  scripts: ScriptCaptureRow[],
  university: string,
  ourPhone: string | number | null
): BuiltTree {
  const refs = extractReferences(overview, menu, scripts, university, ourPhone);
  const urlByPath = new Map<string, Reference[]>();
  const phoneByPath = new Map<string, Reference[]>();
  for (const r of refs.urls) {
    if (!urlByPath.has(r.sourcePath)) urlByPath.set(r.sourcePath, []);
    urlByPath.get(r.sourcePath)!.push(r);
  }
  for (const r of refs.phones) {
    if (!phoneByPath.has(r.sourcePath)) phoneByPath.set(r.sourcePath, []);
    phoneByPath.get(r.sourcePath)!.push(r);
  }

  const root: TreeNode = {
    id: 'root',
    digit: '',
    label: 'Main menu',
    type: 'submenu',
    outcomeType: 'submenu',
    depth: 0,
    durationSec: null,
    hasOperator: false,
    isRecommended: false,
    notes: null,
    urls: urlByPath.get('root') || [],
    phones: phoneByPath.get('root') || [],
    children: [],
  };

  const byPath = new Map<string, TreeNode>();
  byPath.set('root', root);

  // Build all digit_test nodes from Overview
  const tests = overview
    .filter(
      (o) => o.university === university && o.mode === 'digit_test' && o.path !== null
    )
    .sort((a, b) => (Number(a.depth) || 0) - (Number(b.depth) || 0));

  for (const o of tests) {
    const path = pathKey(o.path);
    const parts = path.split('>');
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('>') : 'root';
    const digit = digitStr(o.digit_tested);
    const { label, type } = findLabel(menu, o.parent_call_id, digit, parentPath);

    const node: TreeNode = {
      id: path,
      digit,
      label,
      type,
      outcomeType: normalizeOutcome(o.outcome_type),
      depth: Number(o.depth) || parts.length,
      durationSec: o.duration === null ? null : Number(o.duration),
      hasOperator: !!o.live_operator_available,
      isRecommended: false,
      notes: o.notes,
      urls: urlByPath.get(path) || [],
      phones: phoneByPath.get(path) || [],
      children: [],
    };
    byPath.set(path, node);
  }

  // Attach children
  for (const [path, node] of byPath) {
    if (path === 'root') continue;
    const parts = path.split('>');
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('>') : 'root';
    const parent = byPath.get(parentPath);
    if (parent) parent.children.push(node);
  }

  // Sort children by digit (numeric first, then * #)
  const digitOrder = (d: string) => {
    if (/^\d+$/.test(d)) return parseInt(d, 10);
    return d === '*' ? 100 : d === '#' ? 101 : 200;
  };
  function sortRec(n: TreeNode) {
    n.children.sort((a, b) => digitOrder(a.digit) - digitOrder(b.digit));
    n.children.forEach(sortRec);
  }
  sortRec(root);

  // PRUNE: drop children of any human or voicemail node — they're ghosts
  // produced by the WorkflowB loop bug.
  const prunedPaths: string[] = [];
  function prune(n: TreeNode) {
    if (
      (n.outcomeType === 'human' || n.outcomeType === 'voicemail') &&
      n.children.length > 0
    ) {
      for (const c of n.children) collectAll(c, prunedPaths);
      n.children = [];
      return;
    }
    n.children.forEach(prune);
  }
  function collectAll(n: TreeNode, out: string[]) {
    out.push(n.id);
    n.children.forEach((c) => collectAll(c, out));
  }
  prune(root);

  // ADD '#' REPEAT-MENU NODES: every IVR menu offers '#' (or pound) to repeat
  // the current menu. The Overview sheet doesn't have these as digit_test rows
  // because they're not navigated to — they just loop. We pull them from
  // MenuMapping rows where digit === '#' and attach them to the corresponding
  // tree node so the visualization is honest about every option callers hear.
  function addRepeatNodes(parent: TreeNode) {
    if (parent.children.length === 0) return; // only menus get a # child
    if (parent.children.some((c) => c.digit === '#')) return;
    // confirm there's a matching '#' MenuMapping row for this parent's call
    // (root has no callId, so always show #; otherwise look up by callId)
    const parentRow =
      parent.id === 'root'
        ? null
        : overview.find((o) => pathKey(o.path) === parent.id && o.university === university);
    const callId = parent.id === 'root' ? null : parentRow?.callId ?? null;
    const hasHashInData =
      parent.id === 'root'
        ? menu.some(
            (m) =>
              m.university === university &&
              digitStr(m.digit) === '#' &&
              (m.parent_call_id === null || m.menu_level === 0)
          )
        : menu.some(
            (m) => m.university === university && digitStr(m.digit) === '#' && m.callId === callId
          );
    if (!hasHashInData) {
      // fall through anyway — universally true that menus have #, we'll show it
    }
    const repeatChild: TreeNode = {
      id: `${parent.id}::#`,
      digit: '#',
      label: 'Repeat current menu',
      type: 'repeat',
      outcomeType: 'repeat',
      depth: parent.depth + 1,
      durationSec: null,
      hasOperator: false,
      isRecommended: false,
      notes: null,
      urls: [],
      phones: [],
      children: [],
    };
    parent.children.push(repeatChild);
  }
  // walk every existing branching node and add # — but only one level at a time,
  // since adding # to a node makes it have children but # itself is a leaf.
  function walkAndAddRepeat(n: TreeNode) {
    addRepeatNodes(n);
    n.children.forEach((c) => {
      if (c.outcomeType !== 'repeat') walkAndAddRepeat(c);
    });
  }
  walkAndAddRepeat(root);

  // RECLASSIFY: any node that still has REAL (non-ghost) children is a
  // submenu by definition, regardless of what the raw data said. Source
  // data sometimes labels a node 'dead_end' (e.g., "caller pressed 1 then
  // nothing → line dropped") even though that node DOES have legitimate
  // child branches that were tested separately. Visually that's confusing.
  //
  // We ignore ghost children here: a dead_end node with only ghost children
  // (un-pressed options the agent merely heard) is still a dead_end — the
  // ghosts are visualization sugar, not evidence the branch leads somewhere.
  function reclassifyBranchNodes(n: TreeNode) {
    const realKids = n.children.filter((c) => !c.isGhost);
    if (realKids.length > 0 && n.id !== 'root') {
      n.outcomeType = 'submenu';
    }
    n.children.forEach(reclassifyBranchNodes);
  }
  reclassifyBranchNodes(root);

  // GHOST NODES: every option the caller hears, even ones we never dialed.
  // Menu Mapping logs the option text from each test call; if our crawler
  // didn't drill into that branch (BFS budget, or call hung up before we
  // could), the option still exists for the caller. Add it as a faded
  // ghost node so the graph reflects the WHOLE tree, not just walked paths.
  //
  // MM `path` = the PARENT path where this option is offered (single
  // segment — null/empty for the root menu, otherwise the digit of the
  // depth-1 ancestor). This is the same convention findLabel() above uses.
  // The option's own tree path is therefore parentPath + '>' + digit.
  //
  // Dedup by own path: a 9-option menu sampled across 10 test calls
  // produces 90 MM rows for those 9 options — we want 9 ghosts, not 90.
  //
  // ECHO FILTER: most IVRs replay the root menu after a digit press fails
  // to land on a submenu (CSUN, USC, UIUC, Notre Dame, etc. all do this).
  // The LLM that extracts MM rows logs those replays as deeper-level rows
  // — sometimes with exact root labels, sometimes paraphrased. Detect
  // echo calls at the call level: if a test call's extracted options are
  // mostly variants of root labels, the call was an echo round and ALL
  // its rows should be suppressed.
  const normLabel = (s: string | null | undefined): string =>
    (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Two-token-overlap fuzzy match catches the paraphrase cases (e.g.
  // "Password resets and technical account issues" vs root's
  // "Password resets, account issues, technical questions").
  const tokens = (s: string): Set<string> => {
    const t = s.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    return new Set(t);
  };
  const rootLabels = new Set<string>();
  const rootTokenSets: Set<string>[] = [];
  for (const m of menu) {
    if (m.university !== university) continue;
    const isRoot =
      m.menu_level === 0 ||
      ((m.menu_level ?? 0) >= 1 && (m.path === null || m.path === ''));
    if (isRoot && m.option_label) {
      const n = normLabel(m.option_label);
      rootLabels.add(n);
      rootTokenSets.push(tokens(n));
    }
  }
  const looksLikeRoot = (label: string | null | undefined): boolean => {
    if (!label) return false;
    const n = normLabel(label);
    if (rootLabels.has(n)) return true;
    const t = tokens(n);
    if (t.size === 0) return false;
    for (const rt of rootTokenSets) {
      if (rt.size === 0) continue;
      // Count distinct token overlap. Require ≥2 shared tokens AND
      // overlap covers ≥60% of the smaller set — strict enough that an
      // accidental shared word like "office" doesn't trigger a match.
      let overlap = 0;
      for (const w of t) if (rt.has(w)) overlap++;
      const smaller = Math.min(t.size, rt.size);
      if (overlap >= 2 && overlap / smaller >= 0.6) return true;
    }
    return false;
  };
  // Group non-root rows by callId. A call is an "echo round" if ≥50% of
  // the options it extracted look like root labels; all its rows then get
  // dropped from ghost rendering.
  const ECHO_CALL_THRESHOLD = 0.5;
  const rowsByCall = new Map<string, MenuItemRow[]>();
  for (const m of menu) {
    if (m.university !== university || !m.callId) continue;
    const isRoot =
      m.menu_level === 0 ||
      ((m.menu_level ?? 0) >= 1 && (m.path === null || m.path === ''));
    if (isRoot) continue;
    const arr = rowsByCall.get(m.callId) ?? [];
    arr.push(m);
    rowsByCall.set(m.callId, arr);
  }
  const echoCallIds = new Set<string>();
  for (const [cid, rows] of rowsByCall) {
    if (rows.length < 3) continue; // sample too small to judge
    const hits = rows.filter((r) => looksLikeRoot(r.option_label)).length;
    if (hits / rows.length >= ECHO_CALL_THRESHOLD) echoCallIds.add(cid);
  }
  type GhostSeed = { row: MenuItemRow; parentPath: string };
  const ghostByOwnPath = new Map<string, GhostSeed>();
  // Only treat a row as a ghost if its digit is a real keypad value.
  // The LLM occasionally extracts non-digit "options" like "any" (from
  // "press any key to..."), "star", "0-9", etc. — those aren't navigable
  // menu entries and shouldn't appear in the tree.
  const isRealDigit = (d: string): boolean => /^[0-9*]$/.test(d);
  for (const m of menu) {
    if (m.university !== university) continue;
    const d = digitStr(m.digit);
    if (!d || d === '#') continue; // # is handled by addRepeatNodes
    if (!isRealDigit(d)) continue;
    const parentPath =
      m.path === null || m.path === undefined || m.path === ''
        ? 'root'
        : pathKey(m.path);
    const ownPath = parentPath === 'root' ? d : `${parentPath}>${d}`;
    if (byPath.has(ownPath)) continue; // already a real (dialed) node
    if (ghostByOwnPath.has(ownPath)) continue;
    // Echo guard: skip the whole call's output if it was an echo round,
    // and as a per-row fallback skip any deeper row whose label fuzzy-
    // matches a root option.
    if (m.callId && echoCallIds.has(m.callId)) continue;
    if (parentPath !== 'root' && looksLikeRoot(m.option_label)) continue;
    ghostByOwnPath.set(ownPath, { row: m, parentPath });
  }
  for (const [ownPath, { row, parentPath }] of ghostByOwnPath) {
    const parent = byPath.get(parentPath);
    if (!parent) continue; // parent isn't a dialed node — can't place this ghost
    // Skip ALL terminal parents. human/voicemail: WorkflowB loop-bug guard.
    // dead_end: when the crawler confirmed the branch goes nowhere, MM rows
    // logged at that path are unreliable (transcript often just contains
    // the IVR re-prompting, not real submenu options). Attaching ghosts
    // there clutters the tree with options the caller can't actually reach.
    if (
      parent.outcomeType === 'human' ||
      parent.outcomeType === 'voicemail' ||
      parent.outcomeType === 'dead_end'
    )
      continue;
    const d = digitStr(row.digit);
    const ghost: TreeNode = {
      id: ownPath,
      digit: d,
      label: row.option_label || `Digit ${d}`,
      type: row.type || 'submenu',
      outcomeType: normalizeOutcome(row.type),
      depth: parent.depth + 1,
      durationSec: null,
      hasOperator: false,
      isRecommended: false,
      isGhost: true,
      notes: null,
      urls: [],
      phones: [],
      children: [],
    };
    parent.children.push(ghost);
    byPath.set(ownPath, ghost);
  }
  // Re-sort children now that ghosts are mixed in alongside dialed nodes.
  sortRec(root);
  // Re-run branch reclassification — a previously-leaf node that just gained
  // ghost children needs to read as a submenu now.
  reclassifyBranchNodes(root);

  // MARK UNEXPLORED SUBMENUS: a dialed submenu node with no children
  // (neither real nor ghost) means the crawler confirmed a submenu existed
  // but we never captured its contents — either the crawler didn't drill
  // in, or the LLM only extracted root-menu echoes for that call. Render
  // these distinctly so the dashboard doesn't claim a dropdown that's
  // empty.
  function markUnexplored(n: TreeNode) {
    if (
      n.id !== 'root' &&
      n.outcomeType === 'submenu' &&
      n.children.length === 0 &&
      !n.isGhost
    ) {
      n.outcomeType = 'submenu_unexplored';
    }
    n.children.forEach(markUnexplored);
  }
  markUnexplored(root);

  // BFS list of remaining nodes
  const allNodes: TreeNode[] = [];
  const queue: TreeNode[] = [root];
  while (queue.length) {
    const n = queue.shift()!;
    allNodes.push(n);
    queue.push(...n.children);
  }

  return { root, prunedCount: prunedPaths.length, prunedPaths, allNodes };
}
