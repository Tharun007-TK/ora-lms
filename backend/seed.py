"""Seed the Ora LMS database with a realistic demo dataset.

Idempotent — safe to re-run. Keys off email/code uniqueness so existing rows
are left alone and any missing rows are added.

Usage:
    cd backend
    python seed.py
"""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from core.auth import hash_password
from core.database import SessionLocal
from models.tables import (
    Assignment,
    CodingTestcase,
    CollegeInfo,
    Course,
    Department,
    Enrollment,
    FacultyProfile,
    JudgeProblem,
    LibraryBook,
    Note,
    Notification,
    ProblemDifficulty,
    User,
    UserRole,
)


DEFAULT_PASSWORD = "Ora@MCET2026"


DEPARTMENTS = [
    {
        "code": "CSE",
        "name": "Computer Science and Engineering",
        "description": (
            "Flagship department offering B.E./M.E. in CSE with electives in "
            "AI/ML, distributed systems, and cybersecurity."
        ),
    },
    {
        "code": "ECE",
        "name": "Electronics and Communication Engineering",
        "description": (
            "Department for analog/digital electronics, VLSI, signal "
            "processing, and wireless communication."
        ),
    },
    {
        "code": "MECH",
        "name": "Mechanical Engineering",
        "description": (
            "Thermal, design, and manufacturing tracks with a strong "
            "industry-integrated curriculum."
        ),
    },
]


FACULTY = [
    {
        "email": "r.arun@mcet.in",
        "name": "Dr. R. Arunachalam",
        "dept": "CSE",
        "designation": "Professor & Head",
        "qualifications": "Ph.D. Computer Science (Anna University)",
        "achievements": "30+ journal papers on distributed systems; DST-funded "
        "research grant on scalable academic analytics.",
    },
    {
        "email": "p.meena@mcet.in",
        "name": "Dr. P. Meenakshi",
        "dept": "CSE",
        "designation": "Associate Professor",
        "qualifications": "Ph.D. Data Mining (Bharathiar University)",
        "achievements": "Best Paper Award, IEEE ICCCI 2024; leads the Ora "
        "student mentoring cell.",
    },
    {
        "email": "k.senthil@mcet.in",
        "name": "Mr. K. Senthilkumar",
        "dept": "ECE",
        "designation": "Assistant Professor",
        "qualifications": "M.E. VLSI Design (PSG Tech)",
        "achievements": "Built the department's FPGA lab; NPTEL elite certified.",
    },
    {
        "email": "s.divya@mcet.in",
        "name": "Dr. S. Divya",
        "dept": "ECE",
        "designation": "Associate Professor",
        "qualifications": "Ph.D. Wireless Communication (Anna University)",
        "achievements": "Funded project on LoRa-based agri-sensing; 12 SCI papers.",
    },
    {
        "email": "v.raghu@mcet.in",
        "name": "Dr. V. Raghuraman",
        "dept": "MECH",
        "designation": "Professor",
        "qualifications": "Ph.D. Thermal Engineering (IIT Madras)",
        "achievements": "Consultant to Tamil Nadu MSME on energy efficiency; "
        "chairs the Institution of Engineers student chapter.",
    },
]


STUDENTS = [
    ("727622bam001@mcet.in", "Aarthi Balaji", "CSE"),
    ("727622bam002@mcet.in", "Bharath Kumar", "CSE"),
    ("727622bam003@mcet.in", "Chitra Devi", "CSE"),
    ("727622bam004@mcet.in", "Dinesh R", "CSE"),
    ("727622bam005@mcet.in", "Esakki P", "CSE"),
    ("727622bam006@mcet.in", "Fathima Noor", "ECE"),
    ("727622bam007@mcet.in", "Ganesh S", "ECE"),
    ("727622bam008@mcet.in", "Harish V", "ECE"),
    ("727622bam009@mcet.in", "Indhumathi K", "ECE"),
    ("727622bam010@mcet.in", "Jayashree M", "ECE"),
    ("727622bam011@mcet.in", "Karthik R", "MECH"),
    ("727622bam012@mcet.in", "Lavanya P", "MECH"),
    ("727622bam013@mcet.in", "Manoj Kumar", "MECH"),
    ("727622bam014@mcet.in", "Nithya S", "MECH"),
    ("727622bam015@mcet.in", "Oviya D", "MECH"),
    # The signed-in developer account from CLAUDE.md
    ("727622bam046@mcet.in", "Demo Student", "CSE"),
]


