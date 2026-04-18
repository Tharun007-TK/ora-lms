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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await auth.register({ name, email, password, role });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your Ora account</CardTitle>
        <CardDescription>
          Set up a student or faculty account to access MCET LMS.
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mcet.ac.in"
            required
          />
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
            onChange={(e) => setRole(e.target.value as UserRole)}
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
          disabled={loading || !email || !password || !name}
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
