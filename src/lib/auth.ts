// SHA-256 of the access password. Change this to rotate the password.
// To compute a new hash:
//   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
const PASSWORD_HASH = '8b8fefd1c8d321a447d988fcc8800c5f1141b0038edbdac05af6795caffc4777';

const STORAGE_KEY = 'keel.unlocked';

export async function checkPassword(input: string): Promise<boolean> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hash === PASSWORD_HASH;
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // sessionStorage may be unavailable in private mode; gate still works in-memory
  }
}

export function lock() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