COURSES = [
    {
        "code": "CS3040",
        "title": "Design and Analysis of Algorithms",
        "description": "Asymptotic analysis, divide-and-conquer, dynamic "
        "programming, graph algorithms, and NP-completeness.",
        "department_code": "CSE",
        "faculty_email": "r.arun@mcet.in",
        "semester": "2026-Spring",
    },
    {
        "code": "EC3025",
        "title": "Digital Signal Processing",
        "description": "Discrete-time signals, DFT/FFT, digital filter design, "
        "and multirate systems with MATLAB labs.",
        "department_code": "ECE",
        "faculty_email": "s.divya@mcet.in",
        "semester": "2026-Spring",
    },
    {
        "code": "ME3060",
        "title": "Thermodynamics",
        "description": "Laws of thermodynamics, entropy, power cycles, and "
        "applied analysis of refrigeration and HVAC.",
        "department_code": "MECH",
        "faculty_email": "v.raghu@mcet.in",
        "semester": "2026-Spring",
    },
]


NOTES = [
    {
        "course_code": "CS3040",
        "title": "Chapter 1 — Asymptotic Notation",
        "content": (
            "## Asymptotic Notation\n\n"
            "- **Big-O (O)**: upper bound on growth rate.\n"
            "- **Big-Omega (Ω)**: lower bound on growth rate.\n"
            "- **Big-Theta (Θ)**: tight bound — both upper and lower.\n\n"
            "### Common classes\n"
            "O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n) < O(n!)."
        ),
        "ai_generated": False,
    },
    {
        "course_code": "CS3040",
        "title": "Chapter 2 — Divide & Conquer",
        "content": (
            "## Divide and Conquer\n\n"
            "1. **Divide** the problem into smaller subproblems.\n"
            "2. **Conquer** recursively.\n"
            "3. **Combine** the partial answers.\n\n"
            "### Master theorem\n"
            "For `T(n) = aT(n/b) + f(n)`, compare `f(n)` with `n^log_b(a)`."
        ),
        "ai_generated": True,
    },
    {
        "course_code": "EC3025",
        "title": "Lecture 1 — DFT Primer",
        "content": (
            "## Discrete Fourier Transform\n\n"
            "Given `x[n]` of length N, `X[k] = Σ x[n] e^(-j 2π k n / N)`.\n\n"
            "The FFT computes the DFT in O(N log N) by exploiting symmetry "
            "of the twiddle factors."
        ),
        "ai_generated": False,
    },
]


ASSIGNMENTS = [
    {
        "course_code": "CS3040",
        "title": "Problem Set 1 — Recurrences",
        "description": "Solve the recurrences from Chapter 2 (exercises 2.3).",
        "due_offset_days": 5,  # upcoming
        "max_marks": 50,
    },
    {
        "course_code": "EC3025",
        "title": "Lab 1 — FFT in MATLAB",
        "description": "Implement a 1024-point FFT and verify against the "
        "built-in `fft()` on a chirp signal.",
        "due_offset_days": -3,  # past due
        "max_marks": 100,
    },
]


LIBRARY_BOOKS = [
    {
        "title": "Introduction to Algorithms",
        "author": "Cormen, Leiserson, Rivest, Stein",
        "category": "Algorithms",
    },
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "category": "Software Engineering",
    },
    {
        "title": "Digital Signal Processing — Principles, Algorithms & Applications",
        "author": "Proakis & Manolakis",
        "category": "Signal Processing",
    },
    {
        "title": "Fundamentals of Engineering Thermodynamics",
        "author": "Moran, Shapiro, Boettner, Bailey",
        "category": "Thermodynamics",
    },
    {
        "title": "Deep Learning",
        "author": "Goodfellow, Bengio, Courville",
        "category": "Artificial Intelligence",
    },
]


COLLEGE_INFO = {
    "about": (
        "Dr. Mahalingam College of Engineering and Technology (MCET) is an "
        "autonomous engineering college located at Pollachi, Tamil Nadu. "
        "Founded in 1998 by the NIA Educational Institutions, MCET is "
        "affiliated to Anna University and NAAC-accredited with an 'A' grade."
    ),
    "vision": (
        "To be a centre of excellence in technical education and research, "
        "producing graduates who are globally competent and socially "
        "responsible."
    ),
    "mission": (
        "To provide value-based technical education, foster research and "
        "innovation, cultivate industry-ready engineers, and promote "
        "lifelong learning through an inclusive academic environment."
    ),
    "established_year": 1998,
}


