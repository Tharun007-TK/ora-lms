// ============================================================
// Ora Components — Select, Modal, Sidebar, TopNav, Table, Tabs, Toast
// ============================================================

// ---------- Native Select ----------
const NativeSelect = ({ label, value, onChange, options = [], hint, error, id }) => {
  const autoId = useId();
  const sId = id || autoId;
  return (
    <div>
      {label ? (
        <label htmlFor={sId} className="t-label block mb-1.5">
          {label}
          {hint ? <span className="t-caption ml-1.5 font-normal">{hint}</span> : null}
        </label>
      ) : null}
      <div className={`relative flex items-center bg-[var(--surface-raised)] rounded-md border ${error ? "border-[var(--danger-fg)]" : "border-[var(--border)]"} focus-within:shadow-[var(--focus-ring)] focus-within:border-[var(--gray-700)] transition-[border-color,box-shadow] duration-[var(--dur-fast)]`}>
        <select
          id={sId}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="appearance-none w-full bg-transparent outline-none text-[13px] h-8 px-3 pr-8 text-[var(--text-primary)]"
        >
          {options.map((o) => (
            <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
          ))}
        </select>
        <I.ChevronDown size={14} className="absolute right-2.5 pointer-events-none text-[var(--text-muted)]" />
      </div>
    </div>
  );
};

