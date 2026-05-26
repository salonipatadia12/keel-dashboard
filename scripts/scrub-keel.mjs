// Removes "Keel" branding from every Friction Score row's recommendations
// + executive_summary across all xlsx files. Replacement strategy keeps the
// grammar intact by handling specific phrases before falling back to a
// generic "the voice agent" swap.
//
// Run: node pitch/scripts/scrub-keel.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'output_universities');

// Order matters — longer / more specific phrases first.
const REPLACEMENTS = [
  [/Keel's voice agent collapses/g, 'A voice agent collapses'],
  [/Keel's voice agent eliminates/g, 'A voice agent eliminates'],
  [/Keel's voice agent replaces/g, 'A voice agent replaces'],
  [/Keel's voice agent inserts/g, 'A voice agent inserts'],
  [/Keel's voice agent/g, 'A voice agent'],
  [/with Keel/g, 'with a voice agent'],
  [/Keel routes/g, 'A voice agent routes'],
  [/Keel hands off/g, 'The agent hands off'],
  [/Keel collects/g, 'The agent collects'],
  [/Keel is the operator/g, 'the agent is the operator'],
  [/Keel is 24\/7/g, 'The agent is 24/7'],
  [/Keel does not/g, 'It does not'],
  [/Keel can/g, 'The agent can'],
  [/Keel projected/g, 'Projected'],
  // Catch-all (after specifics) — defensive in case a phrasing slipped through.
  [/\bKeel\b/g, 'the voice agent'],
];

function scrub(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [pat, repl] of REPLACEMENTS) {
    out = out.replace(pat, repl);
  }
  return out;
}

const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.xlsx'));
let totalChanged = 0;

for (const f of files) {
  const path = join(OUT_DIR, f);
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
  const sheet = wb.Sheets['Friction Score'];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (!rows.length) continue;

  let changed = false;
  for (const row of rows) {
    for (const key of ['recommendations', 'executive_summary']) {
      if (typeof row[key] === 'string' && row[key].includes('Keel')) {
        row[key] = scrub(row[key]);
        changed = true;
      }
    }
  }
  if (changed) {
    wb.Sheets['Friction Score'] = XLSX.utils.json_to_sheet(rows);
    XLSX.writeFile(wb, path);
    totalChanged++;
    console.log(`scrubbed ${f}`);
  }
}
console.log(`\nUpdated ${totalChanged} files.`);
