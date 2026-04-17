from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models.tables import ProblemDifficulty, UserRole


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
    submitted: bool | None = None
    submission_id: int | None = None
    marks: int | None = None


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
