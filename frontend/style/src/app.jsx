// ============================================================
// Ora — UI Kit reference page
// ============================================================

const Section = ({ id, eyebrow, title, description, children }) => (
  <section id={id} className="max-w-[1240px] mx-auto px-8 py-16 border-hair-b">
    <div className="flex items-baseline justify-between gap-8 mb-8">
      <div className="max-w-2xl">
        <div className="t-eyebrow">{eyebrow}</div>
        <div className="t-h1 mt-2" style={{ fontWeight: 500 }}>{title}</div>
        {description ? <div className="t-body text-[var(--text-secondary)] mt-2">{description}</div> : null}
      </div>
    </div>
    {children}
  </section>
);

const SubBlock = ({ title, caption, children }) => (
  <div className="mb-10 last:mb-0">
    <div className="flex items-baseline justify-between mb-4">
      <div className="t-h3" style={{ fontWeight: 500 }}>{title}</div>
      {caption ? <div className="t-caption">{caption}</div> : null}
    </div>
    {children}
  </div>
);

const StickyNav = ({ active, onNav, dark, onToggleDark }) => {
  const items = [
    ["tokens", "Tokens"],
    ["components", "Components"],
    ["templates", "Templates"],
  ];
  return (
    <div className="sticky top-0 z-40 bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-[8px] border-hair-b">
      <div className="max-w-[1240px] mx-auto px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-primary)]"><OraWordmark height={24} /></span>
          <span className="t-caption border-hair-l pl-3 leading-tight">UI Kit · v0.1</span>
        </div>
        <nav className="flex items-center gap-1">
          {items.map(([id, l]) => (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`h-8 px-3 rounded-md text-[13px] transition-colors ${
                active === id ? "text-[var(--text-primary)] font-medium bg-[var(--surface-sunken)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="t-caption hidden md:block">Built for MCET, KCET & partner colleges</span>
          <button
            onClick={onToggleDark}
            aria-label="Toggle theme"
            className="h-8 px-2.5 rounded-md border-hair flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-ora"
          >
            {dark ? <I.Sun size={14} /> : <I.Moon size={14} />}
            <span className="t-body-sm">{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Components showcase blocks ----------
const ButtonsShowcase = () => (
  <SubBlock title="Button" caption="Primary · Secondary · Ghost · Danger · Ember">
    <div className="border-hair rounded-lg bg-[var(--surface-raised)] divide-y divide-[var(--border)]">
      {[
        ["Primary", "primary"],
        ["Secondary", "secondary"],
        ["Ghost", "ghost"],
        ["Danger", "danger"],
        ["Ember", "ember"],
      ].map(([label, v]) => (
        <div key={v} className="grid grid-cols-[130px_1fr] items-center px-5 py-4">
          <div className="t-label">{label}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant={v} size="sm" iconLeft={<I.Plus />}>Small</Button>
            <Button variant={v} size="md" iconLeft={<I.Plus />}>Medium</Button>
            <Button variant={v} size="lg" iconLeft={<I.Plus />}>Large</Button>
            <Button variant={v} size="md">Default</Button>
            <Button variant={v} size="md" loading>Loading</Button>
            <Button variant={v} size="md" disabled>Disabled</Button>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[130px_1fr] items-center px-5 py-4">
        <div className="t-label">Icon only</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><I.Plus /></Button>
          <Button variant="secondary" size="md"><I.Search /></Button>
          <Button variant="ghost" size="md"><I.MoreHorizontal /></Button>
          <Button variant="primary" size="lg"><I.ArrowRight /></Button>
        </div>
      </div>
    </div>
  </SubBlock>
);

const InputsShowcase = () => {
  const [v1, setV1] = useState("Data Structures & Algorithms");
  const [v2, setV2] = useState("");
  const [v3, setV3] = useState("Arrays are a contiguous block of memory. We'll cover indexing, cache behavior, and how dynamic arrays amortize.");
  return (
    <SubBlock title="Input" caption="Text · Textarea · With prefix, error, helper">
      <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-6 grid grid-cols-2 gap-6">
        <Input label="Course name" value={v1} onChange={(e) => setV1(e.target.value)} helper="Shown on student dashboards." />
        <Input label="Course code" placeholder="e.g. CS301-04" prefix={<I.Folder size={14} />} />
        <Input label="Institutional email" placeholder="faculty@college.in" type="email" value={v2} onChange={(e) => setV2(e.target.value)} error={v2 && !v2.includes("@") ? "Email must include @" : null} />
        <Input label="Enrollment cap" type="number" defaultValue={60} hint="(maximum students)" suffix={<span className="t-mono text-[11px]">seats</span>} />
        <div className="col-span-2">
          <Input label="Lesson plan summary" textarea rows={4} value={v3} onChange={(e) => setV3(e.target.value)} helper="Plain language. 2–3 sentences is usually enough." />
        </div>
        <Input label="Disabled field" value="Read-only value" disabled />
        <Input label="Focused (tab to see)" placeholder="Click or tab here" />
      </div>
    </SubBlock>
  );
};

const ChoicesShowcase = () => {
  const [sel, setSel] = useState("cs");
  const [radio, setRadio] = useState("mcq");
  const [a, setA] = useState(true), [b, setB] = useState(false), [c, setC] = useState(true);
  const deptOpts = [
    { value: "cs", label: "Computer Science" },
    { value: "ec", label: "Electronics & Communication" },
    { value: "me", label: "Mechanical Engineering" },
    { value: "ce", label: "Civil Engineering" },
  ];
  return (
    <SubBlock title="Select · Checkbox · Radio" caption="Native select, custom dropdown, inline groups">
      <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-6 grid grid-cols-2 gap-6">
        <NativeSelect label="Department (native)" value={sel} onChange={setSel} options={deptOpts} />
        <Dropdown label="Department (custom)" value={sel} onChange={setSel} options={deptOpts} />
        <div>
          <div className="t-label mb-2">Checkboxes</div>
          <div className="flex flex-col gap-2">
            <Checkbox checked={a} onChange={setA} label="Publish to student dashboards" description="Visible immediately on save." />
            <Checkbox checked={b} onChange={setB} label="Notify enrolled students by email" />
            <Checkbox checked={c} indeterminate onChange={setC} label="Include previous cohort's results" />
            <Checkbox checked={false} disabled label="Sync with outcome framework (coming soon)" />
          </div>
        </div>
        <div>
          <div className="t-label mb-2">Assessment type</div>
          <div className="flex flex-col gap-2">
            {[
              ["mcq", "Multiple choice", "Auto-graded. 30 minute default."],
              ["short", "Short answer", "Rubric-graded by faculty."],
              ["project", "Project submission", "Team or individual, with artefact upload."],
              ["lab", "Lab (disabled)", null],
            ].map(([v, l, d]) => (
              <Radio key={v} name="a" value={v} checked={radio === v} onChange={setRadio} label={l} description={d} disabled={v === "lab"} />
            ))}
          </div>
        </div>
      </div>
    </SubBlock>
  );
};

const CardsShowcase = () => (
  <SubBlock title="Card" caption="Default · Raised · Interactive (clickable)">
    <div className="grid grid-cols-3 gap-4">
      <Card variant="default" className="p-5">
        <Badge tone="info" dot>Lesson plan</Badge>
        <div className="font-serif mt-3" style={{ fontSize: 22, lineHeight: 1.2 }}>Week 4 — Binary search trees</div>
        <div className="t-body-sm text-[var(--text-secondary)] mt-1">Introduces tree rotations and balance factor. Quiz at end of session.</div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-hair-t">
          <Avatar size="xs" name="Priya Ramachandran" />
          <span className="t-caption">Priya R. · edited 2h ago</span>
        </div>
      </Card>
      <Card variant="raised" className="p-5">
        <Badge tone="ember" dot>Draft</Badge>
        <div className="font-serif mt-3" style={{ fontSize: 22, lineHeight: 1.2 }}>Graph algorithms — Week 7</div>
        <div className="t-body-sm text-[var(--text-secondary)] mt-1">Auto-drafted from syllabus. Needs review before publishing.</div>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="primary" size="sm">Review draft</Button>
          <Button variant="ghost" size="sm">Discard</Button>
        </div>
      </Card>
      <Card variant="default" interactive className="p-5">
        <div className="flex items-center justify-between">
          <Badge tone="success" dot>Published</Badge>
          <I.ArrowUpRight size={14} className="text-[var(--text-muted)]" />
        </div>
        <div className="font-serif mt-3" style={{ fontSize: 22, lineHeight: 1.2 }}>Rubric — OS Lab submission</div>
        <div className="t-body-sm text-[var(--text-secondary)] mt-1">4 criteria · 20 marks · used by 62 students.</div>
        <div className="t-mono text-[11px] text-[var(--text-muted)] mt-4">CS214 · v3 · Mar 14</div>
      </Card>
    </div>
  </SubBlock>
);

const BadgesShowcase = () => (
  <SubBlock title="Badge / Pill" caption="Five semantic tones. With and without status dot.">
    <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
        <Badge tone="ember">Ember</Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="neutral" dot>Draft</Badge>
        <Badge tone="info" dot>In review</Badge>
        <Badge tone="success" dot>Published</Badge>
        <Badge tone="warning" dot>At risk</Badge>
        <Badge tone="danger" dot>Failed sync</Badge>
        <Badge tone="ember" dot>New</Badge>
      </div>
    </div>
  </SubBlock>
);

const AvatarsShowcase = () => (
  <SubBlock title="Avatar" caption="Initials-based, with optional status dot.">
    <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-6 flex items-center gap-6 flex-wrap">
      <div className="flex items-end gap-3">
        {["xs", "sm", "md", "lg", "xl"].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <Avatar size={s} name="Priya Ramachandran" />
            <span className="t-mono text-[10px] text-[var(--text-muted)]">{s}</span>
          </div>
        ))}
      </div>
      <div className="h-10 w-px bg-[var(--border)] mx-2" />
      <div className="flex items-center gap-3">
        {[
          ["Arjun Mehta", "online"],
          ["Nikita Sharma", "busy"],
          ["Raghav Kumar", "away"],
          ["Meera Patel", "offline"],
        ].map(([n, st]) => (
          <div key={n} className="flex items-center gap-2">
            <Avatar size="md" name={n} status={st} />
            <div className="flex flex-col">
              <span className="t-label">{n}</span>
              <span className="t-caption">{st}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-10 w-px bg-[var(--border)] mx-2" />
      <div className="flex items-center -space-x-2">
        {["AM", "NS", "RK", "MP", "PR"].map((n, i) => (
          <span key={i} className="ring-2 ring-[var(--surface-raised)] rounded-full">
            <Avatar size="md" name={n} />
          </span>
        ))}
        <span className="ring-2 ring-[var(--surface-raised)] rounded-full">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-sunken)] border-hair text-[11px] font-medium text-[var(--text-secondary)]">+12</span>
        </span>
      </div>
    </div>
  </SubBlock>
);

const ModalShowcase = () => {
  const [open, setOpen] = useState(false);
  const [openDanger, setOpenDanger] = useState(false);
  return (
    <SubBlock title="Modal" caption="Centered, with backdrop. Max-widths 480 / 640 / 800.">
      <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-6 flex items-center gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>Open form modal</Button>
        <Button variant="secondary" onClick={() => setOpenDanger(true)}>Open confirm modal</Button>
        <span className="t-caption">Press <Kbd>Esc</Kbd> to close</span>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite faculty to MCET"
        description="They'll get an email with a link to set up their account."
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Send invite</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Full name" placeholder="e.g. Rohit Iyer" />
          <Input label="Institutional email" placeholder="faculty@mcet.in" type="email" />
          <NativeSelect label="Role" value="fac" onChange={() => {}} options={[
            { value: "fac", label: "Faculty" },
            { value: "hod", label: "Head of department" },
            { value: "adm", label: "Administrator" },
          ]} />
        </div>
      </Modal>
      <Modal
        open={openDanger}
        onClose={() => setOpenDanger(false)}
        title="Archive this course section?"
        description="Students will lose access immediately. You can restore from the archive within 30 days."
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenDanger(false)}>Keep active</Button>
            <Button variant="danger" iconLeft={<I.Trash />} onClick={() => setOpenDanger(false)}>Archive section</Button>
          </>
        }
      >
        <div className="t-body-sm text-[var(--text-secondary)]">
          CS301-04 · Data Structures & Algorithms · 58 enrolled students.
        </div>
      </Modal>
    </SubBlock>
  );
};

const TabsShowcase = () => {
  const [v, setV] = useState("plan");
  return (
    <SubBlock title="Tabs" caption="Underline style. Sentence case. Count as tnum mono.">
      <div className="border-hair rounded-lg bg-[var(--surface-raised)]">
        <div className="px-4">
          <Tabs
            value={v}
            onChange={setV}
            tabs={[
              { value: "plan", label: "Lesson plan", count: 14 },
              { value: "quiz", label: "Quizzes", count: 6 },
              { value: "rubric", label: "Rubrics", count: 3 },
              { value: "roster", label: "Roster", count: 58 },
              { value: "activity", label: "Activity" },
            ]}
          />
        </div>
        <div className="p-6 t-body-sm text-[var(--text-secondary)]">
          {v === "plan" && "14 weekly plans · 4 drafted by Ora, 10 authored by faculty."}
          {v === "quiz" && "6 quizzes · 2 published, 4 drafts."}
          {v === "rubric" && "3 rubrics · used across this section."}
          {v === "roster" && "58 students · 4 waitlisted · last sync 2 min ago."}
          {v === "activity" && "This section's activity log for the past 7 days."}
        </div>
      </div>
    </SubBlock>
  );
};

const TableShowcase = () => {
  const [sel, setSel] = useState(new Set([0, 2]));
  const rows = [
    { id: "ORA-2026-00418", student: "Aditya Nair", section: "CS301-04", submitted: "14:32 IST", score: 84, status: "Graded", tone: "success" },
    { id: "ORA-2026-00419", student: "Divya Krishnan", section: "CS301-04", submitted: "14:41 IST", score: 72, status: "Graded", tone: "success" },
    { id: "ORA-2026-00420", student: "Faiz Ahmed", section: "CS301-04", submitted: "15:02 IST", score: null, status: "In review", tone: "info" },
    { id: "ORA-2026-00421", student: "Harini Suresh", section: "CS301-04", submitted: "15:18 IST", score: null, status: "Flagged", tone: "warning" },
    { id: "ORA-2026-00422", student: "Karthik Rao", section: "CS301-04", submitted: "—", score: null, status: "Missing", tone: "danger" },
  ];
  const cols = [
    { key: "id", label: "Submission", width: 180, mono: true,
      render: (v) => <span className="text-[var(--text-secondary)]">{v}</span> },
    { key: "student", label: "Student",
      render: (v) => (
        <div className="flex items-center gap-2">
          <Avatar size="sm" name={v} />
          <span>{v}</span>
        </div>
      ) },
    { key: "section", label: "Section", width: 110, mono: true },
    { key: "submitted", label: "Submitted at", width: 120, mono: true,
      render: (v) => <span className="text-[var(--text-secondary)]">{v}</span> },
    { key: "score", label: "Score", width: 70, align: "right", mono: true,
      render: (v) => v == null ? <span className="text-[var(--text-muted)]">—</span> : v },
    { key: "status", label: "Status", width: 110,
      render: (v, r) => <Badge tone={r.tone} dot>{v}</Badge> },
  ];
  return (
    <SubBlock title="Table" caption="Header, row hover, selection, IDs in mono.">
      <Table columns={cols} rows={rows} selection selected={sel} onSelect={setSel} />
      <div className="mt-4">
        <div className="t-caption mb-2">Empty state</div>
        <Table
          columns={cols}
          rows={[]}
          empty={
            <div className="flex flex-col items-center gap-2 py-2">
              <I.Folder size={22} className="text-[var(--text-muted)]" />
              <div className="t-label">No submissions yet</div>
              <div className="t-caption max-w-sm">When students submit work for this section, it'll appear here.</div>
            </div>
          }
        />
      </div>
    </SubBlock>
  );
};

const ToastsShowcase = () => {
  const [stack, setStack] = useState([
    { id: 1, tone: "success", title: "Lesson plan published", description: "Week 4 · visible to 58 students." },
    { id: 2, tone: "info",    title: "Ora drafted your rubric", description: "Review and edit before publishing." },
    { id: 3, tone: "warning", title: "3 students below attendance floor", description: "Counsel before midterm." },
    { id: 4, tone: "danger",  title: "Roster sync failed", description: "Retry or download .csv instead." },
  ]);
  return (
    <SubBlock title="Toast / Notification" caption="Top-right, auto-dismiss. Four semantic variants.">
      <div className="border-hair rounded-lg bg-[var(--surface-sunken)] p-6 flex flex-col gap-2 items-end">
        {stack.map((t) => (
          <Toast key={t.id} {...t} onClose={() => setStack((s) => s.filter((x) => x.id !== t.id))} />
        ))}
        {stack.length === 0 ? (
          <div className="w-full flex items-center justify-between">
            <span className="t-caption">All clear.</span>
            <Button variant="secondary" size="sm" onClick={() => setStack([
              { id: Date.now(),  tone: "success", title: "Lesson plan published", description: "Week 4 · visible to 58 students." },
              { id: Date.now()+1,tone: "info",    title: "Ora drafted your rubric", description: "Review and edit before publishing." },
              { id: Date.now()+2,tone: "warning", title: "3 students below attendance floor", description: "Counsel before midterm." },
              { id: Date.now()+3,tone: "danger",  title: "Roster sync failed", description: "Retry or download .csv instead." },
            ])}>Replay</Button>
          </div>
        ) : null}
      </div>
    </SubBlock>
  );
};

const NavShowcase = () => (
  <>
    <SubBlock title="Sidebar navigation" caption="Collapsed 64px / expanded 240px. Section groupings.">
      <div className="grid grid-cols-2 gap-4">
        <div className="border-hair rounded-lg overflow-hidden" style={{ height: 420 }}>
          <Sidebar active="courses" onNav={() => {}} onToggle={() => {}} />
        </div>
        <div className="border-hair rounded-lg overflow-hidden" style={{ height: 420 }}>
          <Sidebar collapsed active="drafting" onNav={() => {}} onToggle={() => {}} />
        </div>
      </div>
    </SubBlock>
    <SubBlock title="Top nav bar" caption="Workspace switcher · breadcrumbs · search · profile.">
      <div className="border-hair rounded-lg overflow-hidden">
        <TopNav breadcrumbs={["Teaching", "Courses", "CS301-04"]} darkMode={false} onToggleDark={() => {}} />
      </div>
    </SubBlock>
  </>
);

// ---------- Root ----------
const App = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("ora-dark") === "1"; } catch { return false; }
  });
  const [active, setActive] = useState("tokens");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("ora-dark", dark ? "1" : "0"); } catch {}
  }, [dark]);

  useEffect(() => {
    const ids = ["tokens", "components", "templates"];
    const onScroll = () => {
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el && el.getBoundingClientRect().top < 120) {
          setActive(ids[i]);
          return;
        }
      }
      setActive(ids[0]);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <StickyNav active={active} onNav={scrollTo} dark={dark} onToggleDark={() => setDark((d) => !d)} />

      {/* Hero */}
      <div className="max-w-[1240px] mx-auto px-8 pt-16 pb-10 border-hair-b">
        <div className="grid grid-cols-12 gap-8 items-end">
          <div className="col-span-8">
            <div className="t-eyebrow mb-4">Ora — UI Kit · April 2026</div>
            <div className="t-display-xl" style={{ textWrap: "pretty" }}>
              A calm, tool-like kit for <em>faculty, deans,</em> and <em>students</em>.
            </div>
            <p className="t-body mt-6 max-w-[560px] text-[var(--text-secondary)]">
              Tokens, twelve components, and two page shells — scoped tight on purpose. Flat surfaces, hairline borders, Ember only as punctuation. No gradients, no glows, no "magical."
            </p>
          </div>
          <div className="col-span-4">
            <div className="border-hair rounded-lg bg-[var(--surface-raised)] p-5">
              <div className="t-eyebrow mb-3">At a glance</div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                <div><div className="t-caption">Tokens</div><div className="t-mono text-[12px]">5 families</div></div>
                <div><div className="t-caption">Components</div><div className="t-mono text-[12px]">13 · all states</div></div>
                <div><div className="t-caption">Templates</div><div className="t-mono text-[12px]">Auth + App shell</div></div>
                <div><div className="t-caption">Modes</div><div className="t-mono text-[12px]">Light + dark</div></div>
                <div><div className="t-caption">Fonts</div><div className="t-mono text-[12px]">Inst. Serif · Inter · JBM</div></div>
                <div><div className="t-caption">Icons</div><div className="t-mono text-[12px]">Lucide, 1.5px</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOKENS */}
      <Section
        id="tokens"
        eyebrow="01 — Reference"
        title="Design tokens"
        description="Colors, type, spacing, radii, borders, shadows, motion. One source of truth; both themes encoded on the same palette logic."
      >
        <SubBlock title="Brand mark" caption="Wordmark and lock-up. The quill is the one non-neutral element.">
          <BrandMark />
        </SubBlock>
        <SubBlock title="Core color" caption="Ink · Paper · Ember. Ember never fills surfaces.">
          <CoreColors />
        </SubBlock>
        <SubBlock title="Neutral ramp" caption="gray-50 → gray-900 · OKLCH-interpolated from Paper to Ink.">
          <GrayRamp />
        </SubBlock>
        <SubBlock title="Functional color" caption="Info · Success · Warning · Danger. Same-ramp dark text.">
          <FunctionalColors />
        </SubBlock>
        <SubBlock title="Typography" caption="Instrument Serif for editorial · Inter for UI · JetBrains Mono for numerics & IDs.">
          <TypeSpecimens />
        </SubBlock>
        <SubBlock title="Spacing" caption="4px base. 11 stops.">
          <SpacingScale />
        </SubBlock>
        <div className="grid grid-cols-2 gap-8">
          <SubBlock title="Radius" caption="Default 6–8px. Pills only for pills.">
            <RadiusScale />
          </SubBlock>
          <SubBlock title="Borders" caption="0.5px default. 2px is for focus & accents.">
            <BorderWidths />
          </SubBlock>
        </div>
        <SubBlock title="Elevation & focus" caption="Functional only. No decorative shadows.">
          <ShadowDemo />
        </SubBlock>
        <SubBlock title="Motion" caption="Single easing curve. Three durations.">
          <MotionDemo />
        </SubBlock>
      </Section>

      {/* COMPONENTS */}
      <Section
        id="components"
        eyebrow="02 — Components"
        title="Components, every state"
        description="Grouped by purpose: Actions, Inputs, Containers, Feedback, Data, Navigation."
      >
        <div className="mb-6 t-eyebrow">Actions</div>
        <ButtonsShowcase />
        <div className="mb-6 t-eyebrow">Inputs</div>
        <InputsShowcase />
        <ChoicesShowcase />
        <div className="mb-6 t-eyebrow">Containers</div>
        <CardsShowcase />
        <ModalShowcase />
        <div className="mb-6 t-eyebrow">Data & feedback</div>
        <BadgesShowcase />
        <AvatarsShowcase />
        <TabsShowcase />
        <TableShowcase />
        <ToastsShowcase />
        <div className="mb-6 t-eyebrow">Navigation</div>
        <NavShowcase />
      </Section>

      {/* TEMPLATES */}
      <Section
        id="templates"
        eyebrow="03 — Templates"
        title="Page templates"
        description="Two shells, rendered at realistic dimensions. Same tokens — no bespoke styles."
      >
        <SubBlock title="Auth shell" caption="Editorial left · paper form right · stacks on mobile.">
          <AuthShell />
        </SubBlock>
        <SubBlock title="App shell" caption="Sidebar · top nav · page title · primary action · table.">
          <AppShell />
        </SubBlock>
      </Section>

      <footer className="max-w-[1240px] mx-auto px-8 py-10 flex items-center justify-between">
        <div className="t-caption">Ora · UI Kit v0.1 · built April 2026</div>
        <div className="t-mono text-[11px] text-[var(--text-muted)]">ora.education</div>
      </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
