export type UserRole = 'admin' | 'faculty' | 'student';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  department_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface UserBrief {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  description: string | null;
  department_id: number | null;
  faculty_id: number | null;
  faculty_name: string | null;
  semester: string | null;
  created_at: string;
  enrolled: boolean | null;
  enrollment_count: number | null;
}

export interface Note {
  id: number;
  course_id: number;
  title: string;
  content: string | null;
  file_url: string | null;
  ai_generated: boolean;
  created_by: number | null;
  created_at: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number;
  created_by: number | null;
  created_at: string;
  submitted: boolean | null;
  submission_id: number | null;
  marks: number | null;
}

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';
export type JudgeVerdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | string;

export interface JudgeProblemBrief {
  id: number;
  title: string;
  difficulty: ProblemDifficulty;
  created_at: string;
  solved: boolean | null;
}

export interface CodingTestcase {
  id: number;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface JudgeProblem {
  id: number;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  examples: string | null;
  constraints: string | null;
  created_by: number | null;
  created_at: string;
  testcases: CodingTestcase[];
}

export interface JudgeSubmission {
  id: number;
  problem_id: number;
  student_id: number;
  language_id: number;
  source_code: string;
  status: JudgeVerdict;
  stdout: string | null;
  stderr: string | null;
  time_ms: number | null;
  memory_kb: number | null;
  submitted_at: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface LibraryBook {
  id: number;
  title: string;
  author: string;
  category: string | null;
  file_url: string | null;
  cover_url: string | null;
  uploaded_by: number | null;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface CollegeInfo {
  id: number;
  about: string | null;
  vision: string | null;
  mission: string | null;
  established_year: number | null;
  updated_at: string;
}

export interface FacultyProfile {
  id: number;
  user_id: number;
  name: string;
  email: string;
  department_id: number | null;
  department_name: string | null;
  designation: string | null;
  qualifications: string | null;
  achievements: string | null;
  photo_url: string | null;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string | null;
  file_url: string | null;
  marks: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export interface ApiError extends Error {
  status: number;
  detail?: string;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function buildError(status: number, detail: string): ApiError {
  const err = new Error(detail) as ApiError;
  err.status = status;
  err.detail = detail;
  return err;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw buildError(401, 'Not authenticated');
  }
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const data = await res.json();
      detail = typeof data?.detail === 'string' ? data.detail : undefined;
    } catch {
      detail = await res.text().catch(() => undefined);
    }
    throw buildError(res.status, detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return handle<T>(res);
}

export async function apiUpload<T = unknown>(
  path: string,
  body: FormData,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    body,
  });
  return handle<T>(res);
}

/** Convert a backend file URL (absolute or relative `/files/...`) to absolute. */
export function fileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

export const users = {
  list: (role?: UserRole) =>
    apiFetch<User[]>(`/users${role ? `?role=${role}` : ''}`),
  faculty: () => apiFetch<UserBrief[]>('/users/faculty'),
};

export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (body: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    department_id?: number | null;
  }) =>
    apiFetch<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => apiFetch<{ detail: string }>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<User>('/auth/me'),
};

export const courses = {
  list: (opts?: { mine?: boolean }) =>
    apiFetch<Course[]>(`/courses${opts?.mine ? '?mine=true' : ''}`),
  get: (id: number) => apiFetch<Course>(`/courses/${id}`),
  create: (body: {
    title: string;
    code: string;
    description?: string | null;
    department_id?: number | null;
    faculty_id?: number | null;
    semester?: string | null;
  }) =>
    apiFetch<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: number,
    body: Partial<{
      title: string;
      description: string | null;
      department_id: number | null;
      faculty_id: number | null;
      semester: string | null;
    }>,
  ) =>
    apiFetch<Course>(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    apiFetch<{ detail: string }>(`/courses/${id}`, { method: 'DELETE' }),
  enroll: (id: number, studentId?: number) =>
    apiFetch<{ detail: string }>(`/courses/${id}/enroll`, {
      method: 'POST',
      body: JSON.stringify(studentId ? { student_id: studentId } : {}),
    }),
  unenroll: (id: number, studentId?: number) =>
    apiFetch<{ detail: string }>(
      `/courses/${id}/enroll${studentId ? `?student_id=${studentId}` : ''}`,
      { method: 'DELETE' },
    ),
  students: (id: number) => apiFetch<UserBrief[]>(`/courses/${id}/students`),
};

