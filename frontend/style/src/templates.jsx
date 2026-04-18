// ============================================================
// Ora templates — Auth shell + App shell
// ============================================================

// ---------- Auth shell ----------
const AuthShell = () => {
  const [email, setEmail] = useState("priya@mcet.in");
  const [password, setPassword] = useState("••••••••••");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1400);
  };
  return (
    <div className="border-hair rounded-xl overflow-hidden bg-[var(--surface-raised)]">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
        {/* Editorial left */}
        <div className="relative bg-[var(--ink)] text-[var(--paper)] p-10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[var(--paper)]">
            <OraWordmark height={28} />
          </div>
          <div>
            <div className="t-eyebrow" style={{ color: "rgba(250,250,245,0.5)" }}>Academic year 2026–27</div>
            <div className="font-serif mt-5" style={{ fontSize: 52, lineHeight: 1.04, letterSpacing: "-0.015em" }}>
              Syllabus, meet your second <em>pair of hands.</em>
            </div>
            <p className="mt-6 max-w-md text-[14px] leading-[1.6]" style={{ color: "rgba(250,250,245,0.72)" }}>
              Draft lesson plans, quizzes and rubrics from a syllabus in minutes. Keep what works, revise what doesn't. Built for faculty at MCET, KCET and partner colleges.
            </p>
          </div>
          <div className="flex items-end justify-between">
            <div className="font-mono text-[11px]" style={{ color: "rgba(250,250,245,0.5)" }}>
              v2.14 · released Mar 2026
            </div>
            <div className="font-mono text-[11px]" style={{ color: "rgba(250,250,245,0.5)" }}>
              ora.education
            </div>
          </div>
        </div>
        {/* Form right */}
        <div className="bg-[var(--paper)] p-10 flex flex-col">
          <div className="flex justify-end">
            <span className="t-body-sm text-[var(--text-secondary)]">
              New to Ora? <a href="#" className="text-[var(--text-primary)] underline underline-offset-[3px] decoration-[var(--border-strong)] hover:decoration-[var(--ember)]">Request access</a>
            </span>
          </div>
          <div className="mt-10">
            <div className="t-h1" style={{ fontWeight: 500 }}>Sign in</div>
            <div className="t-body text-[var(--text-secondary)] mt-2">Use your institutional email to continue.</div>
          </div>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4 max-w-[360px]">
            <Input label="Institutional email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Input
              label="Password"
              hint="(forgot?)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              suffix={<button type="button" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><I.Eye size={14} /></button>}
            />
            <div className="flex items-center justify-between pt-1">
              <Checkbox checked={remember} onChange={setRemember} label="Remember this device" />
            </div>
            <Button variant="primary" size="lg" loading={loading} type="submit" iconRight={<I.ArrowRight />}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-hair-t" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-[var(--paper)] t-caption">or</span></div>
            </div>
            <Button variant="secondary" size="lg">Continue with institution SSO</Button>
          </form>
          <div className="mt-auto pt-10 flex items-center justify-between">
            <span className="t-caption">By signing in you agree to the <a href="#" className="underline underline-offset-[3px] decoration-[var(--border-strong)]">terms</a> and <a href="#" className="underline underline-offset-[3px] decoration-[var(--border-strong)]">privacy policy</a>.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- App shell ----------
const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("courses");
  const [tab, setTab] = useState("enrolled");
  const [sel, setSel] = useState(new Set());

  const courses = [
    { id: "CS301", title: "Data Structures & Algorithms", code: "CS301-04", faculty: "Priya R.", students: 58, progress: "W4 of 14", status: "On track", tone: "success" },
    { id: "CS214", title: "Operating Systems",            code: "CS214-02", faculty: "Arjun M.",  students: 62, progress: "W4 of 14", status: "At risk",  tone: "warning" },
    { id: "EC205", title: "Digital Logic Design",         code: "EC205-01", faculty: "Nikita S.", students: 44, progress: "W3 of 14", status: "On track", tone: "success" },
    { id: "ME108", title: "Thermodynamics",               code: "ME108-03", faculty: "Raghav K.", students: 71, progress: "W4 of 14", status: "Drafting", tone: "info" },
    { id: "HS101", title: "Professional Communication",   code: "HS101-07", faculty: "Meera P.",  students: 49, progress: "W5 of 14", status: "On track", tone: "success" },
  ];

  const columns = [
    { key: "code", label: "Code", width: 110, mono: true },
    { key: "title", label: "Course",
      render: (v, r) => (
        <div className="flex flex-col">
          <span className="text-[var(--text-primary)]">{v}</span>
          <span className="t-caption">{r.faculty}</span>
        </div>
      )
    },
    { key: "students", label: "Students", width: 90, align: "right", mono: true },
    { key: "progress", label: "Progress", width: 110, mono: true,
      render: (v) => <span className="text-[var(--text-secondary)]">{v}</span>
    },
    { key: "status", label: "Status", width: 110,
      render: (v, r) => <Badge tone={r.tone} dot>{v}</Badge>
    },
    { key: "actions", label: "", width: 40,
      render: () => (
        <button className="p-1 rounded-md hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <I.MoreHorizontal size={16} />
        </button>
      )
    },
  ];

  return (
    <div className="border-hair rounded-xl overflow-hidden bg-[var(--surface)]" style={{ height: 660 }}>
      <div className="flex h-full">
        <Sidebar
          collapsed={collapsed}
          active={active}
          onNav={setActive}
          onToggle={() => setCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav breadcrumbs={["Teaching", "Courses"]} darkMode={false} onToggleDark={() => {}} />
          <div className="flex-1 overflow-auto">
            {/* Page header */}
            <div className="px-8 pt-6 pb-4">
              <div className="t-eyebrow mb-2">Odd semester · 2026</div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="t-h1">Courses</div>
                  <div className="t-body text-[var(--text-secondary)] mt-1">Five active sections. Three lesson plans awaiting your review.</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" iconLeft={<I.Filter />}>Filters</Button>
                  <Button variant="secondary" iconLeft={<I.Download />}>Export</Button>
                  <Button variant="primary" iconLeft={<I.Plus />}>New course</Button>
                </div>
              </div>
            </div>

            {/* Stat strip */}
            <div className="px-8 pb-4 grid grid-cols-4 gap-3">
              {[
                ["Active courses", "5", "+1 from last sem"],
                ["Students enrolled", "284", "across 5 sections"],
                ["Draft lesson plans", "12", "3 awaiting review"],
                ["Avg. submission rate", "87%", "▲ 3.2 pts WoW"],
              ].map(([l, v, h]) => (
                <div key={l} className="border-hair rounded-lg bg-[var(--surface-raised)] p-4">
                  <div className="t-caption">{l}</div>
                  <div className="font-serif mt-1 tnum" style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.01em" }}>{v}</div>
                  <div className="t-caption mt-0.5">{h}</div>
                </div>
              ))}
            </div>

            <div className="px-8">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "enrolled", label: "My sections", count: 5 },
                  { value: "drafts", label: "Drafts", count: 12 },
                  { value: "archive", label: "Archive", count: 47 },
                ]}
              />
            </div>

            <div className="px-8 py-4">
              <Table columns={columns} rows={courses} selection selected={sel} onSelect={setSel} />
              <div className="flex items-center justify-between mt-3">
                <div className="t-caption">{sel.size > 0 ? `${sel.size} selected` : `Showing 5 of 5`}</div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" iconLeft={<I.ChevronLeft />}>Prev</Button>
                  <Button variant="ghost" size="sm" iconRight={<I.ChevronRight />}>Next</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AuthShell, AppShell });
