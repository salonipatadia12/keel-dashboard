// Reads each xlsx in SOURCES and produces a multi-tenant src/data.json.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Workspaces group tenants by vertical so one deployed dashboard can host
// multiple audit types (universities, K-12 districts, etc.). The first
// workspace is the default landing view.
const WORKSPACES = [
  {
    id: 'universities',
    label: 'University audits',
    audienceCaption:
      'Every caller-facing path on your line, scored on the friction a real caller experiences.',
  },
  {
    id: 'k12-districts',
    label: 'K-12 district audits',
    audienceCaption:
      'Every caller-facing path on the main district line, scored on the friction a real family experiences.',
  },
];

// Each entry is one audited tenant. `workspace` slots it under one of the
// WORKSPACES above. `displayName` overrides the raw university string from
// the xlsx — used when the source file has an ugly title (e.g.
// "Torrance_united school district").
const SOURCES = [
  { id: 'csu-sacramento', file: 'IVR_CSU_Sacramento.xlsx', workspace: 'universities' },
  { id: 'sjsu', file: 'IVR_San_Jose.xlsx', workspace: 'universities' },
  { id: 'santa-clara', file: 'IVR_Santa_Clara.xlsx', workspace: 'universities' },
  { id: 'uc-berkeley', file: 'IVR_UC_Berkeley.xlsx', workspace: 'universities' },
  { id: 'uc-davis', file: 'IVR_UC_Davis.xlsx', workspace: 'universities' },
  { id: 'uc-irvine', file: 'IVR_UC_Irvine.xlsx', workspace: 'universities' },
  { id: 'uc-san-diego', file: 'IVR_UC_San_Diego.xlsx', workspace: 'universities' },
  { id: 'ucla', file: 'IVR_UCLA.xlsx', workspace: 'universities' },
  { id: 'sdsu', file: 'IVR_SDSU.xlsx', workspace: 'universities' },
  { id: 'csulb', file: 'IVR_Cal_State_Long_Beach.xlsx', workspace: 'universities' },
  { id: 'iu-indianapolis', file: 'IVR_Indiana_Indianapolis.xlsx', workspace: 'universities' },
  { id: 'usc', file: 'IVR_USC.xlsx', workspace: 'universities' },
  { id: 'stanford', file: 'IVR_Stanford.xlsx', workspace: 'universities' },
  { id: 'iu-bloomington', file: 'IVR_Indiana_Bloomington.xlsx', workspace: 'universities' },
  { id: 'csun', file: 'IVR_Cal_State_Northridge.xlsx', workspace: 'universities' },
  { id: 'calstate-la', file: 'IVR_CSU_Los_Angeles.xlsx', workspace: 'universities' },
  { id: 'csuf', file: 'IVR_Cal_State_Fullerton.xlsx', workspace: 'universities' },
  { id: 'uiuc', file: 'IVR_UIUC.xlsx', workspace: 'universities' },
  { id: 'illinois-state', file: 'IVR_Illinois_State.xlsx', workspace: 'universities' },
  { id: 'ball-state', file: 'IVR_Ball_State.xlsx', workspace: 'universities' },
  { id: 'notre-dame', file: 'IVR_Notre_Dame.xlsx', workspace: 'universities' },
  { id: 'northern-illinois', file: 'IVR_Northern_Illinois.xlsx', workspace: 'universities' },
  { id: 'depaul', file: 'IVR_DePaul.xlsx', workspace: 'universities' },
  { id: 'loyola-chicago', file: 'IVR_Loyola_Chicago.xlsx', workspace: 'universities' },
  { id: 'uic', file: 'IVR_UIC.xlsx', workspace: 'universities' },
  { id: 'northwestern', file: 'IVR_Northwestern.xlsx', workspace: 'universities' },
  { id: 'uchicago', file: 'IVR_UChicago.xlsx', workspace: 'universities' },
  { id: 'alabama-state', file: 'IVR_Alabama State University.xlsx', workspace: 'universities' },
  // Torrance Unified School District — the parent org. District office + 7
  // campuses, each scraped as its own tenant. Sharing parentOrg='tusd'
  // lets the K12 workspace render them as one parent card that drills
  // into the 8-child rollup view.
  {
    id: 'tusd',
    file: 'IVR_Torrance_USD.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'district-office',
    displayName: 'Torrance USD — District Office',
  },
  {
    id: 'tusd-adams-elementary',
    file: 'IVR_Adams Elementary.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'elementary',
    displayName: 'Adams Elementary',
  },
  {
    id: 'tusd-calle-mayor-middle',
    file: 'IVR_Calle Mayor Middle.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'middle',
    displayName: 'Calle Mayor Middle',
  },
  {
    id: 'tusd-casimir-middle',
    file: 'IVR_Casimir Middle.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'middle',
    displayName: 'Casimir Middle',
  },
  {
    id: 'tusd-jefferson-middle',
    file: 'IVR_Jefferson Middle.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'middle',
    displayName: 'Jefferson Middle',
  },
  {
    id: 'tusd-north-high',
    file: 'IVR_North High.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'high',
    displayName: 'North High',
  },
  {
    id: 'tusd-torrance-high',
    file: 'IVR_Torrance High.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'high',
    displayName: 'Torrance High',
  },
  {
    id: 'tusd-west-high',
    file: 'IVR_West High.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'tusd',
    childKind: 'high',
    displayName: 'West High',
  },
  // Pacifica Christian High School — standalone-parent example for the
  // K-12 workspace. Single-school org, so parentOrg='pacifica-christian'
  // matches its own id and the parent card collapses straight to the
  // one campus report (no rollup needed).
  {
    id: 'pacifica-christian',
    file: 'IVR_Pacifica Christian.xlsx',
    workspace: 'k12-districts',
    parentOrg: 'pacifica-christian',
    childKind: 'high-private',
    displayName: 'Pacifica Christian High School',
  },
];

