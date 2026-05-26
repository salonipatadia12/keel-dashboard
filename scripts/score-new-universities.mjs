// One-off: dedupe noisy rows + calculate Friction Score for the 6 newly-added
// universities, mirroring the n8n WorkflowC_v4 algorithm. Existing 3 universities
// (CSU Sacramento, SJSU, Santa Clara) are left untouched because they have
// hand-authored executive summaries.
//
// Run: node pitch/scripts/score-new-universities.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'output_universities');

const TARGETS = [
  'IVR_UC_Berkeley.xlsx',
  'IVR_UC_Davis.xlsx',
  'IVR_UC_Irvine.xlsx',
  'IVR_UC_San_Diego.xlsx',
  'IVR_UCLA.xlsx',
  'IVR_SDSU.xlsx',
];

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

function asBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

// Mirrors n8n WorkflowC_v4 "Calculate Friction Score" node verbatim, plus a few
// derived enrichments (voicemail_count, avg_duration_sec) that match the schema
// already on the existing 3 universities.
function scoreUniversity({ universityName, menuItems, overviewItems, sysItems }) {
  const depths = menuItems.map(m => Number(m.depth) || Number(m.menu_level) || 0);
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const depthScore = Math.min(100, Math.max(0, (maxDepth - 3) * 25));

  const levelGroups = {};
  menuItems.forEach(m => {
    const lvl = m.depth ?? m.menu_level ?? 0;
    levelGroups[lvl] = (levelGroups[lvl] || 0) + 1;
  });
  const levels = Object.values(levelGroups);
  const avgOptions = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  const optionsScore = Math.min(100, Math.max(0, (avgOptions - 5) * 20));

  const estimatedTime = maxDepth * 30;
  let timeScore = 0;
  if (estimatedTime <= 60) timeScore = 0;
  else if (estimatedTime <= 120) timeScore = (estimatedTime - 60) * 1.67;
  else timeScore = Math.min(100, 100 + (estimatedTime - 120) * 0.5);

  const totalNodes = overviewItems.length || 1;
  const deadEnds = overviewItems.filter(o =>
    o.outcome_type === 'dead_end' || o.outcome_type === 'closed' || o.outcome_type === 'voicemail'
  ).length;
  const voicemailCount = overviewItems.filter(o => o.outcome_type === 'voicemail').length;
  const deadEndScore = Math.min(100, (deadEnds / totalNodes) * 100);

  const humanReachable = overviewItems.filter(o => o.outcome_type === 'human').length;
  const agentCoverage = totalNodes > 0 ? (humanReachable / totalNodes) * 100 : 0;
  let agentAccessScore = 100 - agentCoverage;
  const hasOperatorZero = sysItems.some(s => asBool(s.has_operator_zero));
  if (hasOperatorZero) agentAccessScore = Math.max(0, agentAccessScore - 30);

  let clarityScore = 0;
  if (avgOptions > 6) clarityScore += 30;
  if (maxDepth > 3) clarityScore += 30;
  const hasLoop = sysItems.some(s => s.loop_behavior && s.loop_behavior !== 'none');
  if (hasLoop) clarityScore += 20;
  clarityScore = Math.min(100, clarityScore);

  const operatorScore = hasOperatorZero ? 0 : 100;

  const totalScore = Math.round(
    depthScore * 0.15 +
    optionsScore * 0.15 +
    timeScore * 0.20 +
    deadEndScore * 0.15 +
    agentAccessScore * 0.10 +
    clarityScore * 0.15 +
    operatorScore * 0.10
  );

  let grade;
  if (totalScore <= 25) grade = 'Excellent';
  else if (totalScore <= 50) grade = 'Good';
  else if (totalScore <= 75) grade = 'Fair';
  else grade = 'Poor';

  const components = {
    'Menu Depth': depthScore,
    'Options Complexity': optionsScore,
    'Time to Resolution': timeScore,
    'Dead Ends': deadEndScore,
    'Agent Accessibility': agentAccessScore,
    'Prompt Clarity': clarityScore,
    'Operator Availability': operatorScore,
  };
  const worstComponent = Object.entries(components).sort((a, b) => b[1] - a[1])[0];

  const recs = [];
  if (depthScore > 50) recs.push('Reduce menu depth — flatten the IVR tree');
  if (optionsScore > 50) recs.push('Reduce options per level — consolidate similar departments');
  if (timeScore > 50) recs.push('Reduce time-to-resolution — add shortcuts to common departments');
  if (deadEndScore > 30) recs.push('Eliminate dead ends — ensure all paths lead to useful info or a human');
  if (agentAccessScore > 50) recs.push('Improve agent accessibility — more paths should reach a human');
  if (operatorScore > 0) recs.push('Add press-0-for-operator at every menu level');
  if (clarityScore > 50) recs.push('Simplify prompts — reduce cognitive load per menu');

  const durations = overviewItems.map(o => Number(o.duration)).filter(d => !isNaN(d) && d > 0);
  const avgDurationSec = durations.length > 0
    ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
    : null;

  return {
    university: universityName,
    total_score: totalScore,
    grade,
    depth_score: Math.round(depthScore),
    options_score: Math.round(optionsScore),
    time_score: Math.round(timeScore),
    dead_end_score: Math.round(deadEndScore),
    agent_access_score: Math.round(agentAccessScore),
    clarity_score: Math.round(clarityScore),
    operator_score: Math.round(operatorScore),
    max_depth: maxDepth,
    avg_options: Math.round(avgOptions * 10) / 10,
    total_nodes: totalNodes,
    dead_end_count: deadEnds,
    voicemail_count: voicemailCount,
    human_reachable_count: humanReachable,
    worst_component: worstComponent[0],
    worst_component_score: Math.round(worstComponent[1]),
    recommendations: recs.join('; '),
    avg_duration_sec: avgDurationSec,
    scored_at: new Date().toISOString(),
  };
}

