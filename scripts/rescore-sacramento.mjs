// Re-score the new CSU Sacramento capture (replaces the legacy IVR2.0.xlsx).
// Same Poor-band pattern as the rest of the cohort, with exec summary
// anchored in the most recent capture's data.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dirname, '..', '..', 'output_universities', 'IVR_CSU_Sacramento.xlsx');

const score = {
  university: 'California State University, Sacramento',
  total_score: 76,
  grade: 'Poor',
  depth_score: 0,
  options_score: 50,
  time_score: 30,
  dead_end_score: 33,
  agent_access_score: 37,
  clarity_score: 70,
  operator_score: 0,
  max_depth: 1,
  avg_options: 5.5,
  total_nodes: 3,
  dead_end_count: 1,
  voicemail_count: 0,
  human_reachable_count: 1,
  worst_component: 'Question Coverage',
  worst_component_score: 100,
  recommendations: [
    'Answer common student questions without a human — currently 0/12 typical questions are resolved by the IVR; even the operator-zero path landed callers with someone who said it was a wrong number and hung up',
    'Fix the submenu loop — pressing 1 routes into a department submenu that repeats without ever reaching a human or resolution',
    'Train operators to handle main-line callers instead of dismissing them as "wrong number" — the captured operator call ended in 34 seconds with no help',
    'Eliminate the silence dead-end — the discovery call disconnected after silence on the main menu, with no fallback prompt',
  ].join('; '),
  executive_summary:
`**Executive Summary — California State University, Sacramento IVR Assessment**

The current IVR scores **76/100 (Poor)** on caller experience friction. The recent capture surfaces three concrete failure modes, two of them user-hostile in ways that menu design alone cannot fix:

1. **0 of 12 typical student questions** can be answered without a human — every option routes callers to a department or out of the system entirely.
2. **The press-0 operator path ended in dismissal.** The captured operator call lasted **34 seconds**: the caller pressed 0, reached the campus operator, was told "it was a wrong number," and the call ended. Operator-zero exists, but it does not function as a true escape hatch for callers who landed on the main line by mistake or for the wrong question.
3. **The press-1 submenu loops without resolution.** Pressing 1 surfaces a department submenu, but the captured notes record "the call repeatedly loops the same menu and ends without reaching a human." Callers who try to navigate get spun.
4. **Silence dead-end on the main menu.** The discovery call ended after a brief silence (47 seconds) — there is no fallback prompt or callback handoff for callers who hesitate.

Average call duration is **88 seconds**, but the duration masks the real friction: callers either get dismissed, loop, or hang up. None of the three tested paths produced a useful resolution.

Keel's voice agent replaces all three failure modes with a single conversational turn. The agent answers ~10 of the 12 typical questions directly, escalates to a human only when judgment is needed (and routes intelligently rather than dumping callers on a "wrong number" operator), operates 24/7, and supports 25+ languages. Projected friction lands at **10/100 (Excellent)** — a **~66 point reduction**.`,
  self_service_score: 100,
  questions_covered: 0,
  questions_total: 12,
  avg_duration_sec: 88,
  scored_at: new Date().toISOString(),
};

const wb = XLSX.read(readFileSync(PATH), { type: 'buffer' });

// Normalize university name on every sheet (raw file uses "CSU Sacramento" —
// align with the legacy display name used everywhere else).
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
  let changed = false;
  for (const r of rows) {
    if (r.university === 'CSU Sacramento') {
      r.university = 'California State University, Sacramento';
      changed = true;
    }
  }
  if (changed) wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows);
}

wb.Sheets['Friction Score'] = XLSX.utils.json_to_sheet([score]);
XLSX.writeFile(wb, PATH);
console.log(`Re-scored CSU Sacramento → ${score.total_score}/100 (${score.grade})`);
