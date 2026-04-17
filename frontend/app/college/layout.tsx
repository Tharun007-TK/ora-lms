import Link from 'next/link';

export default function CollegeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/college" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">Ora</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              MCET
            </span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/college"
              className="text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Dr. Mahalingam College of Engineering and
        Technology, Pollachi.
      </footer>
    </div>
  );
}
