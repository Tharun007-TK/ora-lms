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
} from '@/components/ora';
import { auth } from '@/lib/api';
import { dashboardPathForRole } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await auth.login(email, password);
      router.replace(dashboardPathForRole(user.role));
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Ora</CardTitle>
        <CardDescription>
          Sign in with your MCET account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
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
          onClick={handleLogin}
          disabled={loading || !email || !password}
          loading={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="t-body text-[var(--text-secondary)]">
          No account?{' '}
          <Link
            href="/register"
            className="font-medium text-[var(--ember)] hover:underline"
          >
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
