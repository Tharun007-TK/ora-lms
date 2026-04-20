"""Quiz auto-grading (Day 11).

Rules — MCQ-only v1, locked by scope:
- No partial credit. Full points iff selected set == correct set.
- Any incorrect selection, or any missing correct selection, yields zero.
- Empty selection on a question with at least one correct option = zero.
"""
from __future__ import annotations

from dataclasses import dataclass

from models.tables import QuizQuestion


@dataclass(frozen=True)
class GradedQuestion:
    question_id: int
    correct_option_ids: list[int]
    selected_option_ids: list[int]
    is_correct: bool
    points_earned: int
    points_max: int


def grade_question(
    question: QuizQuestion, selected_option_ids: set[int]
) -> GradedQuestion:
    correct_ids = {opt.id for opt in question.options if opt.is_correct}
    valid_option_ids = {opt.id for opt in question.options}
    filtered = selected_option_ids & valid_option_ids

    is_correct = bool(correct_ids) and filtered == correct_ids
    return GradedQuestion(
        question_id=question.id,
        correct_option_ids=sorted(correct_ids),
        selected_option_ids=sorted(filtered),
        is_correct=is_correct,
        points_earned=question.points if is_correct else 0,
        points_max=question.points,
    )


def grade_attempt(
    questions: list[QuizQuestion],
    selections: dict[int, set[int]],
) -> tuple[int, int, list[GradedQuestion]]:
    """Return (score, max_score, per-question grades).

    selections: mapping of question_id -> set of selected option_ids.
    Unanswered questions = empty selection = 0 points.
    """
    graded: list[GradedQuestion] = []
    score = 0
    max_score = 0
    for q in sorted(questions, key=lambda x: x.position):
        max_score += q.points
        g = grade_question(q, selections.get(q.id, set()))
        score += g.points_earned
        graded.append(g)
    return score, max_score, graded
