def get_grade(total: float) -> tuple[str, float]:
    """Returns (grade_letter, grade_point) using Nigerian university scale."""
    if total >= 70:
        return "A", 5.0
    elif total >= 60:
        return "B", 4.0
    elif total >= 50:
        return "C", 3.0
    elif total >= 45:
        return "D", 2.0
    elif total >= 40:
        return "E", 1.0
    else:
        return "F", 0.0


def compute_gpa(results: list[dict]) -> float:
    """
    results: list of dicts with keys: grade_point, credit_units
    Returns GPA rounded to 2 decimal places.
    """
    total_weighted = sum(r["grade_point"] * r["credit_units"] for r in results)
    total_units = sum(r["credit_units"] for r in results)
    if total_units == 0:
        return 0.0
    return round(total_weighted / total_units, 2)


def compute_cgpa(all_results: list[dict]) -> float:
    """
    Cumulative GPA across all semesters/levels.
    all_results: list of dicts with grade_point and credit_units
    """
    return compute_gpa(all_results)