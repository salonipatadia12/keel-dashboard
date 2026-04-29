import { Handle, Position } from '@xyflow/react';
import type { TreeNode } from '../lib/types';
import { Globe, Phone, User, Voicemail, X, Info, Menu, Repeat } from './Icons';

const STYLE: Record<
  TreeNode['outcomeType'],
  {
    border: string;
    chipBg: string;
    chipText: string;
    iconColor: string;
    tag: string;
    icon: React.FC<{ size?: number; className?: string }>;
    accent: string;
  }
> = {
  human: {
    border: 'border-good/40',
    chipBg: 'bg-good/10',
    chipText: 'text-good',
    iconColor: 'text-good',
    tag: 'Human',
    icon: User,
    accent: 'bg-good',
  },
  voicemail: {
    border: 'border-vm/40',
    chipBg: 'bg-vm/10',
    chipText: 'text-vm',
    iconColor: 'text-vm',
    tag: 'Voicemail',
    icon: Voicemail,
    accent: 'bg-vm',
  },
  dead_end: {
    border: 'border-bad/40',
    chipBg: 'bg-bad/10',
    chipText: 'text-bad',
    iconColor: 'text-bad',
    tag: 'Dead end',
    icon: X,
    accent: 'bg-bad',
  },
  info: {
    border: 'border-warn/40',
    chipBg: 'bg-warn/10',
    chipText: 'text-warn',
    iconColor: 'text-warn',
    tag: 'Info',
    icon: Info,
    accent: 'bg-warn',
  },
  submenu: {
    border: 'border-sub/40',
    chipBg: 'bg-sub/10',
    chipText: 'text-sub',
    iconColor: 'text-sub',
    tag: 'Menu',
    icon: Menu,
    accent: 'bg-sub',
  },
  repeat: {
    border: 'border-line2',
    chipBg: 'bg-surface2',
    chipText: 'text-muted',
    iconColor: 'text-muted',
    tag: 'Repeat',
    icon: Repeat,
    accent: 'bg-line2',
  },
};

interface IvrNodeData {
  node: TreeNode;
}

export default function IvrNode({ data }: { data: IvrNodeData }) {
  const n = data.node;
  const s = STYLE[n.outcomeType] || STYLE.submenu;
  const Icon = s.icon;
  const hasUrl = n.urls.length > 0;
  const hasPhone = n.phones.length > 0;
  const isRoot = n.id === 'root' || n.id === 'r:root';

  return (
    <div
      className={`bg-surface rounded-xl border ${s.border} shadow-card w-[196px] overflow-hidden font-sans`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-line2 !w-2 !h-2 !border-0 !-translate-y-1/2"
      />
      <div className={`h-1 w-full ${s.accent}`} />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10.5px] tracking-wider text-muted2 font-semibold">
            {isRoot ? 'ROOT' : n.digit ? `▸ ${n.digit}` : ' '}
          </span>
          <span
            className={`text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded ${s.chipBg} ${s.chipText} font-bold flex items-center gap-1`}
          >
            <Icon size={9} />
            {s.tag}
          </span>
        </div>
        <div className="text-[12.5px] leading-snug font-semibold text-ink line-clamp-2 mb-1.5">
          {n.label}
        </div>
        {(hasUrl || hasPhone || n.durationSec) && (
          <div className="flex items-center gap-3 text-[10.5px] text-muted">
            {hasUrl && (
              <span
                className="flex items-center gap-1 text-warn font-medium"
                title={n.urls.map((u) => u.value).join(', ')}
              >
                <Globe size={10} /> {n.urls.length} link{n.urls.length === 1 ? '' : 's'}
              </span>
            )}
            {hasPhone && (
              <span
                className="flex items-center gap-1 text-sub font-medium"
                title={n.phones.map((p) => p.value).join(', ')}
              >
                <Phone size={10} /> {n.phones.length}
              </span>
            )}
            {n.durationSec ? (
              <span className="font-mono text-muted2">{Math.round(n.durationSec)}s avg</span>
            ) : null}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-line2 !w-2 !h-2 !border-0 !translate-y-1/2"
      />
    </div>
  );
}
