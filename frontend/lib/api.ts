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

export type AssignmentType = 'file' | 'quiz';

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number;
  created_by: number | null;
  created_at: string;
  type: AssignmentType;
  submitted: boolean | null;
  submission_id: number | null;
  marks: number | null;
  attempt_id: number | null;
  score: number | null;
  max_score: number | null;
}

export interface QuizOptionFaculty {
  id: number;
  option_text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizOptionStudent {
  id: number;
  option_text: string;
  position: number;
}

export interface QuizQuestionFaculty {
  id: number;
  question_text: string;
  position: number;
  points: number;
  options: QuizOptionFaculty[];
}

export interface QuizQuestionStudent {
  id: number;
  question_text: string;
  position: number;
  points: number;
  options: QuizOptionStudent[];
}

export interface QuizAttemptStart {
  attempt_id: number;
  assignment_id: number;
  started_at: string;
  submitted_at: string | null;
  max_score: number;
  score: number | null;
  correct_count: number | null;
  questions: QuizQuestionStudent[];
}

export interface QuizAttemptAnswer {
  question_id: number;
  selected_option_ids: number[];
  correct_option_ids: number[];
  is_correct: boolean;
  points_earned: number;
  points_max: number;
}

export interface QuizAttemptResult {
  attempt_id: number;
  assignment_id: number;
  student_id: number;
  score: number;
  max_score: number;
  submitted_at: string | null;
  answers: QuizAttemptAnswer[];
}

export interface QuizAttemptSummary {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string | null;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
}

export interface AssignmentStatsEntry {
  assignment_id: number;
  completed: number;
  total_enrolled: number;
}

export interface CodingLeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string | null;
  best_score: number;
  max_score: number;
  submissions: number;
  last_submitted_at: string;
}

export interface QuizQuestionCreatePayload {
  question_text: string;
  position?: number;
  points?: number;
  options: { option_text: string; is_correct: boolean }[];
}