// ---------- Custom Dropdown ----------
const Dropdown = ({ label, value, onChange, options = [], placeholder = "Select...", id }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => (o.value || o) === value);
  return (
    <div ref={ref} className="relative">
      {label ? <div className="t-label mb-1.5">{label}</div> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full bg-[var(--surface-raised)] rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] focus-ora text-[13px] h-8 px-3 text-left transition-colors"
      >
        <span className={selected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
          {selected ? (selected.label || selected) : placeholder}
        </span>
        <I.ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-[var(--surface-raised)] border-hair rounded-md shadow-[var(--elev-modal)] py-1 max-h-60 overflow-auto">
          {options.map((o) => {
            const v = o.value || o;
            const l = o.label || o;
            const isSel = v === value;
            return (
              <button
                key={v}
                type="button"
                onClick={() => { onChange && onChange(v); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 h-8 text-[13px] text-left hover:bg-[var(--surface-sunken)] transition-colors ${isSel ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
              >
                <span>{l}</span>
                {isSel ? <I.Check size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

// ---------- Modal ----------
const Modal = ({ open, onClose, title, description, width = 480, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.4)] dark:bg-[rgba(0,0,0,0.6)]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-[var(--surface-raised)] border-hair rounded-xl shadow-[var(--elev-modal)] w-full"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex flex-col gap-1">
            {title ? <div className="t-h3">{title}</div> : null}
            {description ? <div className="t-body-sm text-[var(--text-secondary)]">{description}</div> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 -mr-1 rounded-md focus-ora"
          >
            <I.X size={16} />
          </button>
        </div>
        <div className="px-6 py-3">{children}</div>
        {footer ? (
          <div className="px-6 py-4 border-hair-t flex items-center justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};

// ---------- Tabs ----------
const Tabs = ({ value, onChange, tabs = [] }) => (
  <div className="flex items-center gap-1 border-hair-b">
    {tabs.map((t) => {
      const v = t.value || t;
      const l = t.label || t;
      const active = v === value;
      return (
        <button
          key={v}
          onClick={() => onChange && onChange(v)}
          className={`relative h-9 px-3 text-[13px] font-medium transition-colors focus-ora rounded-sm ${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          <span className="flex items-center gap-1.5">
            {l}
            {t.count != null ? (
              <span className="t-mono text-[11px] text-[var(--text-muted)]">{t.count}</span>
            ) : null}
          </span>
          {active ? (
            <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-[var(--ink)] dark:bg-[var(--gray-900)]" />
          ) : null}
        </button>
      );
    })}
  </div>
);

// ---------- Table ----------
const Table = ({ columns = [], rows = [], zebra = false, selection = false, empty, selected, onSelect }) => {
  const allSel = selection && selected && selected.size === rows.length && rows.length > 0;
  const someSel = selection && selected && selected.size > 0 && !allSel;
  return (
    <div className="border-hair rounded-lg overflow-hidden bg-[var(--surface-raised)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[var(--surface-sunken)] border-hair-b">
            {selection ? (
              <th className="px-3 py-2.5 w-[36px]">
                <Checkbox
                  checked={allSel}
                  indeterminate={someSel}
                  onChange={(c) => {
                    if (!onSelect) return;
                    onSelect(c ? new Set(rows.map((_, i) => i)) : new Set());
                  }}
                />
              </th>
            ) : null}
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 t-eyebrow text-left ${c.align === "right" ? "text-right" : ""} ${c.align === "center" ? "text-center" : ""}`}
                style={{ width: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length + (selection ? 1 : 0)} className="px-6 py-12 text-center">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const isSel = selected && selected.has(i);
              return (
                <tr
                  key={i}
                  className={`border-hair-b last:border-b-0 transition-colors hover:bg-[var(--surface-sunken)] ${zebra && i % 2 ? "bg-[var(--surface-sunken)]" : ""} ${isSel ? "bg-[rgba(216,90,48,0.04)]" : ""}`}
                >
                  {selection ? (
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={isSel}
                        onChange={(c) => {
                          if (!onSelect) return;
                          const next = new Set(selected);
                          if (c) next.add(i); else next.delete(i);
                          onSelect(next);
                        }}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2.5 ${c.align === "right" ? "text-right" : ""} ${c.align === "center" ? "text-center" : ""} ${c.mono ? "font-mono text-[12px] tnum" : ""}`}
                      style={{ width: c.width }}
                    >
                      {c.render ? c.render(r[c.key], r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

// ---------- Toast ----------
const Toast = ({ tone = "neutral", title, description, onClose }) => {
  const tones = {
    neutral: { Icon: I.Info, fg: "var(--text-primary)", bg: "var(--surface-raised)", bar: "var(--gray-700)" },
    info:    { Icon: I.Info, fg: "var(--info-text)", bg: "var(--info-bg)", bar: "var(--info-fg)" },
    success: { Icon: I.CheckCircle, fg: "var(--success-text)", bg: "var(--success-bg)", bar: "var(--success-fg)" },
    warning: { Icon: I.AlertCircle, fg: "var(--warning-text)", bg: "var(--warning-bg)", bar: "var(--warning-fg)" },
    danger:  { Icon: I.AlertCircle, fg: "var(--danger-text)", bg: "var(--danger-bg)", bar: "var(--danger-fg)" },
  };
  const t = tones[tone];
  const Ic = t.Icon;
  return (
    <div
      className="toast-in relative flex items-start gap-3 min-w-[320px] max-w-[380px] rounded-md border-hair pl-3 pr-2 py-2.5"
      style={{ background: t.bg, color: t.fg }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md" style={{ background: t.bar }} />
      <Ic size={14} className="mt-[2px] shrink-0" />
      <div className="flex-1 min-w-0">
        {title ? <div className="t-label" style={{ color: t.fg }}>{title}</div> : null}
        {description ? <div className="t-caption mt-0.5" style={{ color: t.fg, opacity: 0.85 }}>{description}</div> : null}
      </div>
      {onClose ? (
        <button onClick={onClose} className="shrink-0 p-0.5 rounded-sm opacity-60 hover:opacity-100 focus-ora" aria-label="Dismiss">
          <I.X size={12} />
        </button>
      ) : null}
    </div>
  );
};

// ---------- Sidebar ----------
const SidebarItem = ({ icon, label, active, collapsed, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-[13px] transition-colors focus-ora ${
      active
        ? "bg-[var(--surface-sunken)] text-[var(--text-primary)] font-medium"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
    } ${collapsed ? "justify-center" : ""}`}
    title={collapsed ? label : undefined}
  >
    <span className="relative shrink-0">
      {React.cloneElement(icon, { size: 16 })}
      {active && !collapsed ? (
        <span className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-[var(--ember)]" />
      ) : null}
    </span>
    {collapsed ? null : (
      <>
        <span className="truncate text-left flex-1">{label}</span>
        {badge != null ? (
          <span className="t-mono text-[10px] text-[var(--text-muted)]">{badge}</span>
        ) : null}
      </>
    )}
  </button>
);

const Sidebar = ({ collapsed = false, active = "home", onNav, onToggle, items }) => {
  const groups = items || [
    { label: "Work", items: [
      { id: "home", label: "Home", icon: <I.Home /> },
      { id: "courses", label: "Courses", icon: <I.Book />, badge: 8 },
      { id: "drafting", label: "Drafting", icon: <I.Quill />, badge: 3 },
      { id: "students", label: "Students", icon: <I.Users /> },
      { id: "assignments", label: "Assignments", icon: <I.FileText /> },
    ]},
    { label: "Plan", items: [
      { id: "calendar", label: "Calendar", icon: <I.Calendar /> },
      { id: "reports", label: "Reports", icon: <I.BarChart /> },
    ]},
    { label: "Account", items: [
      { id: "settings", label: "Settings", icon: <I.Settings /> },
    ]},
  ];
  return (
    <aside
      className="border-hair-r bg-[var(--surface)] flex flex-col transition-[width] duration-[var(--dur-base)]"
      style={{ width: collapsed ? 64 : 240 }}
    >
      <div className={`flex items-center gap-2 h-12 px-3 border-hair-b ${collapsed ? "justify-center" : ""}`}>
        {collapsed ? (
          <span className="text-[var(--text-primary)]"><OraMark size={22} /></span>
        ) : (
          <>
            <span className="text-[var(--text-primary)] -ml-0.5"><OraWordmark height={22} /></span>
            <div className="flex-1 min-w-0 ml-1">
              <div className="t-caption text-[11px] leading-tight truncate">MCET — Mech. Eng.</div>
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto py-2">
        {groups.map((g, gi) => (
          <div key={gi} className={`${gi ? "mt-3" : ""} px-2`}>
            {collapsed ? null : <div className="t-eyebrow px-2 mb-1.5">{g.label}</div>}
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <SidebarItem
                  key={it.id}
                  icon={it.icon}
                  label={it.label}
                  badge={it.badge}
                  active={active === it.id}
                  collapsed={collapsed}
                  onClick={() => onNav && onNav(it.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-hair-t p-2">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-2 h-8 px-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors focus-ora text-[12px] ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? <I.ChevronRight size={14} /> : (<><I.ChevronLeft size={14} /><span>Collapse</span></>)}
        </button>
      </div>
    </aside>
  );
};

// ---------- Top nav ----------
const TopNav = ({ breadcrumbs = [], onSearch, darkMode, onToggleDark }) => {
  const [menu, setMenu] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const mref = useRef(null);
  const wref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (mref.current && !mref.current.contains(e.target)) setMenu(false);
      if (wref.current && !wref.current.contains(e.target)) setWorkspace(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <header className="h-12 flex items-center justify-between px-4 border-hair-b bg-[var(--surface)]">
      <div className="flex items-center gap-3 min-w-0">
        <div ref={wref} className="relative">
          <button
            onClick={() => setWorkspace((o) => !o)}
            className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-[var(--surface-sunken)] focus-ora transition-colors"
          >
            <div className="w-5 h-5 rounded-[4px] bg-[var(--gray-800)] dark:bg-[var(--gray-800)] flex items-center justify-center text-[10px] font-medium text-[var(--paper)] dark:text-[var(--ink)]">M</div>
            <span className="t-label">MCET</span>
            <I.ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>
          {workspace ? (
            <div className="absolute z-30 top-full mt-1 left-0 w-[240px] bg-[var(--surface-raised)] border-hair rounded-md shadow-[var(--elev-modal)] py-1">
              <div className="t-eyebrow px-3 pt-1.5 pb-1">Workspaces</div>
              {[
                ["M", "MCET", "Faculty · Mech"],
                ["K", "KCET", "Dean"],
                ["S", "SSIT", "Registrar"],
              ].map(([k, n, r]) => (
                <button key={k} className="w-full flex items-center gap-2 px-3 h-10 hover:bg-[var(--surface-sunken)] text-left">
                  <div className="w-6 h-6 rounded-[4px] bg-[var(--gray-800)] text-[var(--paper)] dark:text-[var(--ink)] flex items-center justify-center text-[11px] font-medium">{k}</div>
                  <div className="flex-1 min-w-0">
                    <div className="t-label">{n}</div>
                    <div className="t-caption truncate">{r}</div>
                  </div>
                </button>
              ))}
              <div className="border-hair-t mt-1 pt-1">
                <button className="w-full flex items-center gap-2 px-3 h-8 hover:bg-[var(--surface-sunken)] text-left t-body-sm text-[var(--text-secondary)]">
                  <I.Plus size={14} /> Add workspace
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {breadcrumbs.length > 0 ? (
          <>
            <I.ChevronRight size={12} className="text-[var(--text-muted)]" />
            <nav className="flex items-center gap-1.5 min-w-0">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  <span className={`t-body-sm ${i === breadcrumbs.length - 1 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"} truncate`}>
                    {b}
                  </span>
                  {i < breadcrumbs.length - 1 ? <I.ChevronRight size={12} className="text-[var(--text-muted)]" /> : null}
                </React.Fragment>
              ))}
            </nav>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 h-8 px-2.5 rounded-md border-hair text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors focus-ora min-w-[220px]"
        >
          <I.Search size={14} />
          <span className="t-body-sm flex-1 text-left">Search courses, students…</span>
          <Kbd>⌘</Kbd><Kbd>K</Kbd>
        </button>
        <button
          onClick={onToggleDark}
          aria-label="Toggle theme"
          className="h-8 w-8 rounded-md hover:bg-[var(--surface-sunken)] flex items-center justify-center text-[var(--text-secondary)] focus-ora transition-colors"
        >
          {darkMode ? <I.Sun size={15} /> : <I.Moon size={15} />}
        </button>
        <button className="h-8 w-8 rounded-md hover:bg-[var(--surface-sunken)] flex items-center justify-center text-[var(--text-secondary)] focus-ora transition-colors relative">
          <I.Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--ember)]" />
        </button>
        <div ref={mref} className="relative">
          <button
            onClick={() => setMenu((o) => !o)}
            className="h-8 pl-1 pr-2 rounded-md hover:bg-[var(--surface-sunken)] flex items-center gap-1.5 focus-ora transition-colors"
          >
            <Avatar size="sm" name="Priya Ramachandran" />
            <I.ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>
          {menu ? (
            <div className="absolute right-0 top-full mt-1 w-[220px] bg-[var(--surface-raised)] border-hair rounded-md shadow-[var(--elev-modal)] py-1 z-30">
              <div className="px-3 py-2 border-hair-b">
                <div className="t-label">Priya Ramachandran</div>
                <div className="t-caption">priya@mcet.in</div>
              </div>
              {["Profile", "Preferences", "Keyboard shortcuts"].map((x) => (
                <button key={x} className="w-full text-left px-3 h-8 hover:bg-[var(--surface-sunken)] text-[13px] text-[var(--text-secondary)]">{x}</button>
              ))}
              <div className="border-hair-t mt-1 pt-1">
                <button className="w-full text-left px-3 h-8 hover:bg-[var(--surface-sunken)] text-[13px] text-[var(--text-secondary)]">Sign out</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

Object.assign(window, { NativeSelect, Dropdown, Modal, Tabs, Table, Toast, Sidebar, TopNav });