function findFile(filename) {
  // Source folders, in order of preference. output_universities/ holds
  // the university audits; output_k12/ holds the K-12 lines (district
  // offices, individual schools, single-site privates). Root + pitch/
  // are kept as fallbacks so a freshly-scraped file can be tested in
  // place before being moved into its final home.
  const candidates = [
    join(__dirname, '..', '..', 'output_universities', filename),
    join(__dirname, '..', '..', 'output_k12', filename),
    join(__dirname, '..', '..', filename),
    join(__dirname, '..', filename),
  ];
  return candidates.find(existsSync);
}

function parseSource({ id, file, workspace, displayName, parentOrg, childKind }) {
  const path = findFile(file);
  if (!path) {
    console.warn(`build-data: ${file} not found, skipping`);
    return null;
  }
  console.log(`build-data: reading ${path}`);
  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
  const sheets = {};
  for (const name of wb.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
  }
  const universityList = sheets['University List'] || [];
  const uni = universityList[0] || {};
  const rawName = uni.university || 'Unknown';
  const name = displayName || rawName;

  // Most sheets join back to the tenant by `row.university === uni.name`.
  // When we override the display name we have to rewrite that key on every
  // row so downstream filters keep matching.
  const rewriteJoin = (rows) =>
    rows.map((r) =>
      r && r.university === rawName ? { ...r, university: name } : r
    );

  return {
    id,
    source: file,
    workspace: workspace || 'universities',
    parentOrg: parentOrg || null,
    childKind: childKind || null,
    name,
    phone: uni.phone ? String(uni.phone) : '',
    universityList: rewriteJoin(universityList),
    overview: rewriteJoin(sheets['Overview'] || []),
    menuMapping: rewriteJoin(sheets['Menu Mapping'] || []),
    scriptCapture: rewriteJoin(sheets['Script Capture'] || []),
    systemCharacteristics: rewriteJoin(sheets['System Characteristics'] || []),
    tone: rewriteJoin(sheets['Tone'] || []),
    frictionScore: rewriteJoin(sheets['Friction Score'] || []),
    discoveryQueue: rewriteJoin(sheets['DiscoveryQueue'] || []),
  };
}

const universities = SOURCES.map(parseSource).filter(Boolean);

const dataJsonPath = join(__dirname, '..', 'src', 'data.json');
if (universities.length === 0) {
  if (existsSync(dataJsonPath)) {
    console.log('build-data: no xlsx files found, leaving committed src/data.json untouched');
    process.exit(0);
  }
  console.error('build-data: no xlsx files found and no committed data.json');
  process.exit(1);
}

const out = {
  source: SOURCES.map((s) => s.file).join(', '),
  generatedAt: new Date().toISOString(),
  workspaces: WORKSPACES,
  universities,
};
writeFileSync(dataJsonPath, JSON.stringify(out, null, 2));
const byWorkspace = universities.reduce((acc, u) => {
  (acc[u.workspace] = acc[u.workspace] || []).push(u);
  return acc;
}, {});
console.log(
  `build-data: wrote ${dataJsonPath} — ${universities.length} tenant(s) across ${Object.keys(byWorkspace).length} workspace(s):\n` +
    Object.entries(byWorkspace)
      .map(
        ([ws, list]) =>
          `  [${ws}] ${list.length}: ` +
          list.map((u) => `${u.name} (menu=${u.menuMapping.length})`).join(', ')
      )
      .join('\n')
);