function processFile(filename) {
  const path = join(OUT_DIR, filename);
  console.log(`\n→ ${filename}`);
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });

  const universityList = XLSX.utils.sheet_to_json(wb.Sheets['University List'] || {}, { defval: null });
  const universityName = universityList[0]?.university || filename.replace(/^IVR_|\.xlsx$/g, '').replace(/_/g, ' ');

  const overviewItems = XLSX.utils.sheet_to_json(wb.Sheets['Overview'] || {}, { defval: null });
  const sysItems = XLSX.utils.sheet_to_json(wb.Sheets['System Characteristics'] || {}, { defval: null });
  const menuRaw = XLSX.utils.sheet_to_json(wb.Sheets['Menu Mapping'] || {}, { defval: null });
  const scriptRaw = XLSX.utils.sheet_to_json(wb.Sheets['Script Capture'] || {}, { defval: null });

  // Dedupe: same option recorded across multiple digit-test calls. Keep first.
  const { rows: menuItems, removed: menuRemoved } = dedupeBy(menuRaw, r =>
    [r.digit, r.depth ?? r.menu_level ?? 0, r.path ?? '', (r.option_label || '').trim().toLowerCase()].join('||')
  );
  const { rows: scriptItems, removed: scriptRemoved } = dedupeBy(scriptRaw, r =>
    [r.digit ?? '', r.path ?? '', (r.key_instructions || '').trim().slice(0, 200).toLowerCase()].join('||')
  );
  console.log(`   dedupe: menu ${menuRaw.length} → ${menuItems.length} (-${menuRemoved}), script ${scriptRaw.length} → ${scriptItems.length} (-${scriptRemoved})`);

  const score = scoreUniversity({ universityName, menuItems, overviewItems, sysItems });
  console.log(`   score: ${score.total_score}/100 (${score.grade}) — worst: ${score.worst_component}`);

  // Write deduped sheets and new Friction Score row back to workbook
  wb.Sheets['Menu Mapping'] = XLSX.utils.json_to_sheet(menuItems);
  wb.Sheets['Script Capture'] = XLSX.utils.json_to_sheet(scriptItems);
  wb.Sheets['Friction Score'] = XLSX.utils.json_to_sheet([score]);

  XLSX.writeFile(wb, path);
  console.log(`   wrote ${path}`);
}

for (const f of TARGETS) {
  processFile(f);
}
console.log('\nDone.');
