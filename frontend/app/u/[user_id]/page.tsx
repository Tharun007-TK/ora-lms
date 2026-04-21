import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar, Badge } from '@/components/ora';
import { profileServer } from '@/lib/server-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ user_id: string }>;
}) {
  const { user_id } = await params;
  const id = Number(user_id);
  if (!Number.isFinite(id)) notFound();

  const profile = await profileServer.get(id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      {profile.cover_url && (
        <div className="h-48 w-full overflow-hidden rounded-lg border-hair bg-[var(--surface-sunken)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.cover_url}
            alt="cover"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar
          src={profile.avatar_url}
          fallback={profile.name}
          size="xl"
          alt={profile.name}
        />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{profile.name}</h1>
          {profile.headline && (
            <p className="text-base text-[var(--text-secondary)]">
              {profile.headline}
            </p>
          )}
          <p className="t-caption text-[var(--text-muted)]">
            {profile.role}
            {profile.department_name ? ` · ${profile.department_name}` : ''}
          </p>
          {profile.role === 'faculty' && profile.designation && (
            <p className="text-sm">{profile.designation}</p>
          )}
        </div>
      </header>

      {profile.bio && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            About
          </h2>
          <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">
            {profile.bio}
          </p>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <Badge key={s} tone="neutral" size="md" className="normal-case tracking-normal">
                {s}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {profile.links.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Links
          </h2>
          <ul className="space-y-1 text-sm">
            {profile.links.map((link, i) => (
              <li key={i}>
                <Link
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--ember)] hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.role === 'faculty' && profile.qualifications && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Qualifications
          </h2>
          <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">
            {profile.qualifications}
          </p>
        </section>
      )}

      {profile.role === 'faculty' && profile.achievements && (
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
