'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /** Optional tooltip — used to surface the full course title when the
   *  visible label is the short course code, etc. */
  title?: string;
}

interface BreadcrumbCtx {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const Ctx = createContext<BreadcrumbCtx | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const value = useMemo(() => ({ items, setItems }), [items]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Pages call this with the full chain (root -> current). On unmount,
 *  the chain is cleared so navigating away does not show stale crumbs. */
export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const ctx = useContext(Ctx);
  // Re-run when the items signature changes. Pages typically pass items
  // derived from already-fetched data, so equality on label+href is enough.
  const sig = items.map((i) => `${i.label}|${i.href ?? ''}`).join('>');
  useEffect(() => {
    if (!ctx) return;
    ctx.setItems(items);
    return () => ctx.setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}

function truncate(label: string, max: number): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

/** Renders the chain. Below sm: only the immediate parent shows as
 *  "← <parent>" (matches the existing back-link convention). At sm+:
 *  the full chain renders with chevron separators. */
export function Breadcrumbs() {
  const ctx = useContext(Ctx);
  const items = ctx?.items ?? [];
  if (items.length < 2) return null;

  const parent = items[items.length - 2];
  const tail = items.slice(0, -1);
  const current = items[items.length - 1];

  return (
    <nav
      aria-label="Breadcrumb"
      className="t-caption text-[var(--text-secondary)]"
    >
      {/* Mobile: parent-only escape hatch. */}
      <div className="sm:hidden">
        {parent.href ? (
          <Link
            href={parent.href}
            title={parent.title}
            className="hover:text-[var(--ember)] hover:underline"
          >
            ← {truncate(parent.label, 28)}
          </Link>
        ) : (
          <span title={parent.title}>← {truncate(parent.label, 28)}</span>
        )}
      </div>

      {/* sm+: full chain. */}
      <ol className="hidden flex-wrap items-center gap-1 sm:flex">
        {tail.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href ? (
              <Link
                href={item.href}
                title={item.title}
                className="hover:text-[var(--ember)] hover:underline"
              >
                {truncate(item.label, 28)}
              </Link>
            ) : (
              <span title={item.title}>{truncate(item.label, 28)}</span>
            )}
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              ›
            </span>
          </li>
        ))}
        <li
          aria-current="page"
          className="font-medium text-[var(--ink)]"
          title={current.title}
        >
          {truncate(current.label, 28)}
        </li>
      </ol>
    </nav>
  );
}
