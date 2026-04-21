import { cookies } from 'next/headers';

import type {
  CollegeInfo,
  Department,
  FacultyProfile,
  LibraryBook,
  UserProfile,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SERVER_FETCH_TIMEOUT_MS = Number(
  process.env.SERVER_FETCH_TIMEOUT_MS ?? 12000,
);

function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

async function serverFetch<T>(path: string, revalidate = 3600): Promise<T | null> {
  const { signal, clear } = createTimeoutSignal(SERVER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clear();
  }
}

export const collegeServer = {
  info: () => serverFetch<CollegeInfo>('/college/info'),
  departments: () => serverFetch<Department[]>('/college/departments'),
  department: (id: number) =>
    serverFetch<Department>(`/college/departments/${id}`),
  departmentFaculty: (id: number) =>
    serverFetch<FacultyProfile[]>(`/college/departments/${id}/faculty`),
  faculty: () => serverFetch<FacultyProfile[]>('/college/faculty'),
  facultyOne: (id: number) =>
    serverFetch<FacultyProfile>(`/college/faculty/${id}`),
};

export function resolveServerFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

async function authedServerFetch<T>(path: string): Promise<T | null> {
  const { signal, clear } = createTimeoutSignal(SERVER_FETCH_TIMEOUT_MS);
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clear();
  }
}

export const profileServer = {
  get: (userId: number) => authedServerFetch<UserProfile>(`/profile/${userId}`),
};

export type {
  CollegeInfo,
  Department,
  FacultyProfile,
  LibraryBook,
  UserProfile,
};
