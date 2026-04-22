"""Parse a .docx file into a structured MCQ quiz.

Expected layout (see ``ml_sample_quiz.docx``)::

    Machine Learning – Sample Quiz               <- optional title
    Total Questions: 10  |  Total Marks: 10      <- optional metadata line

    1. Which of the following is a supervised learning algorithm?
       a. Linear Regression
       b. K-Means Clustering
       c. Principal Component Analysis
       d. Apriori Algorithm
    Answer: a. Linear Regression
    grade/weight: 1

    2. ...

Multiple correct answers can be given as ``Answer: a, c`` or
``Answer: a; c`` or ``Answer: a. Foo, c. Bar``. Letters are matched
case-insensitively.

Parsing is forgiving of blank lines and minor formatting variation but
strict about structure — if a question has no matchable answer, it is
skipped and surfaced in :attr:`ParsedQuiz.warnings`.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from io import BytesIO
from typing import Final
from zipfile import BadZipFile, ZipFile


_QUESTION_RE: Final = re.compile(r"^\s*(\d+)\s*[\.\)]\s*(.+?)\s*$")
_OPTION_RE: Final = re.compile(r"^\s*([A-Za-z])\s*[\.\)]\s*(.+?)\s*$")
_ANSWER_RE: Final = re.compile(r"^\s*Answer\s*[:\-]\s*(.+?)\s*$", re.IGNORECASE)
_WEIGHT_RE: Final = re.compile(
    r"^\s*(?:grade\s*/\s*weight|grade|weight|points?|marks?)\s*[:\-]\s*(\d+)\s*$",
    re.IGNORECASE,
)
_ANSWER_LETTER_RE: Final = re.compile(r"\b([A-Za-z])\b")


@dataclass
class ParsedQuestion:
    text: str
    options: list[str]
    correct_indexes: list[int]
    points: int = 1


@dataclass
class ParsedQuiz:
    title: str | None
    questions: list[ParsedQuestion] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class DocxParseError(Exception):
    """Raised when the docx cannot be opened or contains no questions."""


def _extract_paragraphs(data: bytes) -> list[str]:
    try:
        with ZipFile(BytesIO(data)) as z:
            try:
                xml = z.read("word/document.xml").decode("utf-8", errors="replace")
            except KeyError as exc:
                raise DocxParseError(
                    "Not a valid .docx file (missing word/document.xml)"
                ) from exc
    except BadZipFile as exc:
        raise DocxParseError("Not a valid .docx file") from exc

    paragraphs: list[str] = []
    for match in re.finditer(r"<w:p\b[^>]*>(.*?)</w:p>", xml, flags=re.S):
        body = match.group(1)
        runs = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", body)
        text = "".join(runs)
        text = (
            text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&apos;", "'")
        )
        paragraphs.append(text.strip())
    return paragraphs


def _parse_answer_letters(answer_text: str) -> list[str]:
    """Extract answer letters from an 'Answer: ...' payload.

    Accepts ``a``, ``a. Linear Regression``, ``a, c``, ``a; c``, etc.
    Returns unique lowercase letters in order."""
    letters: list[str] = []
    for part in re.split(r"[,;/]", answer_text):
        m = _ANSWER_LETTER_RE.search(part.strip())
        if m:
            letter = m.group(1).lower()
            if letter not in letters:
                letters.append(letter)
    return letters


def parse_docx_quiz(data: bytes) -> ParsedQuiz:
    """Parse docx bytes into a :class:`ParsedQuiz`.

    Raises :class:`DocxParseError` if the document cannot be opened or if
    no questions are found."""
    paragraphs = _extract_paragraphs(data)
    if not paragraphs:
        raise DocxParseError("Document appears to be empty")

    quiz = ParsedQuiz(title=None)

    for p in paragraphs:
        if p:
            if not _QUESTION_RE.match(p):
                quiz.title = p
            break

    current: ParsedQuestion | None = None
    option_letters: list[str] = []
    pending_answer: str | None = None

    def finalize(
        q: ParsedQuestion | None, letters: list[str], ans: str | None
    ) -> None:
        if q is None:
            return
        if not q.options:
            quiz.warnings.append(
                f"Question {len(quiz.questions) + 1} has no options — skipped"
            )
            return
        correct: list[int] = []
        if ans is not None:
            for letter in _parse_answer_letters(ans):
                if letter in letters:
                    correct.append(letters.index(letter))
        if not correct and ans:
            target = re.sub(r"^[A-Za-z]\s*[\.\)]\s*", "", ans).strip().lower()
            for idx, opt in enumerate(q.options):
                if opt.strip().lower() == target:
                    correct.append(idx)
                    break
        if not correct:
            quiz.warnings.append(
                f"Question {len(quiz.questions) + 1} '{q.text[:60]}' — "
                f"could not match answer, skipped"
            )
            return
        q.correct_indexes = sorted(set(correct))
        quiz.questions.append(q)

    for raw in paragraphs:
        line = raw.strip()
        if not line:
            continue

        m_q = _QUESTION_RE.match(line)
        m_a = _ANSWER_RE.match(line)
        m_w = _WEIGHT_RE.match(line)
        m_o = _OPTION_RE.match(line)

        if m_q:
            finalize(current, option_letters, pending_answer)
            current = ParsedQuestion(
                text=m_q.group(2).strip(),
                options=[],
                correct_indexes=[],
            )
            option_letters = []
            pending_answer = None
            continue

        if current is None:
            continue

        if m_a:
            pending_answer = m_a.group(1).strip()
            continue
        if m_w:
            try:
                current.points = max(1, min(100, int(m_w.group(1))))
            except ValueError:
                pass
            continue
        if m_o:
            letter = m_o.group(1).lower()
            text = m_o.group(2).strip()
            if letter in option_letters:
                continue
            current.options.append(text)
            option_letters.append(letter)
            continue

        if not current.options:
            current.text = f"{current.text} {line}".strip()

    finalize(current, option_letters, pending_answer)

    if not quiz.questions:
        raise DocxParseError(
            "No questions were parsed — expected numbered questions with "
            "lettered options and an 'Answer:' line per question."
        )
    return quiz


if __name__ == "__main__":  # pragma: no cover — manual smoke test
    import sys
    from pathlib import Path

    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("ml_sample_quiz.docx")
    parsed = parse_docx_quiz(path.read_bytes())
    print(f"TITLE: {parsed.title}")
    print(f"QUESTIONS: {len(parsed.questions)}")
    print(f"WARNINGS: {parsed.warnings}")
    for i, q in enumerate(parsed.questions, 1):
        print(f"{i}. [{q.points}pt] {q.text[:80]}")
        for j, o in enumerate(q.options):
            mark = "*" if j in q.correct_indexes else " "
            print(f"   {mark} {chr(97 + j)}. {o[:60]}")
