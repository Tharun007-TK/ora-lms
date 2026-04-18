import Link from 'next/link';

import { collegeServer } from '@/lib/server-api';

export const revalidate = 3600;

export default async function CollegeLandingPage() {
  const [info, departments] = await Promise.all([
    collegeServer.info(),
    collegeServer.departments(),
  ]);

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
          About MCET
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Dr. Mahalingam College of Engineering and Technology
        </h1>
        {info?.established_year && (
          <p className="text-sm text-[var(--text-secondary)]">
            Established {info.established_year} · Pollachi, Tamil Nadu
          </p>
        )}
        {info?.about ? (
          <p className="max-w-3xl text-base leading-relaxed text-[var(--text-secondary)]">
            {info.about}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            College information has not been published yet.
          </p>
        )}
      </section>

      {(info?.vision || info?.mission) && (
        <section className="grid gap-6 md:grid-cols-2">
          {info?.vision && (
            <div className="rounded-lg border bg-[var(--surface-raised)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
                Vision
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{info.vision}</p>
            </div>
          )}
          {info?.mission && (
            <div className="rounded-lg border bg-[var(--surface-raised)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
                Mission
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{info.mission}</p>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Departments</h2>
        </div>
        {!departments || departments.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No departments published yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/college/departments/${d.id}`}
                className="group rounded-lg border bg-[var(--surface-raised)] p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                    {d.code}
                  </span>
                </div>
                <p className="mt-3 font-semibold group-hover:text-[var(--ember)]">
                  {d.name}
                </p>
                {d.description && (
                  <p className="mt-1 line-clamp-3 text-sm text-[var(--text-secondary)]">
                    {d.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
