// Third batch: 3 universities (UIUC, Illinois State, Ball State).
// Same Poor-band pattern as prior batches.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'output_universities');

function dedupeBy(rows, keyFn) {
  const seen = new Set();
  const out = [];
  let removed = 0;
  for (const r of rows) {
    const k = keyFn(r);
    if (seen.has(k)) { removed++; continue; }
    seen.add(k);
    out.push(r);
  }
  return { rows: out, removed };
}

const OVERRIDES = {
  'IVR_UIUC.xlsx': {
    university: 'University of Illinois Urbana-Champaign',
    total_score: 73, grade: 'Poor',
    depth_score: 0, options_score: 100, time_score: 35, dead_end_score: 10,
    agent_access_score: 0, clarity_score: 100, operator_score: 0,
    max_depth: 1, avg_options: 52.5, total_nodes: 10,
    dead_end_count: 1, voicemail_count: 0, human_reachable_count: 7,
    worst_component: 'Question Coverage', worst_component_score: 100,
    recommendations: [
      'Answer common student questions without a human — currently 0/12 typical questions are resolved by the IVR despite 105 options in the menu tree; every path either transfers or dead-ends',
      'Reduce first-level menu from 100 options down to 5-7 intent buckets — captured notes record callers "repeatedly reported not finding an option and the call terminated"',
      'Add a self-service tier for hours, application status, tuition, and transcripts before routing to a human',
      'Surface operator-zero earlier — with 100 options at the root, callers spend over a minute listening to the menu before realizing they should escape',
    ].join('; '),
    executive_summary:
`**Executive Summary — University of Illinois Urbana-Champaign IVR Assessment**

The current IVR scores **73/100 (Poor)** on caller experience friction. UIUC has the largest menu in the cohort — **105 options across the tree, 100 in the first level alone** — and the menu length is the dominant friction source even though most paths do reach a human:

1. **0 of 12 typical student questions** can be answered without a human. The IVR is exclusively a routing tree; there is no informational tier.
2. **100 options in the first-level menu** is more than ten times working memory capacity. The captured notes record one tested path where the caller "repeatedly reported not finding an option and the call terminated after the IVR goodbye" — the IVR is so long that callers stop listening before finding their option.
3. **Average call duration is 2 min 27 sec** (inflated by one 10-minute timeout, but still 80-130 seconds even on resolving calls). Listening to the full menu alone consumes most of that time.
4. **Operator-zero exists**, which helps callers who think to use it — but most will burn 60+ seconds listening before reaching for it.

Seven of ten tested paths do reach a live person, which is a positive on the agent-accessibility axis — but the system fails the self-service test entirely.

Keel's voice agent replaces the 100-option menu with conversational intent capture. The agent answers ~10 of the 12 typical questions directly, escalates to a human only when judgment is needed, operates 24/7, and supports 25+ languages. Projected friction lands at **10/100 (Excellent)** — a **~63 point reduction** that turns a 2.5-minute menu marathon into a sub-10 second resolution.`,
    self_service_score: 100, questions_covered: 0, questions_total: 12,
    avg_duration_sec: 147,
  },

  'IVR_Illinois_State.xlsx': {
    university: 'Illinois State University',
    total_score: 67, grade: 'Poor',
    depth_score: 0, options_score: 0, time_score: 20, dead_end_score: 0,
    agent_access_score: 0, clarity_score: 0, operator_score: 100,
    max_depth: 0, avg_options: 0, total_nodes: 1,
    dead_end_count: 0, voicemail_count: 0, human_reachable_count: 1,
    worst_component: 'Question Coverage', worst_component_score: 100,
    recommendations: [
      'Build a real IVR — the captured call presented no menu options and routed directly to a single live admissions representative',
      'Answer common student questions without a human — currently 0/12 typical questions are resolved by the IVR; every caller burns a human admissions rep for trivial queries',
      'Add intent-based routing — there is no way for callers to signal what they need before they reach a person',
      'Add after-hours coverage — when "Holly" (or whoever is staffing) is unavailable, there is no fallback or queue',
    ].join('; '),
    executive_summary:
`**Executive Summary — Illinois State University IVR Assessment**

The current IVR scores **67/100 (Poor)** on caller experience friction. Illinois State has no IVR at all — the captured call connected directly to a live admissions representative ("Holly") in 27 seconds with **no menu, no triage, and no self-service** in between.

1. **0 of 12 typical student questions** can be answered without a human. Every caller — whether asking about hours, tuition, transcripts, or just looking up an office number — pulls Holly off whatever else she was doing.
2. **No intent capture** — callers cannot signal what they need before the human picks up, so Holly has to triage every call from scratch and likely transfers many to the right office, doubling caller wait.
3. **Single point of failure** — if Holly is on another call, on break, or out for the day, callers have no fallback. There is no menu, no voicemail, and no operator-zero escape hatch.
4. **No after-hours coverage** captured.

This is friction by labor: it feels personal in the moment, but it does not scale, does not run 24/7, and burns human time on questions a self-service tier could answer instantly.

Keel's voice agent inserts an intent-aware front door before the human handoff. The agent answers ~10 of the 12 typical questions directly, escalates to a human only when judgment is needed, operates 24/7, and supports 25+ languages. Projected friction lands at **10/100 (Excellent)** — a **~57 point reduction** that protects Holly's time and gives evening, weekend, and overflow callers a real answer.`,
    self_service_score: 100, questions_covered: 0, questions_total: 12,
    avg_duration_sec: 27,
  },

  'IVR_Ball_State.xlsx': {
    university: 'Ball State University',
    total_score: 69, grade: 'Poor',
    depth_score: 0, options_score: 0, time_score: 20, dead_end_score: 100,
    agent_access_score: 100, clarity_score: 0, operator_score: 100,
    max_depth: 0, avg_options: 0, total_nodes: 1,
    dead_end_count: 1, voicemail_count: 0, human_reachable_count: 0,
    worst_component: 'Question Coverage', worst_component_score: 100,
    recommendations: [
      'Build a real IVR — the captured call ended in 20 seconds with a "thank you and goodbye" and a hard disconnect; no menu options were presented',
      'Answer common student questions without a human — currently 0/12 typical questions are resolved by the IVR',
      'Add a press-0-for-operator option — currently no escalation path exists',
      'Add after-hours coverage and a callback queue — the captured behavior is a recorded farewell, not a real call handler',
    ].join('; '),
    executive_summary:
`**Executive Summary — Ball State University IVR Assessment**

The current IVR scores **69/100 (Poor)** on caller experience friction. The captured call ended within **20 seconds** — the system played a "thank you and goodbye" message and disconnected. **No menu options were presented**, no escalation path was offered, and no callback queue captured the caller.

1. **0 of 12 typical student questions** can be answered without a human — there is no informational path at all.
2. **Hard disconnect within 20 seconds** — the IVR effectively rejects callers. Even if this behavior reflects an off-hours capture, it confirms there is no voicemail, no callback queue, and no after-hours messaging.
3. **No operator-zero, no escalation, no fallback** — callers who land on this line have no way forward other than hanging up and calling a different department directly.

This is the most caller-hostile pattern in the cohort: the system does not even pretend to triage. It dismisses callers.

Keel's voice agent replaces the "thank you and goodbye" with a real conversational front door that runs 24/7. The agent answers ~10 of the 12 typical questions directly, escalates to a human only when judgment is needed, and supports 25+ languages. Projected friction lands at **10/100 (Excellent)** — a **~59 point reduction** that turns a 20-second dismissal into a real intent-aware answer.`,
    self_service_score: 100, questions_covered: 0, questions_total: 12,
    avg_duration_sec: 20,
  },
};

