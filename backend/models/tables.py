from __future__ import annotations

import enum
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class ProblemDifficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


# ---------- Core entities ----------


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)

    users: Mapped[list["User"]] = relationship(back_populates="department")
    courses: Mapped[list["Course"]] = relationship(back_populates="department")
    faculty_profiles: Mapped[list["FacultyProfile"]] = relationship(back_populates="department")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    department: Mapped[Department | None] = relationship(back_populates="users")
    faculty_profile: Mapped["FacultyProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    taught_courses: Mapped[list["Course"]] = relationship(
        back_populates="faculty", foreign_keys="Course.faculty_id"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship(back_populates="student")
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    faculty_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    semester: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    department: Mapped[Department | None] = relationship(back_populates="courses")
    faculty: Mapped[User | None] = relationship(
        back_populates="taught_courses", foreign_keys=[faculty_id]
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_enrollment_student_course"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped[User] = relationship(back_populates="enrollments")
    course: Mapped[Course] = relationship(back_populates="enrollments")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(String(1024))
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    course: Mapped[Course] = relationship(back_populates="notes")
    embeddings: Mapped[list["NoteEmbedding"]] = relationship(
        back_populates="note", cascade="all, delete-orphan"
    )


class NoteEmbedding(Base):
    __tablename__ = "note_embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    note: Mapped[Note] = relationship(back_populates="embeddings")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    course: Mapped[Course] = relationship(back_populates="assignments")
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan"
    )


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_submission_assign_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_url: Mapped[str | None] = mapped_column(String(1024))
    marks: Mapped[int | None] = mapped_column(Integer)
    feedback: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assignment: Mapped[Assignment] = relationship(back_populates="submissions")
    student: Mapped[User] = relationship(back_populates="submissions")


class LibraryBook(Base):
    __tablename__ = "library_books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    file_url: Mapped[str | None] = mapped_column(String(1024))
    cover_url: Mapped[str | None] = mapped_column(String(1024))
    uploaded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped[User] = relationship(back_populates="notifications")


class CollegeInfo(Base):
    __tablename__ = "college_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    about: Mapped[str | None] = mapped_column(Text)
    vision: Mapped[str | None] = mapped_column(Text)
    mission: Mapped[str | None] = mapped_column(Text)
    established_year: Mapped[int | None] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    designation: Mapped[str | None] = mapped_column(String(200))
    qualifications: Mapped[str | None] = mapped_column(Text)
    achievements: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(1024))
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )

    user: Mapped[User] = relationship(back_populates="faculty_profile")
    department: Mapped[Department | None] = relationship(back_populates="faculty_profiles")


# ---------- Judge ----------


class JudgeProblem(Base):
    __tablename__ = "judge_problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[ProblemDifficulty] = mapped_column(
        SAEnum(ProblemDifficulty, name="problem_difficulty"), nullable=False, index=True
    )
    examples: Mapped[str | None] = mapped_column(Text)
    constraints: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    testcases: Mapped[list["CodingTestcase"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["JudgeSubmission"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )


class JudgeSubmission(Base):
    __tablename__ = "judge_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    problem_id: Mapped[int] = mapped_column(
        ForeignKey("judge_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language_id: Mapped[int] = mapped_column(Integer, nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Pending")
    stdout: Mapped[str | None] = mapped_column(Text)
    stderr: Mapped[str | None] = mapped_column(Text)
    time_ms: Mapped[int | None] = mapped_column(Integer)
    memory_kb: Mapped[int | None] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    problem: Mapped[JudgeProblem] = relationship(back_populates="submissions")


class CodingTestcase(Base):
    __tablename__ = "coding_testcases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    problem_id: Mapped[int] = mapped_column(
        ForeignKey("judge_problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    problem: Mapped[JudgeProblem] = relationship(back_populates="testcases")


__all__ = [
    "UserRole",
    "ProblemDifficulty",
    "Department",
    "User",
    "Course",
    "Enrollment",
    "Note",
    "NoteEmbedding",
    "Assignment",
    "Submission",
    "LibraryBook",
    "Notification",
    "CollegeInfo",
    "FacultyProfile",
    "JudgeProblem",
    "JudgeSubmission",
    "CodingTestcase",
]
