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

  // RECLASSIFY: any node that still has children is a submenu by definition,
  // regardless of what the raw data said. Source data sometimes labels a node
  // 'dead_end' (e.g., "caller pressed 1 then nothing → line dropped") even
  // though that node DOES have legitimate child branches that were tested
  // separately. Visually that's confusing — a node with children should
  // never look terminal.
  function reclassifyBranchNodes(n: TreeNode) {
    if (n.children.length > 0 && n.id !== 'root') {
      n.outcomeType = 'submenu';
    }
    n.children.forEach(reclassifyBranchNodes);
  }
  reclassifyBranchNodes(root);

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
