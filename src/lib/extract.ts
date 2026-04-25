import type {
  MenuItemRow,
  OverviewRow,
  Reference,
  ScriptCaptureRow,
} from './types';

const URL_RE =
  /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:edu|com|org|gov|net|io)(?:\/[^\s,]*)?/gi;
const PHONE_RE = /(?:\+1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b/g;

function pathStr(p: unknown): string {
  if (p === null || p === undefined) return 'root';
  return String(p);
}

function digitStr(d: unknown): string {
  if (d === null || d === undefined) return '';
  return String(d);
}

function findUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_RE)) out.push(m[0]);
  return out;
}

function findPhones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PHONE_RE)) {
    out.push(`(${m[1]}) ${m[2]}-${m[3]}`);
  }
  return out;
}

// Returns all URL and phone references found in human-readable columns,
// keyed by path. Excludes UUID-bearing columns to avoid false positives.
export function extractReferences(
  overview: OverviewRow[],
  menu: MenuItemRow[],
  scripts: ScriptCaptureRow[],
  university: string,
  ourPhone: string | number | null
): { urls: Reference[]; phones: Reference[] } {
  const urls: Reference[] = [];
  const phones: Reference[] = [];

  const ourDigits = ourPhone ? String(ourPhone).replace(/\D/g, '').slice(-10) : null;
  const seenUrl = new Set<string>();
  const seenPhone = new Set<string>();

  const push = (
    text: string,
    sourcePath: string,
    sourceNodeLabel: string,
    digit: string
  ) => {
    if (!text) return;
    for (const u of findUrls(text)) {
      const key = `${sourcePath}::${u.toLowerCase()}`;
      if (seenUrl.has(key)) continue;
      seenUrl.add(key);
      urls.push({ value: u, kind: 'url', sourcePath, sourceNodeLabel, digit });
    }
    for (const p of findPhones(text)) {
      const digits = p.replace(/\D/g, '');
      // Skip the university's own number (that's the inbound, not a transfer-out)
      if (ourDigits && digits.endsWith(ourDigits)) continue;
      const key = `${sourcePath}::${digits}`;
      if (seenPhone.has(key)) continue;
      seenPhone.add(key);
      phones.push({ value: p, kind: 'phone', sourcePath, sourceNodeLabel, digit });
    }
  };

  // Script Capture: url_mentioned + key_instructions
  for (const s of scripts) {
    if (s.university !== university) continue;
    const path = pathStr(s.path);
    const digit = digitStr(s.digit);
    const label = `digit ${digit || '?'} at ${path}`;
    if (s.url_mentioned) push(String(s.url_mentioned), path, label, digit);
    if (s.key_instructions) push(String(s.key_instructions), path, label, digit);
  }

  // Menu Mapping: notes
  for (const m of menu) {
    if (m.university !== university) continue;
    const path = pathStr(m.path);
    const digit = digitStr(m.digit);
    const label = m.option_label || `digit ${digit} at ${path}`;
    if (m.notes) push(String(m.notes), path, label, digit);
  }

  // Overview: notes, outcome_detail, business_hours
  for (const o of overview) {
    if (o.university !== university) continue;
    const path = pathStr(o.path);
    const digit = digitStr(o.digit_tested);
    const label = `path ${path}`;
    if (o.notes) push(String(o.notes), path, label, digit);
    if (o.outcome_detail) push(String(o.outcome_detail), path, label, digit);
    if (o.business_hours) push(String(o.business_hours), path, label, digit);
  }

  return { urls, phones };
}
