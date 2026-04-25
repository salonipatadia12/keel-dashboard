interface IconProps {
  size?: number;
  className?: string;
}

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const ArrowRight = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const ArrowDown = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 13l7 7 7-7" />
  </svg>
);

export const ArrowUp = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 19V5M5 11l7-7 7 7" />
  </svg>
);

export const Phone = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const Globe = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const Layers = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const Activity = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const Sparkles = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l1.9 4.7L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.3z" />
    <path d="M19 14l.8 2 2 .8-2 .8L19 19l-.8-1.4-2-.8 2-.8z" />
    <path d="M5 4l.6 1.5 1.5.5-1.5.5L5 8l-.6-1.5L3 6l1.4-.5z" />
  </svg>
);

export const Shield = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const TrendingUp = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const TrendingDown = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

export const AlertTriangle = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const Check = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Zap = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const User = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const Voicemail = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="6.5" cy="12" r="3.5" />
    <line x1="6.5" y1="15.5" x2="17.5" y2="15.5" />
    <circle cx="17.5" cy="12" r="3.5" />
  </svg>
);

export const X = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Info = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const Repeat = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const Menu = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const Logo = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#g1)" />
    <path d="M10 12h12M10 16h12M10 20h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="22" cy="20" r="2" fill="white" />
    <defs>
      <linearGradient id="g1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#a78bfa" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  </svg>
);
