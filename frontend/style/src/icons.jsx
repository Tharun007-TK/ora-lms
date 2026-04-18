// Lucide-style outline icons, 1.5px stroke. Only what we use.
const Icon = ({ d, size = 16, strokeWidth = 1.5, className = "", children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Check:       (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>,
  X:           (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>,
  ChevronDown: (p) => <Icon {...p}><polyline points="6 9 12 15 18 9" /></Icon>,
  ChevronRight:(p) => <Icon {...p}><polyline points="9 6 15 12 9 18" /></Icon>,
  ChevronLeft: (p) => <Icon {...p}><polyline points="15 6 9 12 15 18" /></Icon>,
  Search:      (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>,
  Plus:        (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  Minus:       (p) => <Icon {...p}><path d="M5 12h14" /></Icon>,
  AlertCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></Icon>,
  Info:        (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Icon>,
  CheckCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Icon>,
  Bell:        (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>,
  User:        (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Icon>,
  Settings:    (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Icon>,
  Home:        (p) => <Icon {...p}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></Icon>,
  Book:        (p) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5V21h15" /></Icon>,
  Users:       (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" /><path d="M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6" /></Icon>,
  FileText:    (p) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></Icon>,
  Calendar:    (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></Icon>,
  BarChart:    (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>,
  Sparkles:    (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" /></Icon>,
  Moon:        (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" /></Icon>,
  Sun:         (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>,
  Menu:        (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>,
  MoreHorizontal: (p) => <Icon {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>,
  ArrowRight:  (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>,
  ArrowUpRight:(p) => <Icon {...p}><path d="M7 17 17 7M8 7h9v9" /></Icon>,
  Trash:       (p) => <Icon {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></Icon>,
  Eye:         (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>,
  Filter:      (p) => <Icon {...p}><path d="M4 4h16l-6 8v6l-4 2v-8z" /></Icon>,
  Download:    (p) => <Icon {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></Icon>,
  Command:     (p) => <Icon {...p}><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z" /></Icon>,
  Circle:      (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /></Icon>,
  Dot:         (p) => <Icon {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></Icon>,
  Loader:      (p) => <Icon {...p}><path d="M12 3a9 9 0 1 1-6.4 2.6" /></Icon>,
  Quill:       (p) => <Icon {...p}><path d="M20 4c-6 1-9 4-11 7s-4 6-5 9c2-1 4-2 7-3M14 10l-8 8M6 14H4v2" /></Icon>,
  Flag:        (p) => <Icon {...p}><path d="M4 21V4h12l-2 4 2 4H4" /></Icon>,
  Folder:      (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>,
  GraduationCap: (p) => <Icon {...p}><path d="M22 9 12 4 2 9l10 5 10-5Z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></Icon>,
};

// Ora wordmark — serif "ora" with a quill/nib crossing through the o.
// Height-driven; scales cleanly. Color via currentColor.
const OraWordmark = ({ height = 28, className = "", ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 260 110"
    height={height}
    className={className}
    aria-label="Ora"
    {...rest}
  >
    <text
      x="0" y="92"
      fontFamily='"Instrument Serif", Georgia, serif'
      fontSize="120"
      fill="currentColor"
      letterSpacing="-2"
    >ora</text>
    {/* Quill shaft */}
    <line x1="49" y1="10" x2="49" y2="108" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    {/* Upper nib */}
    <path d="M49 18 L53 38 L49 60 L45 38 Z" fill="currentColor" />
    {/* Lower tail */}
    <path d="M49 72 L51.4 92 L49 104 L46.6 92 Z" fill="currentColor" />
    {/* Center dot inside the o */}
    <circle cx="49" cy="62" r="2" fill="currentColor" />
  </svg>
);

// Square "o+quill" mark for app tiles, avatars, favicons.
const OraMark = ({ size = 28, className = "", bg, color, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 40"
    width={size}
    height={size}
    className={className}
    aria-label="Ora"
    {...rest}
  >
    {bg ? <rect width="40" height="40" rx="7" fill={bg} /> : null}
    <g stroke={color || "currentColor"} fill="none">
      <ellipse cx="20" cy="22" rx="11.5" ry="12" strokeWidth="3" />
    </g>
    <ellipse cx="20" cy="22" rx="4.8" ry="7.2" fill={bg || "var(--surface-raised)"} />
    <line x1="20" y1="4" x2="20" y2="38" stroke={color || "currentColor"} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M20 8 L21.6 15 L20 22 L18.4 15 Z" fill={color || "currentColor"} />
    <path d="M20 30 L20.9 34 L20 37 L19.1 34 Z" fill={color || "currentColor"} />
    <circle cx="20" cy="22" r="1" fill={color || "currentColor"} />
  </svg>
);

Object.assign(window, { Icon, I, OraWordmark, OraMark });
