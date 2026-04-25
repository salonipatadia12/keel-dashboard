// Reads ../IVR2.0.xlsx from the parent folder and writes src/data.json.
// Runs automatically before `npm run dev` and `npm run build`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const candidates = [
  join(__dirname, '..', '..', 'IVR2.0.xlsx'),
  join(__dirname, '..', 'IVR2.0.xlsx'),
];
const xlsxPath = candidates.find(existsSync);
const dataJsonPath = join(__dirname, '..', 'src', 'data.json');
if (!xlsxPath) {
  if (existsSync(dataJsonPath)) {
    console.log('build-data: xlsx not found, using committed src/data.json');
    process.exit(0);
  }
  console.error('IVR2.0.xlsx not found and no committed data.json. Looked in:', candidates);
  process.exit(1);
}

console.log('build-data: reading', xlsxPath);
const wb = XLSX.read(readFileSync(xlsxPath), { type: 'buffer' });

const sheets = {};
for (const name of wb.SheetNames) {
  sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
}

const out = {
  source: 'IVR2.0.xlsx',
  generatedAt: new Date().toISOString(),
  universityList: sheets['University List'] || [],
  overview: sheets['Overview'] || [],
  menuMapping: sheets['Menu Mapping'] || [],
  scriptCapture: sheets['Script Capture'] || [],
  systemCharacteristics: sheets['System Characteristics'] || [],
  tone: sheets['Tone'] || [],
  frictionScore: sheets['Friction Score'] || [],
  discoveryQueue: sheets['DiscoveryQueue'] || [],
};

writeFileSync(dataJsonPath, JSON.stringify(out, null, 2));
console.log(
  `build-data: wrote ${dataJsonPath} ` +
    `(overview=${out.overview.length}, menu=${out.menuMapping.length}, ` +
    `scripts=${out.scriptCapture.length})`
);
