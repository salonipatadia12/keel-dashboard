import { Logo } from './Icons';

interface Props {
  university: string;
  phone: string;
  generatedAt: string;
}

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TopBar({ university, phone, generatedAt }: Props) {
  const shortName = university.split(',')[0];
  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-bg/85 border-b border-line">
      <div className="max-w-[1440px] mx-auto px-8 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-sm font-semibold tracking-tight text-ink">Keel</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted ml-1 px-2 py-0.5 rounded bg-surface border border-line">
            v1
          </span>
        </div>

        <div className="h-5 w-px bg-line" />

        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <span className="hover:text-ink2 transition cursor-default">Workspaces</span>
          <span className="text-line2">/</span>
          <span className="hover:text-ink2 transition cursor-default">University audits</span>
          <span className="text-line2">/</span>
          <span className="text-ink font-medium">{shortName}</span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-good pulse-dot" />
            <span>Live · synced {formatDate(generatedAt)}</span>
          </div>
          <div className="h-5 w-px bg-line" />
          <div className="text-[11px] font-mono text-muted">{formatPhone(phone)}</div>
          <button className="text-[11px] text-ink2 hover:text-ink bg-surface hover:bg-surface2 border border-line rounded-md px-3 py-1.5 transition">
            Export
          </button>
          <button className="text-[11px] text-white bg-gradient-to-r from-accent to-sub hover:opacity-90 rounded-md px-3 py-1.5 transition font-medium">
            Share report
          </button>
        </div>
      </div>
    </div>
  );
}
