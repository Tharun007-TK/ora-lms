import Link from 'next/link';
import { notFound } from 'next/navigation';

import { collegeServer, resolveServerFileUrl } from '@/lib/server-api';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const profiles = await collegeServer.faculty();
  if (!profiles) return [];
  return profiles.map((p) => ({ id: String(p.id) }));
}

export default async function FacultyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const profile = await collegeServer.facultyOne(id);
  if (!profile) notFound();

  const photo = resolveServerFileUrl(profile.photo_url);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={
            profile.department_id
              ? `/college/departments/${profile.department_id}`
              : '/college'
          }
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back
        </Link>
      </div>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="h-40 w-40 shrink-0 overflow-hidden rounded-lg border bg-[var(--surface-sunken)]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[var(--text-secondary)]">
              {profile.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{profile.name}</h1>
          {profile.designation && (
            <p className="text-base text-[var(--text-secondary)]">
              {profile.designation}
            </p>
          )}
          {profile.department_name && (
            <p className="text-sm">
              <Link
                href={`/college/departments/${profile.department_id}`}
                className="text-[var(--ember)] hover:underline"
              >
                {profile.department_name}
              </Link>
            </p>
          )}
          <p className="text-xs text-[var(--text-secondary)]">{profile.email}</p>
        </div>
      </header>

      {profile.qualifications && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Qualifications
          </h2>
          <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">
            {profile.qualifications}
          </p>
        </section>
      )}

      {profile.achievements && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Achievements
          </h2>
          <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">
            {profile.achievements}
          </p>
        </section>
      )}
    </div>
  );
}
