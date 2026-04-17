import type { UserRole } from '@/lib/api';

export const COOKIE_NAME = process.env.COOKIE_NAME || 'ora_session';

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'student':
    default:
      return '/student/dashboard';
  }
}

export function roleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/faculty')) return 'faculty';
  if (pathname.startsWith('/student')) return 'student';
  return null;
}
