from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from models.tables import (
    AssignmentType,
    CodingDifficulty,
    CodingScoringMode,
    CodingSubmissionStatus,
    ProblemDifficulty,
    UserRole,
)


# Day 10 — institutional email domain policy.
STUDENT_EMAIL_DOMAIN = "mcet.in"
STAFF_EMAIL_DOMAIN = "drmcet.ac.in"


def validate_role_email(email: str, role: UserRole) -> str:
    """Return the lowercased email if it matches the role-domain rule.

    Students must use @mcet.in; faculty and admin must use @drmcet.ac.in.
    Raises ValueError on mismatch.
    """
    normalized = email.strip().lower()
    _, _, domain = normalized.rpartition("@")
    if role == UserRole.student:
        if domain != STUDENT_EMAIL_DOMAIN:
            raise ValueError(
                f"Student accounts must use an @{STUDENT_EMAIL_DOMAIN} email"
            )
    else:  # faculty or admin
        if domain != STAFF_EMAIL_DOMAIN:
            raise ValueError(
                f"{role.value.capitalize()} accounts must use an "
                f"@{STAFF_EMAIL_DOMAIN} email"
            )
    return normalized


# ---------- Auth ----------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=200)
    role: UserRole = UserRole.student
    department_id: int | None = None

    @model_validator(mode="after")
    def _enforce_email_role_domain(self) -> "RegisterRequest":
        self.email = validate_role_email(self.email, self.role)
        return self


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    role: UserRole
    department_id: int | None = None
    is_active: bool
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole


class AuthResponse(BaseModel):
    user: UserOut


class MessageResponse(BaseModel):
    detail: str


# ---------- Courses ----------


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=40)
    description: str | None = None
    department_id: int | None = None
    faculty_id: int | None = None
    semester: str | None = Field(default=None, max_length=40)


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    department_id: int | None = None
    faculty_id: int | None = None
    semester: str | None = Field(default=None, max_length=40)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    code: str
    description: str | None = None
    department_id: int | None = None
    faculty_id: int | None = None
    faculty_name: str | None = None
    semester: str | None = None
    created_at: datetime
    enrolled: bool | None = None
    enrollment_count: int | None = None


class EnrollRequest(BaseModel):
    student_id: int | None = None  # admin/faculty path; self-enroll uses current user


# ---------- Notes ----------


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    content: str | None = None
    file_url: str | None = None
    ai_generated: bool
    created_by: int | None = None
    created_at: datetime


# ---------- Assignments ----------


class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime
    max_marks: int = Field(default=100, ge=1, le=1000)
    type: AssignmentType = AssignmentType.file


class AssignmentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime | None = None
    max_marks: int | None = Field(default=None, ge=1, le=1000)


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: str | None = None
    due_date: datetime
    max_marks: int
    created_by: int | None = None
    created_at: datetime
    type: AssignmentType = AssignmentType.file
    submitted: bool | None = None
    submission_id: int | None = None
    marks: int | None = None
    attempt_id: int | None = None
    score: int | None = None
    max_score: int | None = None


# ---------- Submissions ----------


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    student_id: int
    student_name: str | None = None
    file_url: str | None = None
    marks: int | None = None
    feedback: str | None = None
    submitted_at: datetime
    graded_at: datetime | None = None


class GradeSubmissionRequest(BaseModel):
    marks: int = Field(ge=0, le=1000)
    feedback: str | None = None


# ---------- Library ----------


class LibraryBookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    category: str | None = None
    file_url: str | None = None
    cover_url: str | None = None
    uploaded_by: int | None = None
    created_at: datetime


class LibraryBookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    author: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)


# ---------- College ----------


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=20)
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    description: str | None = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None = None


class CollegeInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    about: str | None = None
    vision: str | None = None
    mission: str | None = None
    established_year: int | None = None
    updated_at: datetime


class CollegeInfoUpdate(BaseModel):
    about: str | None = None
    vision: str | None = None
    mission: str | None = None
    established_year: int | None = None


class FacultyProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: EmailStr
    department_id: int | None = None
    department_name: str | None = None
    designation: str | None = None
    qualifications: str | None = None
    achievements: str | None = None
    photo_url: str | None = None


class FacultyProfileUpdate(BaseModel):
    designation: str | None = Field(default=None, max_length=200)
    qualifications: str | None = None
    achievements: str | None = None
    department_id: int | None = None


# ---------- User Profiles (Day 9) ----------


