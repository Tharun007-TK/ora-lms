'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ora';
import {
  profile as profileApi,
  type ProfileLink,
  type UserProfile,
} from '@/lib/api';

const BIO_MAX = 500;
const HEADLINE_MAX = 120;
const SKILLS_MAX = 20;
const LINKS_MAX = 20;

export function ProfileEditor() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [designation, setDesignation] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [achievements, setAchievements] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    profileApi
      .me()
      .then((p) => {
        setProfile(p);
        setHeadline(p.headline ?? '');
        setBio(p.bio ?? '');
        setSkills(p.skills ?? []);
        setLinks(p.links ?? []);
        setDesignation(p.designation ?? '');
        setQualifications(p.qualifications ?? '');
        setAchievements(p.achievements ?? '');
        setIsPublic(p.is_public);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || skills.length >= SKILLS_MAX || skills.includes(s)) return;
    setSkills([...skills, s]);
    setSkillInput('');
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const addLink = () => {
    if (links.length >= LINKS_MAX) return;
    setLinks([...links, { label: '', url: '' }]);
  };
  const updateLink = (i: number, patch: Partial<ProfileLink>) => {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const removeLink = (i: number) =>
    setLinks(links.filter((_, idx) => idx !== i));

  const onSave = async () => {
    setError(null);
    setOk(null);
    if (bio.length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }
    if (headline.length > HEADLINE_MAX) {
      setError(`Headline must be ${HEADLINE_MAX} characters or fewer.`);
      return;
    }
    const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim());
    setSaving(true);
    try {
      const updated = await profileApi.update({
        bio: bio || null,
        headline: headline || null,
        skills,
        links: cleanLinks,
        designation:
          profile?.role === 'faculty' ? designation || null : undefined,
        qualifications:
          profile?.role === 'faculty' ? qualifications || null : undefined,
        achievements:
          profile?.role === 'faculty' ? achievements || null : undefined,
        is_public: isPublic,
      });
      setProfile(updated);
      setLinks(updated.links);
      setOk('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (kind: 'avatar' | 'cover', file: File) => {
    setError(null);
    setOk(null);
    setUploading(kind);
    try {
      const updated =
        kind === 'avatar'
          ? await profileApi.uploadAvatar(file)
          : await profileApi.uploadCover(file);
      setProfile(updated);
      setOk(`${kind === 'avatar' ? 'Avatar' : 'Cover'} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  if (loading)
    return (
      <p className="t-body text-[var(--text-secondary)]">Loading profile…</p>
    );
  if (!profile)
    return (
      <p className="t-body text-[var(--danger-fg)]">
        {error || 'Could not load profile.'}
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="t-body text-[var(--text-secondary)]">
            {profile.name} · {profile.role}
            {profile.is_public ? (
              <>
                {' · '}
                <Link
                  href={`/u/${profile.user_id}`}
                  className="text-[var(--ember)] hover:underline"
                >
                  View public profile
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {error && (
        <p className="t-caption text-[var(--danger-fg)]" role="alert">
          {error}
        </p>
      )}
      {ok && <p className="t-caption text-[var(--ember)]">{ok}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>
            Avatar (≤2MB) and cover (≤5MB). JPEG, PNG, or WebP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar
                src={profile.avatar_url}
                fallback={profile.name}
                size="xl"
                alt={`${profile.name}'s avatar`}
              />
              <label className="cursor-pointer text-xs text-[var(--ember)] hover:underline">
                {uploading === 'avatar' ? 'Uploading…' : 'Change avatar'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload('avatar', f);
                    e.target.value = '';
                  }}
                  disabled={uploading !== null}
                />
              </label>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-24 w-full overflow-hidden rounded-md border-hair bg-[var(--surface-sunken)]">
                {profile.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.cover_url}
                    alt="cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">
                    No cover image
                  </div>
                )}
              </div>
              <label className="cursor-pointer text-xs text-[var(--ember)] hover:underline">
                {uploading === 'cover' ? 'Uploading…' : 'Change cover'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload('cover', f);
                    e.target.value = '';
                  }}
                  disabled={uploading !== null}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={HEADLINE_MAX}
              placeholder="e.g. Final-year CSE student"
            />
            <p className="t-caption text-[var(--text-muted)]">
              {headline.length}/{HEADLINE_MAX}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              rows={4}
              className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 t-body placeholder:text-[var(--text-muted)] focus-ora"
              placeholder="Tell people about yourself…"
            />
            <p className="t-caption text-[var(--text-muted)]">
              {bio.length}/{BIO_MAX}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Up to {SKILLS_MAX} tags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill"
              disabled={skills.length >= SKILLS_MAX}
            />
            <Button
              variant="secondary"
              onClick={addSkill}
              disabled={skills.length >= SKILLS_MAX || !skillInput.trim()}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} tone="neutral" size="md" className="normal-case tracking-normal">
                {s}
                <button
                  type="button"
                  className="text-[var(--text-muted)] hover:text-[var(--danger-fg)]"
                  onClick={() => removeSkill(s)}
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="t-caption text-[var(--text-muted)]">
                No skills yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>Up to {LINKS_MAX} links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(i, { label: e.target.value })}
                placeholder="Label (e.g. GitHub)"
                maxLength={60}
              />
              <Input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://…"
                maxLength={500}
              />
              <Button
                variant="ghost"
                onClick={() => removeLink(i)}
                aria-label="Remove link"
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={addLink}
            disabled={links.length >= LINKS_MAX}
          >
            Add link
          </Button>
        </CardContent>
      </Card>

      {profile.role === 'faculty' && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty details</CardTitle>
            <CardDescription>
              These appear on your public college profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                maxLength={200}
                placeholder="e.g. Associate Professor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <textarea
                id="qualifications"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 t-body focus-ora"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievements">Achievements</Label>
              <textarea
                id="achievements"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 t-body focus-ora"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1"
            />
            <span className="t-body">
              Make my profile public at{' '}
              <code className="t-caption">/u/{profile.user_id}</code>.
              <span className="block t-caption text-[var(--text-muted)]">
                When off, only you and admins can view it.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={onSave} loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
