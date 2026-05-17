import { useState, type ReactNode, type FormEvent } from 'react';
import { checkPassword, isUnlocked, markUnlocked } from '../lib/auth';

type Props = { children: ReactNode };

export default function LoginGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlocked());
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (unlocked) return <>{children}</>;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const ok = await checkPassword(pw);
    setBusy(false);
    if (ok) {
      markUnlocked();
      setUnlocked(true);
    } else {
      setErr('Incorrect password.');
      setPw('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur"
      >
        <h1 className="text-2xl font-semibold text-white">University IVR Intelligence</h1>
        <p className="mt-2 text-sm text-slate-400">
          This dashboard is private. Enter the access password to continue.
        </p>

        <label className="mt-6 block">
          <span className="sr-only">Password</span>
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        {err && (
          <p className="mt-3 text-sm text-rose-400" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || pw.length === 0}
          className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>

        <p className="mt-6 text-xs text-slate-500">
          Access is shared by the project owner. Don't redistribute the password.
        </p>
      </form>
    </div>
  );
}