export const notes = {
  list: (courseId: number) =>
    apiFetch<Note[]>(`/courses/${courseId}/notes`),
  get: (courseId: number, id: number) =>
    apiFetch<Note>(`/courses/${courseId}/notes/${id}`),
  create: (
    courseId: number,
    data: { title: string; content?: string; file?: File | null },
  ) => {
    const fd = new FormData();
    fd.set('title', data.title);
    if (data.content) fd.set('content', data.content);
    if (data.file) fd.set('file', data.file);
    return apiUpload<Note>(`/courses/${courseId}/notes`, fd);
  },
  remove: (courseId: number, id: number) =>
    apiFetch<{ detail: string }>(`/courses/${courseId}/notes/${id}`, {
      method: 'DELETE',
    }),
};

export const assignments = {
  list: (courseId: number) =>
    apiFetch<Assignment[]>(`/courses/${courseId}/assignments`),
  create: (
    courseId: number,
    body: {
      title: string;
      description?: string | null;
      due_date: string;
      max_marks?: number;
    },
  ) =>
    apiFetch<Assignment>(`/courses/${courseId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  get: (id: number) => apiFetch<Assignment>(`/assignments/${id}`),
  update: (
    id: number,
    body: Partial<{
      title: string;
      description: string | null;
      due_date: string;
      max_marks: number;
    }>,
  ) =>
    apiFetch<Assignment>(`/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    apiFetch<{ detail: string }>(`/assignments/${id}`, { method: 'DELETE' }),
  submit: (id: number, file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return apiUpload<Submission>(`/assignments/${id}/submit`, fd);
  },
  submissions: (id: number) =>
    apiFetch<Submission[]>(`/assignments/${id}/submissions`),
  grade: (
    submissionId: number,
    body: { marks: number; feedback?: string | null },
  ) =>
    apiFetch<Submission>(`/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  mySubmissions: () => apiFetch<Submission[]>('/submissions/mine'),
};

export const library = {
  list: (opts?: { category?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (opts?.category) params.set('category', opts.category);
    if (opts?.q) params.set('q', opts.q);
    const qs = params.toString();
    return apiFetch<LibraryBook[]>(`/library${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => apiFetch<LibraryBook>(`/library/${id}`),
  categories: () => apiFetch<string[]>('/library/categories'),
  upload: (data: {
    title: string;
    author: string;
    category?: string | null;
    file: File;
    cover?: File | null;
  }) => {
    const fd = new FormData();
    fd.set('title', data.title);
    fd.set('author', data.author);
    if (data.category) fd.set('category', data.category);
    fd.set('file', data.file);
    if (data.cover) fd.set('cover', data.cover);
    return apiUpload<LibraryBook>('/library', fd);
  },
  update: (
    id: number,
    body: Partial<{ title: string; author: string; category: string | null }>,
  ) =>
    apiFetch<LibraryBook>(`/library/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    apiFetch<{ detail: string }>(`/library/${id}`, { method: 'DELETE' }),
};

export const judge = {
  problems: () => apiFetch<JudgeProblemBrief[]>('/judge/problems'),
  problem: (id: number) => apiFetch<JudgeProblem>(`/judge/problems/${id}`),
  createProblem: (body: {
    title: string;
    description: string;
    difficulty: ProblemDifficulty;
    examples?: string | null;
    constraints?: string | null;
    testcases: { input: string; expected_output: string; is_hidden?: boolean }[];
  }) =>
    apiFetch<JudgeProblem>('/judge/problems', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateProblem: (id: number, body: Partial<Omit<JudgeProblem, 'id' | 'testcases' | 'created_at' | 'created_by'>>) =>
    apiFetch<JudgeProblem>(`/judge/problems/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteProblem: (id: number) =>
    apiFetch<{ detail: string }>(`/judge/problems/${id}`, { method: 'DELETE' }),
  submit: (
    problemId: number,
    body: { language_id: number; source_code: string; stdin?: string | null },
  ) =>
    apiFetch<JudgeSubmission>(`/judge/problems/${problemId}/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  mySubmissions: (problemId?: number) =>
    apiFetch<JudgeSubmission[]>(
      `/judge/submissions/mine${problemId ? `?problem_id=${problemId}` : ''}`,
    ),
};

export const notifications = {
  list: (opts?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unread_only', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return apiFetch<Notification[]>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  unreadCount: () => apiFetch<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) =>
    apiFetch<Notification>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    apiFetch<{ detail: string }>('/notifications/read-all', { method: 'POST' }),
};

export const LANGUAGES: { id: number; name: string; monaco: string }[] = [
  { id: 71, name: 'Python 3', monaco: 'python' },
  { id: 54, name: 'C++ (GCC 9)', monaco: 'cpp' },
  { id: 62, name: 'Java (OpenJDK 13)', monaco: 'java' },
  { id: 63, name: 'JavaScript (Node 12)', monaco: 'javascript' },
];

export const ai = {
  generateNotes: (data: {
    courseId: number;
    title: string;
    file: File;
    keepPdf?: boolean;
  }) => {
    const fd = new FormData();
    fd.set('course_id', String(data.courseId));
    fd.set('title', data.title);
    fd.set('keep_pdf', data.keepPdf === false ? 'false' : 'true');
    fd.set('file', data.file);
    return apiUpload<Note>('/ai/generate-notes', fd);
  },
};

export const college = {
  info: () => apiFetch<CollegeInfo>('/college/info'),
  departments: () => apiFetch<Department[]>('/college/departments'),
  department: (id: number) => apiFetch<Department>(`/college/departments/${id}`),
  departmentFaculty: (id: number) =>
    apiFetch<FacultyProfile[]>(`/college/departments/${id}/faculty`),
  faculty: () => apiFetch<FacultyProfile[]>('/college/faculty'),
  facultyOne: (id: number) => apiFetch<FacultyProfile>(`/college/faculty/${id}`),
  updateInfo: (body: Partial<Omit<CollegeInfo, 'id' | 'updated_at'>>) =>
    apiFetch<CollegeInfo>('/college/info', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createDepartment: (body: { name: string; code: string; description?: string | null }) =>
    apiFetch<Department>('/college/departments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateDepartment: (id: number, body: Partial<Omit<Department, 'id'>>) =>
    apiFetch<Department>(`/college/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  removeDepartment: (id: number) =>
    apiFetch<{ detail: string }>(`/college/departments/${id}`, { method: 'DELETE' }),
  updateMyProfile: (data: {
    designation?: string | null;
    qualifications?: string | null;
    achievements?: string | null;
    department_id?: number | null;
    photo?: File | null;
  }) => {
    const fd = new FormData();
    if (data.designation !== undefined && data.designation !== null)
      fd.set('designation', data.designation);
    if (data.qualifications !== undefined && data.qualifications !== null)
      fd.set('qualifications', data.qualifications);
    if (data.achievements !== undefined && data.achievements !== null)
      fd.set('achievements', data.achievements);
    if (data.department_id !== undefined && data.department_id !== null)
      fd.set('department_id', String(data.department_id));
    if (data.photo) fd.set('photo', data.photo);
    return apiUpload<FacultyProfile>('/college/faculty/me', fd, 'PUT');
  },
};
