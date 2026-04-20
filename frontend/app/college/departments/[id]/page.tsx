import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/ora';
import { collegeServer, resolveServerFileUrl } from '@/lib/server-api';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const departments = await collegeServer.departments();
  if (!departments) return [];
  return departments.map((d) => ({ id: String(d.id) }));
}

export default async function DepartmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [dept, faculty] = await Promise.all([
    collegeServer.department(id),
    collegeServer.departmentFaculty(id),
  ]);

  if (!dept) notFound();

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/college"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← All departments
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
            {dept.code}
          </span>
          <h1 className="text-3xl font-semibold">{dept.name}</h1>
        </div>
        {dept.description && (
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            {dept.description}
          </p>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Faculty</h2>
        {!faculty || faculty.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No faculty profiles published yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {faculty.map((f) => {
              const photo = resolveServerFileUrl(f.photo_url);
              return (
                <Link
                  key={f.id}
                  href={`/college/faculty/${f.id}`}
                  className="group rounded-lg border bg-[var(--surface-raised)] p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-4">
                    <Avatar src={photo} fallback={f.name} size="lg" alt={f.name} />
                    <div>
                      <p className="font-semibold group-hover:text-[var(--ember)]">
                        {f.name}
                      </p>
                      {f.designation && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {f.designation}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
