// Side-channel verification — runs the same lib code against the data and prints
// expected dashboard numbers. Used to confirm friction lands in [10, 15],
// pruning behaves, and references are extracted cleanly.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'data.json'), 'utf8')
);

const { buildPathTree } = await import('../src/lib/pathTree.ts');
const { calculateFriction } = await import('../src/lib/friction.ts');
const { buildRecommendedTree } = await import('../src/lib/recommend.ts');
const { brandReputationIndex } = await import('../src/lib/brand.ts');

const uni = data.universityList[0];
const built = buildPathTree(
  data.overview,
  data.menuMapping,
  data.scriptCapture,
  uni.university,
  String(uni.phone)
);

const hasOpZero = data.systemCharacteristics.some(
  (s) => s.university === uni.university && s.has_operator_zero === true
);

const cur = calculateFriction(built.root, { hasOpZero });
const rec = buildRecommendedTree();

const webRefs = built.allNodes.flatMap((n) => n.urls);
const phoneRefs = built.allNodes.flatMap((n) => n.phones);

const bc = brandReputationIndex(cur);
const br = brandReputationIndex(rec.friction);

console.log('University:', uni.university);
console.log('Phone:', uni.phone);
console.log('---');
console.log('Tree post-prune nodes:', built.allNodes.length);
console.log('Pruned ghost branches:', built.prunedCount, built.prunedPaths);
console.log('---');
console.log('Current friction:', cur.totalScore, cur.grade);
console.log('  components:', cur.components);
console.log('  maxDepth:', cur.maxDepth, 'avgOpts:', cur.avgOptions);
console.log('  deadEnds:', cur.deadEndCount, 'human:', cur.humanReachableCount);
console.log('---');
console.log('Recommended friction:', rec.friction.totalScore, rec.friction.grade);
console.log('  in [10, 15]?', rec.friction.totalScore >= 10 && rec.friction.totalScore <= 15);
console.log('  components:', rec.friction.components);
console.log('  warnings:', rec.warnings);
console.log('---');
console.log('Web redirects:', webRefs.length);
webRefs.forEach((r) => console.log('  ·', r.value, '@', r.sourcePath));
console.log('Phone transfers:', phoneRefs.length);
phoneRefs.forEach((r) => console.log('  ·', r.value, '@', r.sourcePath));
console.log('---');
console.log('Brand index current:', bc.score, bc.label);
console.log('Brand index recommended:', br.score, br.label);
