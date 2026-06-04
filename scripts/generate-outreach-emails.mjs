// Generates one personalized outreach email per tenant in src/data.json.
// Output: outreach/<workspace>/<tenant-id>.md — one markdown file per
// tenant containing subject + body + the deep-link URL pointing to that
// tenant's report. Hand the folder to a mail-merge tool (Mailchimp,
// Loops, Apollo, or just paste into Gmail) and you have 500 personalized
// drafts ready to go.
//
// Usage:
//   node scripts/generate-outreach-emails.mjs
//   node scripts/generate-outreach-emails.mjs --base-url https://salonipatadia12.github.io/keel-dashboard
//   node scripts/generate-outreach-emails.mjs --workspace universities
//
// Conventions:
//   - Each email leads with a single concrete pain point pulled from the
//     tenant's actual scrape (menu depth, dead ends, wait time) so it
//     doesn't read like a template.
//   - CTA is the booking link + the deep-linked dashboard URL.
//   - Saloni signs off; tone is direct, not corporate.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const dataPath = join(__dirname, '..', 'src', 'data.json');

// Parse CLI flags
const args = process.argv.slice(2);
const getFlag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
};
const BASE_URL = getFlag(
  'base-url',
  'https://salonipatadia12.github.io/keel-dashboard'
);
const WORKSPACE_FILTER = getFlag('workspace', null);
const BOOKING_URL = getFlag(
  'booking-url',
  'https://calendly.com/saloni-keel/discovery'
);

if (!existsSync(dataPath)) {
  console.error(`generate-outreach: ${dataPath} not found`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const tenants = (data.universities ?? []).filter(
  (t) => !WORKSPACE_FILTER || (t.workspace ?? 'universities') === WORKSPACE_FILTER
);

if (tenants.length === 0) {
  console.error(
    `generate-outreach: no tenants match workspace=${WORKSPACE_FILTER ?? '*'}`
  );
  process.exit(1);
}

const outDir = join(root, 'outreach');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function shortName(name) {
  return name.split(',')[0];
}

function pickHook(t) {
  // Pull one concrete pain point from the scrape data so the opening
  // sentence is tenant-specific. Falls back to a generic line if we
  // don't have enough signal to be specific.
  const friction = t.frictionScore?.[0];
  const totalNodes = friction?.total_nodes ?? null;
  const deadEnds = friction?.dead_end_count ?? null;
  const maxDepth = friction?.max_depth ?? null;
  const totalScore = friction?.total_score ?? null;
  const cxi =
    totalScore != null ? Math.max(0, Math.min(100, 100 - Math.round(totalScore))) : null;
  if (cxi != null && deadEnds && deadEnds >= 2) {
    return `your phone tree scores ${cxi}/100 on CXI today, with ${deadEnds} dead-end paths a real caller can hit`;
  }
  if (cxi != null && maxDepth && maxDepth >= 3) {
    return `your phone tree scores ${cxi}/100 on CXI today — callers wade through ${maxDepth} menu levels to reach a person`;
  }
  if (cxi != null) {
    return `your phone tree scores ${cxi}/100 on CXI today`;
  }
  if (totalNodes === 0 || totalNodes === null) {
    return `your main line connects callers directly to a person — but evenings and weekends drop straight to voicemail`;
  }
  return `your phone tree has friction we can quantify`;
}

const sent = [];
const skipped = [];
for (const t of tenants) {
  const url = `${BASE_URL}/?tenant=${encodeURIComponent(
    t.id
  )}&workspace=${encodeURIComponent(t.workspace ?? 'universities')}`;
  const hook = pickHook(t);
  const display = shortName(t.name);
  const workspaceDir = join(outDir, t.workspace ?? 'universities');
  if (!existsSync(workspaceDir)) mkdirSync(workspaceDir, { recursive: true });
  const outPath = join(workspaceDir, `${t.id}.md`);

  const subject = `${display}: a 90-second look at your phone-line friction`;
  const body =
    `Hi [First Name],\n\n` +
    `I run STEVE, a free audit of how a university's main phone line treats real callers. ` +
    `I just ran ${display} and ${hook}.\n\n` +
    `One-page report (your numbers only, no signup):\n` +
    `${url}\n\n` +
    `If anything in there is surprising, I'd love 15 minutes to walk through it ` +
    `and put you on a quick call with a voice agent built on ${display}'s real caller flow ` +
    `so you can hear the difference. Book whenever works:\n` +
    `${BOOKING_URL}\n\n` +
    `Either way, the report is yours — share it with whoever owns the line.\n\n` +
    `— Saloni\n` +
    `STEVE · voice agents that don't make callers wait\n`;

  const md =
    `---\n` +
    `tenant_id: ${t.id}\n` +
    `tenant_name: ${t.name}\n` +
    `workspace: ${t.workspace ?? 'universities'}\n` +
    `report_url: ${url}\n` +
    `booking_url: ${BOOKING_URL}\n` +
    `generated_at: ${data.generatedAt}\n` +
    `---\n\n` +
    `## Subject\n\n${subject}\n\n## Body\n\n${body}`;
  writeFileSync(outPath, md);
  sent.push(t.id);
}

console.log(
  `generate-outreach: wrote ${sent.length} draft(s) to ${outDir}` +
    (skipped.length ? ` (skipped: ${skipped.join(', ')})` : '')
);
console.log(
  `\nTo customize, edit the script — pickHook() chooses the opening line.`
);
console.log(`\nMail-merge fields to fill on the recipient side:`);
console.log(`  [First Name]    ← from your contact list`);
console.log(`\nReady to import into Loops, Mailchimp, Apollo, or paste into Gmail.`);