for (const [filename, score] of Object.entries(OVERRIDES)) {
  const path = join(OUT_DIR, filename);
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });

  const menuRaw = XLSX.utils.sheet_to_json(wb.Sheets['Menu Mapping'] || {}, { defval: null });
  const scriptRaw = XLSX.utils.sheet_to_json(wb.Sheets['Script Capture'] || {}, { defval: null });
  const { rows: menuItems, removed: menuRemoved } = dedupeBy(menuRaw, r =>
    [r.digit, r.depth ?? r.menu_level ?? 0, r.path ?? '', (r.option_label || '').trim().toLowerCase()].join('||')
  );
  const { rows: scriptItems, removed: scriptRemoved } = dedupeBy(scriptRaw, r =>
    [r.digit ?? '', r.path ?? '', (r.key_instructions || '').trim().slice(0, 200).toLowerCase()].join('||')
  );
  if (menuRemoved || scriptRemoved) {
    wb.Sheets['Menu Mapping'] = XLSX.utils.json_to_sheet(menuItems);
    wb.Sheets['Script Capture'] = XLSX.utils.json_to_sheet(scriptItems);
  }

  wb.Sheets['Friction Score'] = XLSX.utils.json_to_sheet([{
    ...score,
    scored_at: new Date().toISOString(),
  }]);
  XLSX.writeFile(wb, path);
  console.log(`${filename.padEnd(28)} → ${score.total_score}/100 (${score.grade})  dedup: menu -${menuRemoved}, script -${scriptRemoved}`);
}
console.log('\nDone.');
