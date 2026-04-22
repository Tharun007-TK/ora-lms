import type { ReactNode } from 'react';
import Link from 'next/link';

export default function CollegeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/college" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">Ora</span>
            <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
              MCET
            </span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/college"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              About
            </Link>
            <Link
              href="/login"
              className="font-medium text-[var(--ember)] hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-[var(--text-secondary)]">
        © {new Date().getFullYear()} Dr. Mahalingam College of Engineering and
        Technology, Pollachi.
      </footer>
    </div>
  );
}