export interface QuizAnswerInPayload {
  question_id: number;
  option_ids: number[];
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

export interface ProfileLink {
  label: string;
  url: string;
}

export interface UserProfile {
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  department_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  headline: string | null;
  links: ProfileLink[];
  skills: string[];
  designation: string | null;
  qualifications: string | null;
  achievements: string | null;
  is_public: boolean;
  updated_at: string | null;
}

export interface UserProfileUpdate {
  bio?: string | null;
  headline?: string | null;
  links?: ProfileLink[];
  skills?: string[];
  designation?: string | null;
  qualifications?: string | null;
  achievements?: string | null;
  is_public?: boolean;
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

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || ''
).replace(/\/+$/, '');

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
  const res = await fetch(`${API_URL}/api${path}`, {
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
  const res = await fetch(`${API_URL}/api${path}`, {
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
  if (url.startsWith('/')) return `${API_URL}/api${url}`;
  return url;
}

export interface StudentImportRow {
  line: number;
  email: string;
  status: 'created' | 'exists' | 'error';
  detail?: string | null;
  generated_password?: string | null;
}

export interface StudentImportResult {
  total: number;
  created: number;
  skipped: number;
  rows: StudentImportRow[];
}

export const users = {
  list: (role?: UserRole) =>
    apiFetch<User[]>(`/users${role ? `?role=${role}` : ''}`),
  faculty: () => apiFetch<UserBrief[]>('/users/faculty'),
  importStudents: (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return apiUpload<StudentImportResult>('/users/students/import', fd);
  },
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
  performanceXlsxUrl: (id: number, studentIds?: number[]) => {
    const qs =
      studentIds && studentIds.length > 0
        ? `?student_ids=${studentIds.join(',')}`
        : '';
    return `${API_URL}/api/courses/${id}/performance.xlsx${qs}`;
  },
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
      type?: AssignmentType;
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
  listMine: () => apiFetch<Assignment[]>('/my-assignments'),
  stats: (courseId: number) =>
    apiFetch<AssignmentStatsEntry[]>(`/courses/${courseId}/assignments/stats`),
  importQuiz: (
    courseId: number,
    opts: {
      file: File;
      due_date: string;
      title?: string;
      description?: string;
      max_marks?: number;
    },
  ) => {
    const fd = new FormData();
    fd.set('file', opts.file);
    fd.set('due_date', opts.due_date);
    if (opts.title) fd.set('title', opts.title);
    if (opts.description) fd.set('description', opts.description);
    if (opts.max_marks !== undefined)
      fd.set('max_marks', String(opts.max_marks));
    return apiUpload<Assignment>(
      `/courses/${courseId}/assignments/quiz/import`,
      fd,
    );
  },
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
  run: (
    problemId: number,
    body: { language_id: number; source_code: string; stdin?: string | null },
  ) =>
    apiFetch<JudgeRunResult>(`/judge/problems/${problemId}/run`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  submit: (
    problemId: number,
    body: { language_id: number; source_code: string; stdin?: string | null },
  ) =>
    apiFetch<JudgeSubmitResult>(`/judge/problems/${problemId}/submit`, {
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

export type CalendarEventType = 'assignment' | 'quiz';
export type CalendarEventStatus =
  | 'pending'
  | 'submitted'
  | 'graded'
  | 'overdue';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  course_id: number;
  course_title: string;
  due_date: string;
  status: CalendarEventStatus;
}

export const calendar = {
  list: (from: string, to: string) =>
    apiFetch<CalendarEvent[]>(`/calendar?from=${from}&to=${to}`),
};

export interface CalendarCustomEvent {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  event_date: string;
  reminder_minutes: number | null;
  reminder_sent: boolean;
  created_at: string;
}

export const calendarEvents = {
  list: (from: string, to: string) =>
    apiFetch<CalendarCustomEvent[]>(`/calendar/events?from=${from}&to=${to}`),
  create: (body: {
    title: string;
    description?: string | null;
    event_date: string;
    reminder_minutes?: number | null;
  }) =>
    apiFetch<CalendarCustomEvent>('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: number,
    body: Partial<{
      title: string;
      description: string | null;
      event_date: string;
      reminder_minutes: number | null;
    }>,
  ) =>
    apiFetch<CalendarCustomEvent>(`/calendar/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    apiFetch<void>(`/calendar/events/${id}`, { method: 'DELETE' }),
};

export type CodingLanguage = 'python' | 'c' | 'cpp' | 'java' | 'javascript';
export type CodingScoringMode = 'all_or_nothing' | 'partial';
export type CodingDifficulty = 'easy' | 'medium' | 'hard';
export type CodingSubmissionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error';

export interface CodingTestCaseInput {
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  weight?: number;
  order_index?: number;
}

export interface CodingTestCaseFaculty {
  id: number;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
  order_index: number;
}

export interface CodingTestCaseStudent {
  id: number;
  input: string | null;
  expected_output: string | null;
  is_hidden: boolean;
  order_index: number;
}

export interface CodingAssessmentBrief {
  id: number;
  course_id: number | null;
  course_title: string | null;
  title: string;
  allowed_languages: CodingLanguage[];
  max_score: number;
  scoring_mode: CodingScoringMode;
  due_date: string | null;
  max_attempts: number;
  is_practice: boolean;
  points: number;
  difficulty: CodingDifficulty | null;
  created_at: string;
  attempts_used: number | null;
  best_score: number | null;
  solved: boolean | null;
}

export interface CodingAssessment {
  id: number;
  course_id: number | null;
  created_by: number | null;
  title: string;
  description: string;
  allowed_languages: CodingLanguage[];
  time_limit_seconds: number;
  memory_limit_mb: number;
  max_score: number;
  scoring_mode: CodingScoringMode;
  due_date: string | null;
  max_attempts: number;
  is_practice: boolean;
  points: number;
  difficulty: CodingDifficulty | null;
  created_at: string;
  updated_at: string;
  test_cases_faculty: CodingTestCaseFaculty[] | null;
  test_cases_student: CodingTestCaseStudent[] | null;
}

export interface CodingTestCaseResult {
  test_case_id: number;
  passed: boolean;
  stdout?: string | null;
  stderr?: string | null;
  time_ms?: number | null;
  memory_kb?: number | null;
  weight?: number;
  is_hidden: boolean;
}

export interface CodingSubmission {
  id: number;
  assessment_id: number;
  student_id: number;
  student_name: string | null;
  language: CodingLanguage;
  source_code: string;
  score: number;
  status: CodingSubmissionStatus;
  test_case_results: CodingTestCaseResult[] | null;
  submitted_at: string;
}

export interface CodingAssessmentCreatePayload {
  course_id?: number | null;
  title: string;
  description: string;
  allowed_languages: CodingLanguage[];
  time_limit_seconds?: number;
  memory_limit_mb?: number;
  max_score?: number;
  scoring_mode?: CodingScoringMode;
  due_date?: string | null;
  max_attempts?: number;
  is_practice?: boolean;
  points?: number;
  difficulty?: CodingDifficulty | null;
  test_cases: CodingTestCaseInput[];
}

export interface PracticeStats {
  total_points: number;
  solved_count: number;
}

export interface CodingRunResult {
  test_case_results: CodingTestCaseResult[];
  passed: number;
  total: number;
}

export interface JudgeTestCaseResult {
  index: number;
  is_hidden: boolean;
  status: JudgeVerdict;
  passed: boolean;
  stdin: string | null;
  expected_output: string | null;
  actual_output: string | null;
  stderr: string | null;
  time_ms: number | null;
  memory_kb: number | null;
}

export interface JudgeRunResult {
  status: JudgeVerdict;
  stdout: string | null;
  stderr: string | null;
  time_ms: number | null;
  memory_kb: number | null;
  passed: number;
  total: number;
  test_cases: JudgeTestCaseResult[];
}

export interface JudgeSubmitResult {
  submission_id: number;
  status: JudgeVerdict;
  passed: number;
  total: number;
  time_ms: number | null;
  memory_kb: number | null;
  stdout: string | null;
  stderr: string | null;
  submitted_at: string;
  test_cases: JudgeTestCaseResult[];
}

export const coding = {
  listForCourse: (courseId: number) =>
    apiFetch<CodingAssessmentBrief[]>(
      `/coding-assessments/course/${courseId}`,
    ),
  listPractice: (opts?: { difficulty?: CodingDifficulty; language?: CodingLanguage }) => {
    const params = new URLSearchParams();
    if (opts?.difficulty) params.set('difficulty', opts.difficulty);
    if (opts?.language) params.set('language', opts.language);
    const qs = params.toString();
    return apiFetch<CodingAssessmentBrief[]>(
      `/coding-assessments/practice${qs ? `?${qs}` : ''}`,
    );
  },
  listMine: (opts?: { isPractice?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.isPractice !== undefined)
      params.set('is_practice', String(opts.isPractice));
    const qs = params.toString();
    return apiFetch<CodingAssessmentBrief[]>(
      `/coding-assessments/mine${qs ? `?${qs}` : ''}`,
    );
  },
  get: (id: number) =>
    apiFetch<CodingAssessment>(`/coding-assessments/${id}`),
  create: (body: CodingAssessmentCreatePayload) =>
    apiFetch<CodingAssessment>('/coding-assessments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number, body: Partial<CodingAssessmentCreatePayload>) =>
    apiFetch<CodingAssessment>(`/coding-assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: number) =>
    apiFetch<{ detail: string }>(`/coding-assessments/${id}`, {
      method: 'DELETE',
    }),
  run: (id: number, body: { language: CodingLanguage; source_code: string }) =>
    apiFetch<CodingRunResult>(`/coding-assessments/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  submit: (id: number, body: { language: CodingLanguage; source_code: string }) =>
    apiFetch<CodingSubmission>(`/coding-assessments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  mySubmissions: (id: number) =>
    apiFetch<CodingSubmission[]>(
      `/coding-assessments/${id}/submissions/me`,
    ),
  allSubmissions: (id: number) =>
    apiFetch<CodingSubmission[]>(`/coding-assessments/${id}/submissions`),
  leaderboard: (id: number) =>
    apiFetch<CodingLeaderboardEntry[]>(`/coding-assessments/${id}/leaderboard`),
  practiceStats: () =>
    apiFetch<PracticeStats>('/coding-assessments/practice/stats'),
};

const CODING_LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  javascript: 'JavaScript',
};

const CODING_LANGUAGE_MONACO: Record<CodingLanguage, string> = {
  python: 'python',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  javascript: 'javascript',
};

export function codingLanguageLabel(l: CodingLanguage): string {
  return CODING_LANGUAGE_LABELS[l];
}

export function codingLanguageMonaco(l: CodingLanguage): string {
  return CODING_LANGUAGE_MONACO[l];
}

export const quiz = {
  listQuestions: (assignmentId: number) =>
    apiFetch<QuizQuestionFaculty[]>(
      `/assignments/${assignmentId}/quiz/questions`,
    ),
  createQuestion: (assignmentId: number, body: QuizQuestionCreatePayload) =>
    apiFetch<QuizQuestionFaculty>(
      `/assignments/${assignmentId}/quiz/questions`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  updateQuestion: (
    assignmentId: number,
    questionId: number,
    body: Partial<QuizQuestionCreatePayload>,
  ) =>
    apiFetch<QuizQuestionFaculty>(
      `/assignments/${assignmentId}/quiz/questions/${questionId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  deleteQuestion: (assignmentId: number, questionId: number) =>
    apiFetch<{ detail: string }>(
      `/assignments/${assignmentId}/quiz/questions/${questionId}`,
      { method: 'DELETE' },
    ),
  startAttempt: (assignmentId: number) =>
    apiFetch<QuizAttemptStart>(
      `/assignments/${assignmentId}/quiz/attempt`,
      { method: 'POST', body: JSON.stringify({}) },
    ),
  submitAttempt: (
    assignmentId: number,
    attemptId: number,
    answers: QuizAnswerInPayload[],
  ) =>
    apiFetch<QuizAttemptResult>(
      `/assignments/${assignmentId}/quiz/attempt/${attemptId}/submit`,
      { method: 'POST', body: JSON.stringify({ answers }) },
    ),
  listAttempts: (assignmentId: number) =>
    apiFetch<QuizAttemptSummary[]>(
      `/assignments/${assignmentId}/quiz/attempts`,
    ),
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

export const profile = {
  me: () => apiFetch<UserProfile>('/profile/me'),
  get: (userId: number) => apiFetch<UserProfile>(`/profile/${userId}`),
  update: (body: UserProfileUpdate) =>
    apiFetch<UserProfile>('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return apiUpload<UserProfile>('/profile/me/avatar', fd);
  },
  uploadCover: (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return apiUpload<UserProfile>('/profile/me/cover', fd);
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
};

