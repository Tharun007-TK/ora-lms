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
    AssignmentType,
    CodingAssessment,
    CodingDifficulty,
    CodingScoringMode,
    CodingTestCase,
    CodingTestcase,
    CollegeInfo,
    Course,
    Department,
    Enrollment,
    JudgeProblem,
    LibraryBook,
    Note,
    Notification,
    ProblemDifficulty,
    QuizOption,
    QuizQuestion,
    User,
    UserProfile,
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
        "email": "r.arun@drmcet.ac.in",
        "name": "Dr. R. Arunachalam",
        "dept": "CSE",
        "designation": "Professor & Head",
        "qualifications": "Ph.D. Computer Science (Anna University)",
        "achievements": "30+ journal papers on distributed systems; DST-funded "
        "research grant on scalable academic analytics.",
    },
    {
        "email": "p.meena@drmcet.ac.in",
        "name": "Dr. P. Meenakshi",
        "dept": "CSE",
        "designation": "Associate Professor",
        "qualifications": "Ph.D. Data Mining (Bharathiar University)",
        "achievements": "Best Paper Award, IEEE ICCCI 2024; leads the Ora "
        "student mentoring cell.",
    },
    {
        "email": "k.senthil@drmcet.ac.in",
        "name": "Mr. K. Senthilkumar",
        "dept": "ECE",
        "designation": "Assistant Professor",
        "qualifications": "M.E. VLSI Design (PSG Tech)",
        "achievements": "Built the department's FPGA lab; NPTEL elite certified.",
    },
    {
        "email": "s.divya@drmcet.ac.in",
        "name": "Dr. S. Divya",
        "dept": "ECE",
        "designation": "Associate Professor",
        "qualifications": "Ph.D. Wireless Communication (Anna University)",
        "achievements": "Funded project on LoRa-based agri-sensing; 12 SCI papers.",
    },
    {
        "email": "v.raghu@drmcet.ac.in",
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
        "faculty_email": "r.arun@drmcet.ac.in",
        "semester": "2026-Spring",
    },
    {
        "code": "EC3025",
        "title": "Digital Signal Processing",
        "description": "Discrete-time signals, DFT/FFT, digital filter design, "
        "and multirate systems with MATLAB labs.",
        "department_code": "ECE",
        "faculty_email": "s.divya@drmcet.ac.in",
        "semester": "2026-Spring",
    },
    {
        "code": "ME3060",
        "title": "Thermodynamics",
        "description": "Laws of thermodynamics, entropy, power cycles, and "
        "applied analysis of refrigeration and HVAC.",
        "department_code": "MECH",
        "faculty_email": "v.raghu@drmcet.ac.in",
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


PRACTICE_PROBLEMS = [
    # --- Easy (10 pts each) ---
    {
        "title": "FizzBuzz",
        "difficulty": CodingDifficulty.easy,
        "points": 10,
        "description": (
            "Read an integer N from stdin. Print the numbers from 1 to N, "
            "one per line, with the following substitutions:\n"
            "- Multiples of 3 → `Fizz`\n"
            "- Multiples of 5 → `Buzz`\n"
            "- Multiples of both → `FizzBuzz`"
        ),
        "test_cases": [
            ("5\n", "1\n2\nFizz\n4\nBuzz\n", False),
            ("3\n", "1\n2\nFizz\n", False),
            ("1\n", "1\n", False),
            ("15\n", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n", True),
            ("30\n", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz\n", True),
            ("7\n", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n", True),
        ],
    },
    {
        "title": "Reverse a String",
        "difficulty": CodingDifficulty.easy,
        "points": 10,
        "description": (
            "Read a single line from stdin and print the reversed string. "
            "The input may contain spaces and printable ASCII characters."
        ),
        "test_cases": [
            ("hello\n", "olleh\n", False),
            ("Ora\n", "arO\n", False),
            ("racecar\n", "racecar\n", False),
            ("abc xyz\n", "zyx cba\n", True),
            ("a\n", "a\n", True),
            ("12345\n", "54321\n", True),
        ],
    },
    {
        "title": "Sum of Array",
        "difficulty": CodingDifficulty.easy,
        "points": 10,
        "description": (
            "First line: N (size of array). Second line: N space-separated integers. "
            "Print their sum."
        ),
        "test_cases": [
            ("3\n1 2 3\n", "6\n", False),
            ("1\n42\n", "42\n", False),
            ("5\n1 1 1 1 1\n", "5\n", False),
            ("4\n-1 -2 -3 -4\n", "-10\n", True),
            ("5\n10 20 30 40 50\n", "150\n", True),
            ("2\n1000000 2000000\n", "3000000\n", True),
        ],
    },
    # --- Medium (25 pts each) ---
    {
        "title": "Two Sum",
        "difficulty": CodingDifficulty.medium,
        "points": 25,
        "description": (
            "First line: N and target (space-separated). Second line: N integers. "
            "Print the 0-based indices i and j (i<j, space-separated) such that "
            "nums[i] + nums[j] == target. A valid pair is guaranteed to exist."
        ),
        "test_cases": [
            ("4 9\n2 7 11 15\n", "0 1\n", False),
            ("3 6\n3 2 4\n", "1 2\n", False),
            ("2 6\n3 3\n", "0 1\n", False),
            ("5 10\n1 2 3 4 6\n", "3 4\n", True),
            ("4 0\n-3 4 3 90\n", "0 2\n", True),
            ("6 8\n1 5 3 7 2 6\n", "2 3\n", True),
        ],
    },
    {
        "title": "Valid Parentheses",
        "difficulty": CodingDifficulty.medium,
        "points": 25,
        "description": (
            "Read a string of `()[]{}` characters from stdin. Print `YES` if "
            "they're balanced and properly nested, else `NO`."
        ),
        "test_cases": [
            ("()\n", "YES\n", False),
            ("()[]{}\n", "YES\n", False),
            ("(]\n", "NO\n", False),
            ("({[]})\n", "YES\n", True),
            ("([)]\n", "NO\n", True),
            ("{{{{\n", "NO\n", True),
        ],
    },
    {
        "title": "Binary Search",
        "difficulty": CodingDifficulty.medium,
        "points": 25,
        "description": (
            "First line: N and target. Second line: N sorted integers. "
            "Print the 0-based index of `target` using binary search, or -1 if absent."
        ),
        "test_cases": [
            ("5 3\n1 2 3 4 5\n", "2\n", False),
            ("4 10\n1 3 5 7\n", "-1\n", False),
            ("1 5\n5\n", "0\n", False),
            ("6 6\n1 2 3 4 5 6\n", "5\n", True),
            ("7 4\n1 2 3 4 5 6 7\n", "3\n", True),
            ("3 -1\n-5 -3 -1\n", "2\n", True),
        ],
    },
    # --- Hard (50 pts each) ---
    {
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": CodingDifficulty.hard,
        "points": 50,
        "description": (
            "Read a single string from stdin. Print the length of the longest "
            "substring with no repeating characters."
        ),
        "test_cases": [
            ("abcabcbb\n", "3\n", False),
            ("bbbbb\n", "1\n", False),
            ("pwwkew\n", "3\n", False),
            ("abcdef\n", "6\n", True),
            ("dvdf\n", "3\n", True),
            ("\n", "0\n", True),
        ],
    },
    {
        "title": "Merge Intervals",
        "difficulty": CodingDifficulty.hard,
        "points": 50,
        "description": (
            "First line: N. Next N lines: `start end` for each interval. "
            "Print merged non-overlapping intervals, one per line, sorted by start."
        ),
        "test_cases": [
            ("4\n1 3\n2 6\n8 10\n15 18\n", "1 6\n8 10\n15 18\n", False),
            ("2\n1 4\n4 5\n", "1 5\n", False),
            ("1\n5 7\n", "5 7\n", False),
            ("3\n1 4\n0 4\n2 3\n", "0 4\n", True),
            ("3\n1 10\n2 3\n4 5\n", "1 10\n", True),
            ("4\n1 2\n3 4\n5 6\n7 8\n", "1 2\n3 4\n5 6\n7 8\n", True),
        ],
    },
]


QUIZ_ASSIGNMENT = {
    "course_code": "CS3040",
    "title": "Quiz 1 — DAA Fundamentals",
    "description": "Short MCQ quiz on asymptotic notation and divide-and-conquer. "
    "Auto-graded. One attempt.",
    "due_offset_days": 10,
    "max_marks": 10,
    "questions": [
        {
            "question_text": "Which of the following describes Big-O notation?",
            "points": 3,
            "options": [
                ("Tight asymptotic bound", False),
                ("Asymptotic upper bound", True),
                ("Asymptotic lower bound", False),
                ("Average-case bound", False),
            ],
        },
        {
            "question_text": (
                "Select ALL algorithms that use the divide-and-conquer paradigm."
            ),
            "points": 4,
            "options": [
                ("Merge sort", True),
                ("Quick sort", True),
                ("Bubble sort", False),
                ("Binary search", True),
                ("Linear search", False),
            ],
        },
        {
            "question_text": (
                "Which complexity classes grow *strictly faster* than O(n log n)?"
            ),
            "points": 3,
            "options": [
                ("O(n)", False),
                ("O(n^2)", True),
                ("O(2^n)", True),
                ("O(log n)", False),
            ],
        },
    ],
}


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
            email="admin@drmcet.ac.in",
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

        # Faculty (profile rows handled in unified block below)
        faculty_map: dict[str, User] = {}
        faculty_extra: dict[int, dict] = {}
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
            faculty_extra[user.id] = {
                "designation": f["designation"],
                "qualifications": f["qualifications"],
                "achievements": f["achievements"],
            }

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

        # User profiles — 1:1 with users (Day 9). Faculty get the rich faculty
        # fields + is_public=True; everyone else gets a minimal row.
        all_users: list[User] = [admin, *faculty_map.values(), *student_map.values()]
        for u in all_users:
            existing = (
                await db.execute(
                    select(UserProfile).where(UserProfile.user_id == u.id)
                )
            ).scalar_one_or_none()
            if existing is not None:
                continue
            extra = faculty_extra.get(u.id, {})
            db.add(
                UserProfile(
                    user_id=u.id,
                    links=[],
                    skills=[],
                    designation=extra.get("designation"),
                    qualifications=extra.get("qualifications"),
                    achievements=extra.get("achievements"),
                    is_public=(u.role == UserRole.faculty),
                )
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

        # Quiz assignment (Day 11)
        q_course = course_map[QUIZ_ASSIGNMENT["course_code"]]
        existing_quiz = (
            await db.execute(
                select(Assignment).where(
                    Assignment.course_id == q_course.id,
                    Assignment.title == QUIZ_ASSIGNMENT["title"],
                )
            )
        ).scalar_one_or_none()
        if existing_quiz is None:
            quiz_a = Assignment(
                course_id=q_course.id,
                title=QUIZ_ASSIGNMENT["title"],
                description=QUIZ_ASSIGNMENT["description"],
                due_date=now + timedelta(days=QUIZ_ASSIGNMENT["due_offset_days"]),
                max_marks=QUIZ_ASSIGNMENT["max_marks"],
                created_by=q_course.faculty_id,
                type=AssignmentType.quiz,
            )
            db.add(quiz_a)
            await db.flush()
            for q_idx, q in enumerate(QUIZ_ASSIGNMENT["questions"]):
                question = QuizQuestion(
                    assignment_id=quiz_a.id,
                    question_text=q["question_text"],
                    position=q_idx,
                    points=q["points"],
                )
                db.add(question)
                await db.flush()
                for o_idx, (text, is_correct) in enumerate(q["options"]):
                    db.add(
                        QuizOption(
                            question_id=question.id,
                            option_text=text,
                            is_correct=is_correct,
                            position=o_idx,
                        )
                    )

        # Practice problems (Day 14 UPDATE.md) — coding_assessments with is_practice=True.
        for prob in PRACTICE_PROBLEMS:
            existing = (
                await db.execute(
                    select(CodingAssessment).where(
                        CodingAssessment.title == prob["title"],
                        CodingAssessment.is_practice.is_(True),
                    )
                )
            ).scalar_one_or_none()
            if existing is not None:
                continue
            ca = CodingAssessment(
                course_id=None,
                created_by=admin.id,
                title=prob["title"],
                description=prob["description"],
                allowed_languages=["python", "cpp", "java", "javascript", "c"],
                time_limit_seconds=2,
                memory_limit_mb=256,
                max_score=100,
                scoring_mode=CodingScoringMode.partial,
                max_attempts=50,
                is_practice=True,
                points=prob["points"],
                difficulty=prob["difficulty"],
            )
            db.add(ca)
            await db.flush()
            for idx, (stdin, expected, hidden) in enumerate(prob["test_cases"]):
                db.add(
                    CodingTestCase(
                        assessment_id=ca.id,
                        input=stdin,
                        expected_output=expected,
                        is_hidden=hidden,
                        weight=1,
                        order_index=idx,
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
    print(f"  Admin:   admin@drmcet.ac.in  /  {DEFAULT_PASSWORD}")
    print(f"  Faculty: r.arun@drmcet.ac.in  /  {DEFAULT_PASSWORD}  (and 4 more)")
    print(f"  Student: 727622bam046@mcet.in  /  {DEFAULT_PASSWORD}  (and 15 more)")


if __name__ == "__main__":
    asyncio.run(seed())