class LinkItem(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    url: str = Field(min_length=1, max_length=500)


class UserProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: EmailStr
    role: UserRole
    department_id: int | None = None
    department_name: str | None = None
    avatar_url: str | None = None
    cover_url: str | None = None
    bio: str | None = None
    headline: str | None = None
    links: list[LinkItem] = []
    skills: list[str] = []
    designation: str | None = None
    qualifications: str | None = None
    achievements: str | None = None
    is_public: bool = False
    updated_at: datetime | None = None


class UserProfileUpdate(BaseModel):
    bio: str | None = Field(default=None, max_length=500)
    headline: str | None = Field(default=None, max_length=120)
    links: list[LinkItem] | None = Field(default=None, max_length=20)
    skills: list[str] | None = Field(default=None, max_length=20)
    designation: str | None = Field(default=None, max_length=200)
    qualifications: str | None = None
    achievements: str | None = None
    is_public: bool | None = None


# ---------- Judge ----------


class CodingTestcaseIn(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class CodingTestcaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    input: str
    expected_output: str
    is_hidden: bool


class JudgeProblemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    difficulty: ProblemDifficulty
    examples: str | None = None
    constraints: str | None = None
    testcases: list[CodingTestcaseIn] = Field(min_length=1)


class JudgeProblemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    difficulty: ProblemDifficulty | None = None
    examples: str | None = None
    constraints: str | None = None


class JudgeProblemBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    difficulty: ProblemDifficulty
    created_at: datetime
    solved: bool | None = None


class JudgeProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    difficulty: ProblemDifficulty
    examples: str | None = None
    constraints: str | None = None
    created_by: int | None = None
    created_at: datetime
    testcases: list[CodingTestcaseOut] = []


class JudgeSubmitRequest(BaseModel):
    language_id: int = Field(ge=1, le=200)
    source_code: str = Field(min_length=1)
    stdin: str | None = None  # optional custom stdin for "Run" button


class JudgeSubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_id: int
    student_id: int
    language_id: int
    source_code: str
    status: str
    stdout: str | None = None
    stderr: str | None = None
    time_ms: int | None = None
    memory_kb: int | None = None
    submitted_at: datetime


# ---------- Notifications ----------


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str | None = None
    read: bool
    created_at: datetime


# ---------- Quiz (Day 11) ----------


class QuizOptionIn(BaseModel):
    option_text: str = Field(min_length=1, max_length=500)
    is_correct: bool = False


class QuizOptionFacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    option_text: str
    is_correct: bool
    position: int


class QuizOptionStudentOut(BaseModel):
    """Options as seen by a student during attempt — no is_correct leak."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    option_text: str
    position: int


class QuizQuestionCreate(BaseModel):
    question_text: str = Field(min_length=1, max_length=2000)
    position: int = Field(default=0, ge=0, le=1000)
    points: int = Field(default=1, ge=1, le=100)
    options: list[QuizOptionIn] = Field(min_length=2, max_length=6)


class QuizQuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1, max_length=2000)
    position: int | None = Field(default=None, ge=0, le=1000)
    points: int | None = Field(default=None, ge=1, le=100)
    options: list[QuizOptionIn] | None = Field(default=None, min_length=2, max_length=6)


class QuizQuestionFacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    position: int
    points: int
    options: list[QuizOptionFacultyOut]


class QuizQuestionStudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    position: int
    points: int
    options: list[QuizOptionStudentOut]


class QuizAttemptStartOut(BaseModel):
    """Returned when student starts (or resumes) an attempt."""
    attempt_id: int
    assignment_id: int
    started_at: datetime
    submitted_at: datetime | None = None
    max_score: int
    questions: list[QuizQuestionStudentOut]


class QuizAnswerIn(BaseModel):
    question_id: int
    option_ids: list[int] = Field(min_length=0, max_length=6)


class QuizSubmitBody(BaseModel):
    answers: list[QuizAnswerIn]


class QuizAttemptAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    selected_option_ids: list[int]
    correct_option_ids: list[int]
    is_correct: bool
    points_earned: int
    points_max: int


class QuizAttemptResultOut(BaseModel):
    attempt_id: int
    assignment_id: int
    student_id: int
    score: int
    max_score: int
    submitted_at: datetime | None
    answers: list[QuizAttemptAnswerOut]


class QuizAttemptSummaryOut(BaseModel):
    """Faculty-facing summary per student attempt."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    student_id: int
    student_name: str | None = None
    started_at: datetime
    submitted_at: datetime | None = None
    score: int | None = None
    max_score: int | None = None


# ---------- Coding Assessments (UPDATE.md) ----------

ALLOWED_CODING_LANGUAGES = {"python", "c", "cpp", "java", "javascript"}


class CodingTestCaseIn(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False
    weight: int = Field(default=1, ge=1, le=100)
    order_index: int = Field(default=0, ge=0, le=1000)


class CodingTestCaseFacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    input: str
    expected_output: str
    is_hidden: bool
    weight: int
    order_index: int


class CodingTestCaseStudentOut(BaseModel):
    """Visible-only view. Hidden cases get a stub in the response."""
    id: int
    input: str | None = None
    expected_output: str | None = None
    is_hidden: bool
    order_index: int


class CodingAssessmentCreate(BaseModel):
    course_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    allowed_languages: list[str] = Field(min_length=1)
    time_limit_seconds: int = Field(default=2, ge=1, le=30)
    memory_limit_mb: int = Field(default=256, ge=32, le=1024)
    max_score: int = Field(default=100, ge=1, le=1000)
    scoring_mode: CodingScoringMode = CodingScoringMode.all_or_nothing
    due_date: datetime | None = None
    max_attempts: int = Field(default=3, ge=1, le=50)
    is_practice: bool = False
    points: int = Field(default=0, ge=0, le=1000)
    difficulty: CodingDifficulty | None = None
    test_cases: list[CodingTestCaseIn] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate(self) -> "CodingAssessmentCreate":
        bad = [l for l in self.allowed_languages if l not in ALLOWED_CODING_LANGUAGES]
        if bad:
            raise ValueError(
                f"Unsupported languages: {bad}. Allowed: "
                + ", ".join(sorted(ALLOWED_CODING_LANGUAGES))
            )
        if not any(not tc.is_hidden for tc in self.test_cases):
            raise ValueError("At least one visible (non-hidden) test case is required")
        if self.is_practice:
            if self.difficulty is None:
                raise ValueError("Practice problems require difficulty")
            if self.points <= 0:
                raise ValueError("Practice problems require points > 0")
        else:
            if self.course_id is None:
                raise ValueError("Graded coding assessments require a course_id")
        return self


class CodingAssessmentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    allowed_languages: list[str] | None = None
    time_limit_seconds: int | None = Field(default=None, ge=1, le=30)
    memory_limit_mb: int | None = Field(default=None, ge=32, le=1024)
    max_score: int | None = Field(default=None, ge=1, le=1000)
    scoring_mode: CodingScoringMode | None = None
    due_date: datetime | None = None
    max_attempts: int | None = Field(default=None, ge=1, le=50)
    difficulty: CodingDifficulty | None = None
    points: int | None = Field(default=None, ge=0, le=1000)


class CodingAssessmentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int | None = None
    course_title: str | None = None
    title: str
    allowed_languages: list[str]
    max_score: int
    scoring_mode: CodingScoringMode
    due_date: datetime | None = None
    max_attempts: int
    is_practice: bool
    points: int
    difficulty: CodingDifficulty | None = None
    created_at: datetime
    attempts_used: int | None = None
    best_score: int | None = None
    solved: bool | None = None


class CodingAssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int | None = None
    created_by: int | None = None
    title: str
    description: str
    allowed_languages: list[str]
    time_limit_seconds: int
    memory_limit_mb: int
    max_score: int
    scoring_mode: CodingScoringMode
    due_date: datetime | None = None
    max_attempts: int
    is_practice: bool
    points: int
    difficulty: CodingDifficulty | None = None
    created_at: datetime
    updated_at: datetime
    # Test cases differ by role — faculty gets full, student gets redacted.
    test_cases_faculty: list[CodingTestCaseFacultyOut] | None = None
    test_cases_student: list[CodingTestCaseStudentOut] | None = None


class CodingSubmitBody(BaseModel):
    language: str
    source_code: str = Field(min_length=1)


class CodingSubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    student_id: int
    student_name: str | None = None
    language: str
    source_code: str
    score: int
    status: CodingSubmissionStatus
    # Test case results redacted for students on hidden cases (input/stdout stripped).
    test_case_results: list | None = None
    submitted_at: datetime


class PracticeStats(BaseModel):
    total_points: int
    solved_count: int


class CodingRunResult(BaseModel):
    """Preliminary run — no persist, visible test cases only."""
    test_case_results: list
    passed: int
    total: int


class JudgeTestCaseResult(BaseModel):
    """Per-test-case Code Arena result for HackerRank-style UI."""
    index: int  # 0-based testcase order
    is_hidden: bool
    status: str  # AC/WA/TLE/RE/CE
    passed: bool
    stdin: str | None = None  # null for hidden
    expected_output: str | None = None  # null for hidden
    actual_output: str | None = None  # always shown so compile/runtime errors surface
    stderr: str | None = None
    time_ms: int | None = None
    memory_kb: int | None = None


class JudgeRunResult(BaseModel):
    """Preliminary run for Code Arena — visible cases only."""
    status: str  # aggregated AC if all pass, else first non-AC
    stdout: str | None = None
    stderr: str | None = None
    time_ms: int | None = None
    memory_kb: int | None = None
    passed: int
    total: int
    test_cases: list[JudgeTestCaseResult] = []


class JudgeSubmitResult(BaseModel):
    """Full submit result — persisted + per-testcase for UI."""
    submission_id: int
    status: str
    passed: int
    total: int
    time_ms: int | None = None
    memory_kb: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    submitted_at: datetime
    test_cases: list[JudgeTestCaseResult] = []