JUDGE_PROBLEMS = [
    {
        "title": "Sum of Two Integers",
        "difficulty": ProblemDifficulty.easy,
        "description": (
            "Read two space-separated integers from stdin and print their "
            "sum."
        ),
        "examples": "Input:\n3 5\n\nOutput:\n8",
        "constraints": "-10^9 ≤ a, b ≤ 10^9",
        "testcases": [
            ("3 5\n", "8\n", False),
            ("-2 10\n", "8\n", False),
            ("1000000000 1000000000\n", "2000000000\n", True),
        ],
    },
    {
        "title": "Reverse a String",
        "difficulty": ProblemDifficulty.medium,
        "description": (
            "Read a single line from stdin and print it reversed."
        ),
        "examples": "Input:\nora\n\nOutput:\naro",
        "constraints": "1 ≤ |s| ≤ 10^5; s contains printable ASCII.",
        "testcases": [
            ("ora\n", "aro\n", False),
            ("MCET\n", "TECM\n", False),
            ("race car\n", "rac ecar\n", True),
        ],
    },
    {
        "title": "Balanced Parentheses",
        "difficulty": ProblemDifficulty.hard,
        "description": (
            "Given a string of `()[]{}` on stdin, print `YES` if it is "
            "balanced, else `NO`."
        ),
        "examples": "Input:\n({[]})\n\nOutput:\nYES",
        "constraints": "1 ≤ |s| ≤ 10^5.",
        "testcases": [
            ("({[]})\n", "YES\n", False),
            ("([)]\n", "NO\n", False),
            ("{{{}}}\n", "YES\n", True),
            ("((((\n", "NO\n", True),
        ],
    },
]


# --------------- Seed runners -----------------


