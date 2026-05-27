import { useEffect, useRef, useState } from 'react';
import { Logo } from './Icons';
import type { Workspace } from '../lib/types';

interface Props {
  university: string;
  phone: string;
  generatedAt: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
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

export default function TopBar({
  university,
  phone,
  generatedAt,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}: Props) {
  const shortName = university.split(',')[0];
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const showSwitcher = workspaces.length > 1;
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-bg/85 border-b border-line">
      <div className="max-w-[1440px] mx-auto px-8 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted ml-1 px-2 py-0.5 rounded bg-surface border border-line">
            v1
          </span>
        </div>

        <div className="h-5 w-px bg-line" />

        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <span className="cursor-default">Workspaces</span>
          <span className="text-line2">/</span>
          {showSwitcher ? (
            <div ref={switcherRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={
                  'flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition ' +
                  (open
                    ? 'bg-surface text-ink2 border border-line'
                    : 'hover:bg-surface hover:text-ink2 border border-transparent')
                }
              >
                {activeWorkspace?.label ?? 'Workspace'}
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={'transition-transform ' + (open ? 'rotate-180' : '')}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open && (
                <div
                  className="absolute left-0 top-full mt-1 z-40 min-w-[240px] rounded-md border border-line bg-bg shadow-xl py-1"
                  role="listbox"
                >
                  {workspaces.map((w) => {
                    const isActive = w.id === activeWorkspaceId;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onSelectWorkspace(w.id);
                          setOpen(false);
                        }}
                        role="option"
                        aria-selected={isActive}
                        className={
                          'w-full text-left px-3 py-2 text-[12.5px] transition ' +
                          (isActive
                            ? 'bg-accent/10 text-ink font-semibold'
                            : 'text-ink2 hover:bg-surface')
                        }
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <span className="cursor-default">{activeWorkspace?.label}</span>
          )}
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
        </div>
      </div>
    </div>
  );
}
