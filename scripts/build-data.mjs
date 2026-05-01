// Reads each xlsx in SOURCES and produces a multi-university src/data.json.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Each entry is one university workspace. Filenames are looked up first in
// the parent folder (local dev), then in the pitch repo itself (CI).
const SOURCES = [
  { id: 'csu-sacramento', file: 'IVR2.0.xlsx' },
  { id: 'sjsu', file: 'IVR_San_Jose.xlsx' },
];

function findFile(filename) {
  const candidates = [
    join(__dirname, '..', '..', filename),
    join(__dirname, '..', filename),
  ];
  return candidates.find(existsSync);
}

function parseSource({ id, file }) {
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
  return {
    id,
    source: file,
    name: uni.university || 'Unknown',
    phone: uni.phone ? String(uni.phone) : '',
    universityList,
    overview: sheets['Overview'] || [],
    menuMapping: sheets['Menu Mapping'] || [],
    scriptCapture: sheets['Script Capture'] || [],
    systemCharacteristics: sheets['System Characteristics'] || [],
    tone: sheets['Tone'] || [],
    frictionScore: sheets['Friction Score'] || [],
    discoveryQueue: sheets['DiscoveryQueue'] || [],
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
  universities,
};
writeFileSync(dataJsonPath, JSON.stringify(out, null, 2));
console.log(
  `build-data: wrote ${dataJsonPath} — ${universities.length} universities (` +
    universities
      .map((u) => `${u.name}: overview=${u.overview.length}`)
      .join('; ') +
    ')'
);
