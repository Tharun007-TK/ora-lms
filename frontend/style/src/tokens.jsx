// ============================================================
// Ora Tokens — color swatches, type specimens, spacing/radius/motion demos
// ============================================================

const Swatch = ({ hex, name, token, contrast, textOn }) => (
  <div className="flex flex-col">
    <div
      className="h-20 rounded-md border-hair"
      style={{ background: hex, color: textOn || "inherit" }}
    />
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <span className="t-label">{name}</span>
      <span className="t-mono text-[var(--text-muted)]">{hex}</span>
    </div>
    {token ? <div className="t-mono text-[11px] text-[var(--text-muted)] mt-0.5">{token}</div> : null}
    {contrast ? <div className="t-caption mt-0.5">{contrast}</div> : null}
  </div>
);

const CoreColors = () => (
  <div className="grid grid-cols-3 gap-4">
    <Swatch hex="#0A0A0A" name="Ink" token="--ink" contrast="AAA on Paper" />
    <Swatch hex="#FAFAF5" name="Paper" token="--paper" contrast="AAA with Ink" />
    <Swatch hex="#D85A30" name="Ember" token="--ember" contrast="AA on Paper — accent only, ≤5%" />
  </div>
);

const FunctionalRow = ({ label, fg, bg, text }) => (
  <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
    <div className="t-label">{label}</div>
    <div className="flex gap-2">
      <div
        className="flex-1 h-14 rounded-md border-hair flex items-center px-3 gap-2"
        style={{ background: bg, color: text }}
      >
        <I.Info size={14} />
        <span className="t-body-sm">Message sits on this surface.</span>
      </div>
      <div className="flex flex-col gap-1 w-[180px]">
        <div className="t-mono text-[11px]"><span className="text-[var(--text-muted)]">fg</span> {fg}</div>
        <div className="t-mono text-[11px]"><span className="text-[var(--text-muted)]">bg</span> {bg}</div>
        <div className="t-mono text-[11px]"><span className="text-[var(--text-muted)]">text</span> {text}</div>
      </div>
    </div>
  </div>
);

const FunctionalColors = () => (
  <div className="flex flex-col gap-3">
    <FunctionalRow label="Info" fg="#185FA5" bg="#E6F1FB" text="#0C447C" />
    <FunctionalRow label="Success" fg="#3B6D11" bg="#EAF3DE" text="#27500A" />
    <FunctionalRow label="Warning" fg="#BA7517" bg="#FAEEDA" text="#633806" />
    <FunctionalRow label="Danger" fg="#A32D2D" bg="#FCEBEB" text="#501313" />
  </div>
);

const GRAY_RAMP = [
  ["50",  "#F3F2EC"],
  ["100", "#E6E4DC"],
  ["200", "#D3D1C7", "border default"],
  ["300", "#B8B6AC"],
  ["400", "#9C9A92", "text muted"],
  ["500", "#7A7873"],
  ["600", "#58574F"],
  ["700", "#3D3D3A", "text secondary"],
  ["800", "#232321"],
  ["900", "#0A0A0A", "ink"],
];

const GrayRamp = () => (
  <div>
    <div className="flex rounded-md overflow-hidden border-hair">
      {GRAY_RAMP.map(([k, hex]) => (
        <div key={k} className="flex-1 h-14" style={{ background: hex }} />
      ))}
    </div>
    <div className="grid grid-cols-10 mt-2 gap-1">
      {GRAY_RAMP.map(([k, hex, role]) => (
        <div key={k} className="flex flex-col">
          <span className="t-label text-[11px]">gray-{k}</span>
          <span className="t-mono text-[10px] text-[var(--text-muted)]">{hex}</span>
          {role ? <span className="t-caption text-[10px] italic">{role}</span> : null}
        </div>
      ))}
    </div>
  </div>
);

const TYPE_SCALE = [
  ["display-xl", "t-display-xl", "Instrument Serif / 72 / 1.02", "Syllabus, meet your second pair of hands."],
  ["display-lg", "t-display-lg", "Instrument Serif / 48 / 1.04", "A calmer way to run a department."],
  ["h1",         "t-h1",         "Inter 500 / 32 / 1.15",        "Course materials"],
  ["h2",         "t-h2",         "Inter 500 / 24 / 1.2",         "Lesson plan — Week 4"],
  ["h3",         "t-h3",         "Inter 500 / 18 / 1.3",         "Learning outcomes"],
  ["body",       "t-body",       "Inter 400 / 14 / 1.5",         "Faculty at MCET draft lesson plans in roughly eight minutes, down from forty."],
  ["body-sm",    "t-body-sm",    "Inter 400 / 13 / 1.45",        "Smaller body copy for dense tables and secondary blocks."],
  ["label",      "t-label",      "Inter 500 / 13 / 1.3",         "Full name"],
  ["caption",    "t-caption",    "Inter 400 / 12 / 1.4",         "We'll only use this to send submission receipts."],
  ["mono",       "t-mono",       "JetBrains Mono 400 / 12.5",    "ORA-2026-CS301-04  14:32:11 IST"],
  ["eyebrow",    "t-eyebrow",    "Inter 500 / 11 / 0.08em / UPPER", "FACULTY HANDBOOK"],
];

const TypeSpecimens = () => (
  <div className="border-hair rounded-lg overflow-hidden">
    {TYPE_SCALE.map(([key, cls, meta, sample], i) => (
      <div
        key={key}
        className={`grid grid-cols-[140px_1fr_240px] items-baseline gap-6 px-5 py-4 ${i ? "border-hair-t" : ""}`}
      >
        <div className="t-mono text-[11px] text-[var(--text-muted)]">{key}</div>
        <div className={cls}>{sample}</div>
        <div className="t-mono text-[11px] text-[var(--text-muted)] text-right">{meta}</div>
      </div>
    ))}
  </div>
);