async def _get_or_create_user(
    db, *, email: str, name: str, role: UserRole, department_id: int | None
) -> User:
    existing = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing:
        return existing
    user = User(
        email=email,
        password_hash=hash_password(DEFAULT_PASSWORD),
        role=role,
        name=name,
        department_id=department_id,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def _get_or_create_department(db, *, code: str, name: str, description: str) -> Department:
    existing = (
        await db.execute(select(Department).where(Department.code == code))
    ).scalar_one_or_none()
    if existing:
        return existing
    dept = Department(code=code, name=name, description=description)
    db.add(dept)
    await db.flush()
    return dept


async def seed() -> None:
    random.seed(42)
    now = datetime.now(timezone.utc)

    async with SessionLocal() as db:
        # Admin
        admin = await _get_or_create_user(
            db,
            email="admin@mcet.ac.in",
            name="Ora Admin",
            role=UserRole.admin,
            department_id=None,
        )

        # Departments
        dept_map: dict[str, Department] = {}
        for d in DEPARTMENTS:
            dept_map[d["code"]] = await _get_or_create_department(
                db,
                code=d["code"],
                name=d["name"],
                description=d["description"],
            )

        # Faculty + profiles
        faculty_map: dict[str, User] = {}
        for f in FACULTY:
            dept = dept_map[f["dept"]]
            user = await _get_or_create_user(
                db,
                email=f["email"],
                name=f["name"],
                role=UserRole.faculty,
                department_id=dept.id,
            )
            faculty_map[f["email"]] = user

            profile_exists = (
                await db.execute(
                    select(FacultyProfile).where(FacultyProfile.user_id == user.id)
                )
            ).scalar_one_or_none()
            if not profile_exists:
                db.add(
                    FacultyProfile(
                        user_id=user.id,
                        designation=f["designation"],
                        qualifications=f["qualifications"],
                        achievements=f["achievements"],
                        department_id=dept.id,
                    )
                )

        # Students
        student_map: dict[str, User] = {}
        for email, name, dept_code in STUDENTS:
            student_map[email] = await _get_or_create_user(
                db,
                email=email,
                name=name,
                role=UserRole.student,
                department_id=dept_map[dept_code].id,
            )

        # College info (single row)
        info = (
            await db.execute(select(CollegeInfo).order_by(CollegeInfo.id.asc()).limit(1))
        ).scalar_one_or_none()
        if info is None:
            db.add(CollegeInfo(**COLLEGE_INFO))

        # Courses
        course_map: dict[str, Course] = {}
        for c in COURSES:
            existing = (
                await db.execute(select(Course).where(Course.code == c["code"]))
            ).scalar_one_or_none()
            if existing:
                course_map[c["code"]] = existing
                continue
            course = Course(
                code=c["code"],
                title=c["title"],
                description=c["description"],
                department_id=dept_map[c["department_code"]].id,
                faculty_id=faculty_map[c["faculty_email"]].id,
                semester=c["semester"],
            )
            db.add(course)
            await db.flush()
            course_map[c["code"]] = course

        # Enrollments: every student enrolled in every course for demo.
        for course in course_map.values():
            for student in student_map.values():
                exists = (
                    await db.execute(
                        select(Enrollment.id).where(
                            Enrollment.course_id == course.id,
                            Enrollment.student_id == student.id,
                        )
                    )
                ).scalar_one_or_none()
                if not exists:
                    db.add(
                        Enrollment(
                            course_id=course.id,
                            student_id=student.id,
                        )
                    )

        # Notes
        for n in NOTES:
            course = course_map[n["course_code"]]
            exists = (
                await db.execute(
                    select(Note.id).where(
                        Note.course_id == course.id, Note.title == n["title"]
                    )
                )
            ).scalar_one_or_none()
            if not exists:
                db.add(
                    Note(
                        course_id=course.id,
                        title=n["title"],
                        content=n["content"],
                        ai_generated=n["ai_generated"],
                        created_by=course.faculty_id,
                    )
                )

        # Assignments
        for a in ASSIGNMENTS:
            course = course_map[a["course_code"]]
            exists = (
                await db.execute(
                    select(Assignment.id).where(
                        Assignment.course_id == course.id,
                        Assignment.title == a["title"],
                    )
                )
            ).scalar_one_or_none()
            if not exists:
                db.add(
                    Assignment(
                        course_id=course.id,
                        title=a["title"],
                        description=a["description"],
                        due_date=now + timedelta(days=a["due_offset_days"]),
                        max_marks=a["max_marks"],
                        created_by=course.faculty_id,
                    )
                )

        # Library books
        for b in LIBRARY_BOOKS:
            exists = (
                await db.execute(
                    select(LibraryBook.id).where(
                        LibraryBook.title == b["title"],
                        LibraryBook.author == b["author"],
                    )
                )
            ).scalar_one_or_none()
            if not exists:
                db.add(
                    LibraryBook(
                        title=b["title"],
                        author=b["author"],
                        category=b["category"],
                        uploaded_by=admin.id,
                    )
                )

        # Judge problems + testcases
        for p in JUDGE_PROBLEMS:
            existing = (
                await db.execute(
                    select(JudgeProblem).where(JudgeProblem.title == p["title"])
                )
            ).scalar_one_or_none()
            if existing:
                continue
            problem = JudgeProblem(
                title=p["title"],
                description=p["description"],
                difficulty=p["difficulty"],
                examples=p["examples"],
                constraints=p["constraints"],
                created_by=admin.id,
            )
            db.add(problem)
            await db.flush()
            for (stdin, expected, hidden) in p["testcases"]:
                db.add(
                    CodingTestcase(
                        problem_id=problem.id,
                        input=stdin,
                        expected_output=expected,
                        is_hidden=hidden,
                    )
                )

        # Notifications — 10 across the demo accounts, skip users who already
        # have seeded notifications (idempotency).
        notif_seeds: list[tuple[User, str, str]] = []
        students = list(student_map.values())
        assignment_msg = (
            "New assignment: Problem Set 1 — Recurrences",
            "Due in 5 days · max 50 marks",
        )
        graded_msg = (
            "Graded: Lab 1 — FFT in MATLAB",
            "You scored 88/100 · Clear solution; improve plot titles.",
        )
        note_msg = (
            "New note: Chapter 2 — Divide & Conquer",
            "Posted in Design and Analysis of Algorithms",
        )
        verdict_msg = (
            "Code judge — AC",
            "Your submission for “Sum of Two Integers” returned AC.",
        )

        picks = random.sample(students, k=min(10, len(students)))
        for i, student in enumerate(picks):
            if i % 4 == 0:
                title, body = assignment_msg
            elif i % 4 == 1:
                title, body = graded_msg
            elif i % 4 == 2:
                title, body = note_msg
            else:
                title, body = verdict_msg
            notif_seeds.append((student, title, body))

        for student, title, body in notif_seeds:
            already = (
                await db.execute(
                    select(Notification.id).where(
                        Notification.user_id == student.id,
                        Notification.title == title,
                    )
                )
            ).scalar_one_or_none()
            if not already:
                db.add(
                    Notification(
                        user_id=student.id,
                        title=title,
                        body=body,
                        read=False,
                    )
                )

        await db.commit()

    print("Seed complete.")
    print(f"  Admin:   admin@mcet.ac.in  /  {DEFAULT_PASSWORD}")
    print(f"  Faculty: r.arun@mcet.in    /  {DEFAULT_PASSWORD}  (and 4 more)")
    print(f"  Student: 727622bam046@mcet.in  /  {DEFAULT_PASSWORD}  (and 15 more)")


if __name__ == "__main__":
    asyncio.run(seed())
