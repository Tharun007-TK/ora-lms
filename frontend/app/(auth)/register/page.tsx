'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from '@/components/ora';
import { auth, type UserRole } from '@/lib/api';
import { dashboardPathForRole } from '@/lib/auth';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
];

const STUDENT_DOMAIN = 'mcet.in';
const STAFF_DOMAIN = 'drmcet.ac.in';

function expectedDomain(role: UserRole): string {
  return role === 'student' ? STUDENT_DOMAIN : STAFF_DOMAIN;
}

function validateEmailForRole(email: string, role: UserRole): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Email is required.';
  const atIdx = trimmed.indexOf('@');
  if (atIdx < 0) return 'Enter a valid email address.';
  const domain = trimmed.slice(atIdx + 1);
  const expected = expectedDomain(role);
  if (domain !== expected) {
    return role === 'student'
      ? `Student accounts must use an @${STUDENT_DOMAIN} email.`
      : `Faculty accounts must use an @${STAFF_DOMAIN} email.`;
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onEmailBlur = () => {
    setEmailError(email ? validateEmailForRole(email, role) : null);
  };

  const onRoleChange = (next: UserRole) => {
    setRole(next);
    if (email) setEmailError(validateEmailForRole(email, next));
  };

  const handleRegister = async () => {
    setError(null);
    const emailIssue = validateEmailForRole(email, role);
    if (emailIssue) {
      setEmailError(emailIssue);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await auth.register({
        name,
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      router.replace(dashboardPathForRole(user.role));
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const placeholder =
    role === 'student' ? `rollno@${STUDENT_DOMAIN}` : `name@${STAFF_DOMAIN}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your Ora account</CardTitle>
        <CardDescription>
          Use your MCET institutional email. Students: @{STUDENT_DOMAIN}.
          Faculty: @{STAFF_DOMAIN}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={onEmailBlur}
            placeholder={placeholder}
            required
            invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <p
              id="email-error"
              className="t-caption text-[var(--danger-fg)]"
              role="alert"
            >
              {emailError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            id="role"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <p className="t-caption text-[var(--danger-fg)]" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleRegister}
          disabled={loading || !email || !password || !name || !!emailError}
          loading={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="t-body text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--ember)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
