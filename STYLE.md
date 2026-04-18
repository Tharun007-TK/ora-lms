# Ora Design System — Style Rules

This project uses the **Ora** design system for all UI work. Follow these rules on every UI-related task without exception. If a rule conflicts with a user request, surface the conflict — do not silently deviate.

## 1. Source of truth

The Ora system lives in these files. **Read them before generating any UI code.** Do not regenerate values from memory.

- `style/src/styles/ora-tokens.css` — all CSS variables (colors, surfaces, motion, focus ring, elevation). Single source of truth for every color and timing value in the app.
- `style/src/styles/ora-typography.css` — `.t-*` utility classes and font stack.
- `style/src/styles/ora-utilities.css` — `.border-hair*`, `.focus-ora`, keyframes, `.hatch`, `.tnum`.
- `sstyle/src/components/ora/` — ported React primitives and components. Use these. Do not recreate them inline.
- `style/design-system-source/Ora UI Kit.html` — reference styleguide. Read-only. Never import from here.

If a value isn't defined in those files, it doesn't exist in the system. Flag the gap; don't invent one.

## 2. Non-negotiable rules

### Colors
- **Never hardcode hex values** in component files. Always use `var(--token-name)` or the `.t-*` utilities.
- The three core colors are `--ink`, `--paper`, `--ember`. Ember is an accent only — use it on **≤5% of any given screen** (focus rings, single CTAs, key highlights). Never as a background for large surfaces, never for body text, never on functional surfaces (info/success/warning/danger).
- Functional colors (`--info-*`, `--success-*`, `--warning-*`, `--danger-*`) are for status communication only. Never for decoration.
- For grays, use the `--gray-50` through `--gray-900` ramp. Do not introduce intermediate values.

### Typography
- Use `.t-*` classes for every piece of text. Do not set `font-size`, `font-weight`, `line-height`, or `font-family` directly in component code.
- Three families only: Instrument Serif (display), Inter (UI), JetBrains Mono (code/IDs/timestamps). Do not add a fourth.
- Display styles (`t-display-xl`, `t-display-lg`) are for marketing/hero surfaces — never for in-app UI headings. Use `t-h1`/`t-h2`/`t-h3` in-app.

### Components
- For Button, Input, Select, Dropdown, Checkbox, Radio, Badge, Avatar, Modal, Sidebar, TopNav, Table, Tabs, Toast — **always import from `src/components/ora/`**. Do not build these inline.
- If an existing Ora component is missing a prop you need, extend the component in `src/components/ora/` — don't fork it inline in a page file.
- If a needed component doesn't exist yet (e.g. course card, gradebook row, quiz option), build it in `src/components/ora/` following the existing primitive patterns: CSS variables for colors, `.t-*` for type, `h-8` default height, `rounded-md` default radius, `.focus-ora` for focus states.

### Icons
- Use `lucide-react` exclusively. Do not import SVGs inline or add another icon package.
- Default icon size: 14px in `sm`/`md` contexts, 16px in `lg`. Match the original Ora kit sizing.

### Layout & spacing
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px (Tailwind `1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20`). Do not use arbitrary values like `p-[13px]` unless matching a specific design spec.
- Radii: `sm` (4px), `md` (6px, default), `lg` (8px), `xl` (12px), `full` (9999px). Don't introduce others.
- Borders are **hairline by default** — use `.border-hair*` utilities, not Tailwind's `border`/`border-t` (which is 1px). Reserve 1px for emphasized borders, 2px for focus/selected states only.

### Motion
- Three durations only: `--dur-fast` (120ms, hovers/taps), `--dur-base` (200ms, opens/toasts/tabs), `--dur-slow` (320ms, modals/page-level).
- One easing: `var(--ease)`. Do not introduce new cubic-beziers.
- Respect `prefers-reduced-motion` in any new animation.

### Dark mode
- The system uses the `.dark` class strategy (set on `<html>` or a root element).
- Every new component must work in both modes. Test both before calling a component done.
- Never hardcode a dark variant with literal hex values — the `.dark` overrides in `ora-tokens.css` handle this automatically when you use CSS variables.

### Focus & accessibility
- Every interactive element must have `.focus-ora` (or equivalent `box-shadow: var(--focus-ring)` on focus-visible). Never remove focus outlines without replacing them.
- Minimum tap target: 32px height (`h-8`). For mobile-primary surfaces, 40px (`h-10`).
- Color is never the sole carrier of meaning. Status uses icon + color + text.

## 3. Behavior when generating UI

1. **Before writing any new component**, check `src/components/ora/` for an existing one. If one exists, use it.
2. **Before hardcoding any color, spacing, or font value**, check `ora-tokens.css` / `ora-typography.css`. If a token exists, use it. If not, ask before inventing.
3. **When porting or editing Ora components**, preserve the original variant/size API. Don't "clean up" class strings into `cva` or similar unless explicitly asked.
4. **When a design requires something outside the system** (a one-off color, a new animation, a display size not in the scale), stop and flag it in your response: "This requires a system extension: [what]. Should I add it to the tokens or find an in-system alternative?" Do not silently add it.
5. **Never duplicate CSS variables.** If you need a new semantic token (e.g. `--course-card-bg`), it must resolve to an existing primitive (e.g. `var(--surface-raised)`), not a raw hex.

## 4. Things to never do

- Import Tailwind color classes that contradict the system (`bg-blue-500`, `text-red-600`, etc.). The palette is Ink/Paper/Ember + gray ramp + four functional pairs. Nothing else.
- Add a new font family, shadow, radius, or duration without explicit approval.
- Use `!important` to override Ora utilities.
- Install component libraries that duplicate Ora primitives (shadcn, MUI, Chakra, Radix as a full kit, HeroUI). Radix *primitives* (unstyled) are acceptable if wrapping them in an Ora-styled component — flag first.
- Use emoji as icons in-app. Brand voice is restrained.
- Reproduce the Ora wordmark on Ember or any functional surface. Ink-on-Paper or Paper-on-Ink only.

## 5. When in doubt

Ask, don't assume. A small clarifying question beats a systemwide style drift that takes a week to unwind.

## Status — Suspended for Days 9–12

The rules below apply in full starting Day 13 (Ora rollout).
During Days 9–12, the rule "use Ora primitives, not shadcn primitives" is SUSPENDED.
Use shadcn primitives (current codebase convention). Use Ora tokens for colors, type, spacing.