const SPACING = [
  ["1", 4], ["2", 8], ["3", 12], ["4", 16], ["5", 20],
  ["6", 24], ["8", 32], ["10", 40], ["12", 48], ["16", 64], ["20", 80],
];

const SpacingScale = () => (
  <div className="border-hair rounded-lg p-5">
    <div className="flex items-end gap-5">
      {SPACING.map(([name, px]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <div className="bg-[var(--ink)] dark:bg-[var(--gray-800)]" style={{ width: px, height: px }} />
          <div className="t-mono text-[10px]">{name}</div>
          <div className="t-mono text-[10px] text-[var(--text-muted)]">{px}</div>
        </div>
      ))}
    </div>
  </div>
);

const RADII = [
  ["sm", 4], ["md", 6], ["lg", 8], ["xl", 12], ["full", 9999],
];
const RadiusScale = () => (
  <div className="grid grid-cols-5 gap-3">
    {RADII.map(([name, r]) => (
      <div key={name} className="flex flex-col items-center gap-2">
        <div
          className="w-full h-16 border-hair bg-[var(--surface-raised)]"
          style={{ borderRadius: r }}
        />
        <div className="t-label">{name}</div>
        <div className="t-mono text-[11px] text-[var(--text-muted)]">
          {r === 9999 ? "9999px" : `${r}px`}
        </div>
      </div>
    ))}
  </div>
);

const BORDERS = [
  ["hairline", "0.5px"],
  ["default", "1px"],
  ["emphasized", "2px"],
];
const BorderWidths = () => (
  <div className="grid grid-cols-3 gap-3">
    {BORDERS.map(([name, w]) => (
      <div key={name} className="rounded-md overflow-hidden bg-[var(--surface-raised)]" style={{ border: `${w} solid var(--border-strong)` }}>
        <div className="px-4 py-6 flex flex-col items-center gap-1">
          <div className="t-label">{name}</div>
          <div className="t-mono text-[11px] text-[var(--text-muted)]">{w}</div>
        </div>
      </div>
    ))}
  </div>
);

const ShadowDemo = () => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-[var(--surface-raised)] rounded-lg border-hair p-6 shadow-[var(--elev-modal)]">
      <div className="t-label mb-1">Elevation — modal</div>
      <div className="t-mono text-[11px] text-[var(--text-muted)]">0 8px 24px rgba(10,10,10,0.08)</div>
    </div>
    <div className="bg-[var(--surface-raised)] rounded-lg border-hair p-6 shadow-[var(--focus-ring)] border-[var(--ember)]">
      <div className="t-label mb-1">Focus ring — Ember 25%</div>
      <div className="t-mono text-[11px] text-[var(--text-muted)]">0 0 0 3px rgba(216,90,48,0.25)</div>
    </div>
  </div>
);

const MOTION = [
  ["duration-fast", "120ms", "hover, tap"],
  ["duration-base", "200ms", "opens, toasts, tabs"],
  ["duration-slow", "320ms", "modal, page-level"],
  ["easing-standard", "cubic-bezier(0.2, 0, 0, 1)", "all motion"],
];
const MotionDemo = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="border-hair rounded-lg overflow-hidden">
      {MOTION.map(([name, val, note], i) => (
        <div key={name} className={`grid grid-cols-[200px_220px_1fr_120px] items-center gap-6 px-5 py-3 ${i ? "border-hair-t" : ""}`}>
          <div className="t-mono text-[12px]">{name}</div>
          <div className="t-mono text-[11px] text-[var(--text-muted)]">{val}</div>
          <div className="t-caption">{note}</div>
          <div className="h-2 rounded-full bg-[var(--surface-sunken)] relative overflow-hidden">
            <div
              key={tick}
              className="absolute top-0 left-0 h-full w-1/3 bg-[var(--ember)]"
              style={{
                animation: `slide-${i} ${val.includes("ms") ? val : "320ms"} var(--ease) forwards`,
              }}
            />
            <style>{`
              @keyframes slide-${i} { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
            `}</style>
          </div>
        </div>
      ))}
    </div>
  );
};

const BrandMark = () => (
  <div className="grid grid-cols-3 gap-4">
    <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-8 flex items-center justify-center min-h-[160px]">
      <span className="text-[var(--text-primary)]"><OraWordmark height={72} /></span>
    </div>
    <div className="border-hair rounded-lg bg-[var(--ink)] p-8 flex items-center justify-center min-h-[160px]">
      <span className="text-[var(--paper)]"><OraWordmark height={72} /></span>
    </div>
    <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-8 flex items-center justify-center gap-6 min-h-[160px]">
      <span className="text-[var(--text-primary)]"><OraMark size={56} /></span>
      <span className="text-[var(--text-primary)]"><OraMark size={32} /></span>
      <span className="text-[var(--text-primary)]"><OraMark size={20} /></span>
    </div>
    <div className="col-span-3 t-caption">
      The quill nib crossing the <em>o</em> is the only piece of brand that breaks the restraint rule — keep it untouched. Render in Ink on Paper, or Paper on Ink. Never on Ember, never on functional surfaces.
    </div>
  </div>
);

Object.assign(window, {
  CoreColors, FunctionalColors, GrayRamp, TypeSpecimens,
  SpacingScale, RadiusScale, BorderWidths, ShadowDemo, MotionDemo, BrandMark,
});
