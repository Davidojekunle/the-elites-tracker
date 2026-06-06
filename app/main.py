from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import tempfile, os, json

from app.database import get_db, init_db, Student, Course, Result
from app.grades import get_grade, compute_cgpa
from app.courses import seed_courses
from parsers.pdf_parser import parse_result_pdf, parse_result_text
from pydantic import BaseModel
from typing import Optional
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


app = FastAPI(title="CS 100L Academic Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    db = next(get_db())
    seed_courses(db)
    print("🚀 CS Tracker API is live.")


class UpdateScoreRequest(BaseModel):
    ca_score: Optional[float] = None
    exam_score: Optional[float] = None
    total_score: Optional[float] = None

class SessionCorrectionRequest(BaseModel):
    current_session: str
    new_session: str
    matric_nos: Optional[list[str]] = None
    matric_numbers: Optional[list[str]] = None
    course_codes: Optional[list[str]] = None

class DeleteStudentsRequest(BaseModel):
    matric_nos: Optional[list[str]] = None
    matric_numbers: Optional[list[str]] = None

# ─────────────────────────────────────────
# INGEST: Upload PDF
# ─────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")
@app.post("/ingest/pdf")
async def ingest_pdf(
    file: UploadFile = File(...),
    course_code: str = Form(...),
    session: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload a result PDF. Parses and stores all 25190 students."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        records = parse_result_pdf(tmp_path, course_code.upper(), session)
        saved = _save_records(records, db)
    finally:
        os.unlink(tmp_path)

    return {"message": f"Ingested {saved} records for {course_code}"}


# ─────────────────────────────────────────
# INGEST: Paste raw text
# ─────────────────────────────────────────

@app.post("/ingest/text")
def ingest_text(
    text: str = Form(...),
    course_code: str = Form(...),
    session: str = Form(...),
    db: Session = Depends(get_db)
):
    """Paste raw text copied from a PDF result sheet."""
    records = parse_result_text(text, course_code.upper(), session)
    saved = _save_records(records, db)
    return {"message": f"Ingested {saved} records for {course_code}"}


# ─────────────────────────────────────────
# INGEST: Selenium scraped data (JSON)
# ─────────────────────────────────────────

@app.post("/ingest/scrape")
def ingest_scraped(
    payload: list[dict],
    course_code: str,
    session: str,
    db: Session = Depends(get_db)
):
    """
    Accept scraped results from Selenium.
    Payload: list of {matric_no, name, ca_score, exam_score, total_score}
    """
    records = []
    for row in payload:
        total = row.get("total_score")
        if total is None:
            ca = row.get("ca_score")
            exam = row.get("exam_score")
            if ca is not None and exam is not None:
                total = float(ca) + float(exam)
        if total is None:
            raise HTTPException(status_code=400, detail="Each row must include total_score or both ca_score and exam_score.")
        total = float(total)
        grade, grade_point = get_grade(total)
        records.append({
            **row,
            "grade": grade,
            "grade_point": grade_point,
            "course_code": course_code.upper(),
            "session": session,
        })
    saved = _save_records(records, db)
    return {"message": f"Ingested {saved} scraped records"}


@app.post("/ingest/bulk-json")
async def ingest_bulk_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a JSON file containing a list of result records."""
    content = await file.read()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail="JSON must be an array of records")

    records = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        course_code = row.get("course_code")
        session = row.get("session")
        if not course_code or not session:
            raise HTTPException(status_code=400, detail="Each record must include course_code and session")

        total = row.get("total_score")
        if total is None:
            ca = row.get("ca_score")
            exam = row.get("exam_score")
            if ca is not None and exam is not None:
                total = float(ca) + float(exam)

        if total is None:
            raise HTTPException(status_code=400, detail="Each record must include total_score or both ca_score and exam_score")

        grade, grade_point = get_grade(float(total))
        records.append({
            "matric_no": row.get("matric_no"),
            "name": row.get("name"),
            "ca_score": row.get("ca_score"),
            "exam_score": row.get("exam_score"),
            "total_score": float(total),
            "grade": grade,
            "grade_point": grade_point,
            "course_code": course_code.upper(),
            "session": session,
        })

    saved = _save_records(records, db)
    return {"message": f"Ingested {saved} records from JSON file"}


# ─────────────────────────────────────────
# LEADERBOARD
# ─────────────────────────────────────────

@app.get("/leaderboard")
def leaderboard(
    session: str = "2025/2026",
    level: int = 100,
    semester: int = None,
    db: Session = Depends(get_db)
):
    """
    Returns ranked students with GPA and CGPA.
    Filters by session and level. Optionally filter by semester.
    """
    # Get all courses for this level
    course_query = db.query(Course).filter_by(level=level)
    if semester:
        course_query = course_query.filter_by(semester=semester)
    courses = {c.code: c for c in course_query.all()}

    # Get all students with results for this session
    students = db.query(Student).join(Result, Student.matric_no == Result.matric_no)
    students = students.filter(Result.session == session).distinct().all()

    leaderboard_data = []

    for student in students:
        # Get all results for this student
        results = db.query(Result).filter_by(matric_no=student.matric_no, session=session).all()

        if not results:
            continue

        result_details = []
        for r in results:
            course = courses.get(r.course_code)
            if not course:
                continue
            result_details.append({
                "course_code": r.course_code,
                "course_title": course.title,
                "credit_units": course.credit_units,
                "ca_score": r.ca_score,
                "exam_score": r.exam_score,
                "total_score": r.total_score,
                "grade": r.grade,
                "grade_point": r.grade_point,
                "semester": course.semester,
            })

        if not result_details:
            continue

        cgpa = compute_cgpa(result_details)
        total_units = sum(r["credit_units"] for r in result_details)
        courses_sat = len(result_details)

        leaderboard_data.append({
            "matric_no": student.matric_no,
            "name": student.name,
            "cgpa": cgpa,
            "total_units": total_units,
            "courses_sat": courses_sat,
            "results": result_details,
        })

    # Sort by CGPA descending
    leaderboard_data.sort(key=lambda x: x["cgpa"], reverse=True)

    # Assign ranks (handle ties)
    ranked = []
    rank = 1
    for i, entry in enumerate(leaderboard_data):
        if i > 0 and entry["cgpa"] < leaderboard_data[i - 1]["cgpa"]:
            rank = i + 1
        ranked.append({**entry, "rank": rank})

    return {"session": session, "level": level, "count": len(ranked), "leaderboard": ranked}


# ─────────────────────────────────────────
# STUDENT PROFILE
# ─────────────────────────────────────────

@app.get("/student/{matric_no}")
def student_profile(matric_no: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter_by(matric_no=matric_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = db.query(Result).filter_by(matric_no=matric_no).all()
    courses = {c.code: c for c in db.query(Course).all()}

    breakdown = []
    for r in results:
        course = courses.get(r.course_code, None)
        breakdown.append({
            "session": r.session,
            "course_code": r.course_code,
            "course_title": course.title if course else "",
            "credit_units": course.credit_units if course else 0,
            "ca_score": r.ca_score,
            "exam_score": r.exam_score,
            "total_score": r.total_score,
            "grade": r.grade,
            "grade_point": r.grade_point,
            "semester": course.semester if course else None,
            "level": course.level if course else None,
        })

    cgpa = compute_cgpa([
        {"grade_point": r["grade_point"], "credit_units": r["credit_units"]}
        for r in breakdown if r["grade_point"] is not None
    ])

    return {
        "matric_no": student.matric_no,
        "name": student.name,
        "cgpa": cgpa,
        "results": breakdown,
    }


# ─────────────────────────────────────────
# COURSES LIST
# ─────────────────────────────────────────

@app.get("/courses")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    return [{"code": c.code, "title": c.title, "credit_units": c.credit_units,
             "semester": c.semester, "level": c.level, "is_elective": c.is_elective}
            for c in courses]


# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def _save_records(records: list[dict], db: Session) -> int:
    saved = 0
    for r in records:
        # Upsert student
        student = db.query(Student).filter_by(matric_no=r["matric_no"]).first()
        if not student:
            db.add(Student(matric_no=r["matric_no"], name=r["name"]))
        else:
            student.name = r["name"]  # update name if changed

        # Upsert result
        existing = db.query(Result).filter_by(
            matric_no=r["matric_no"],
            course_code=r["course_code"],
            session=r["session"]
        ).first()

        if existing:
            existing.ca_score = r.get("ca_score")
            existing.exam_score = r.get("exam_score")
            existing.total_score = r.get("total_score")
            existing.grade = r.get("grade")
            existing.grade_point = r.get("grade_point")
        else:
            db.add(Result(
                matric_no=r["matric_no"],
                course_code=r["course_code"],
                session=r["session"],
                ca_score=r.get("ca_score"),
                exam_score=r.get("exam_score"),
                total_score=r.get("total_score"),
                grade=r.get("grade"),
                grade_point=r.get("grade_point"),
            ))
        saved += 1

    db.commit()
    return saved


@app.post("/ingest/pdf-grade-only")
async def ingest_grade_only_pdf(
    file: UploadFile = File(...),
    course_code: str = Form(...),
    session: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload a scanned/image-based PDF that only has grades (no CA/Exam scores)."""
    from parsers.pdf_parser import parse_grade_only_pdf
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        records = parse_grade_only_pdf(tmp_path, course_code.upper(), session)
        saved = _save_records(records, db)
    finally:
        os.unlink(tmp_path)
    return {"message": f"Ingested {saved} grade-only records for {course_code}"}


@app.put("/result/update")
def update_student_result(
    matric_no: str,
    course_code: str,
    session: str,
    payload: UpdateScoreRequest,
    db: Session = Depends(get_db)
):
    # find existing result
    result = db.query(Result).filter_by(
        matric_no=matric_no,
        course_code=course_code.upper(),
        session=session
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    # update fields if provided
    if payload.ca_score is not None:
        result.ca_score = payload.ca_score

    if payload.exam_score is not None:
        result.exam_score = payload.exam_score

    # auto-recompute total if CA + exam exist
    if payload.total_score is not None:
        result.total_score = payload.total_score
    elif result.ca_score is not None and result.exam_score is not None:
        result.total_score = result.ca_score + result.exam_score

    # recompute grade
    if result.total_score is not None:
        grade, grade_point = get_grade(result.total_score)
        result.grade = grade
        result.grade_point = grade_point

    db.commit()
    db.refresh(result)

    return {
        "message": "Result updated successfully",
        "data": {
            "matric_no": result.matric_no,
            "course_code": result.course_code,
            "session": result.session,
            "ca_score": result.ca_score,
            "exam_score": result.exam_score,
            "total_score": result.total_score,
            "grade": result.grade,
            "grade_point": result.grade_point,
        }
    }

@app.post("/result/correct-session")
def correct_result_session(payload: SessionCorrectionRequest, db: Session = Depends(get_db)):
    query = db.query(Result).filter(Result.session == payload.current_session)

    matric_nos = payload.matric_nos or payload.matric_numbers
    if matric_nos:
        query = query.filter(Result.matric_no.in_(matric_nos))
    if payload.course_codes:
        query = query.filter(Result.course_code.in_([code.upper() for code in payload.course_codes]))

    updated = query.update({Result.session: payload.new_session}, synchronize_session=False)
    db.commit()

    return {
        "message": f"Updated {updated} result record(s)",
        "current_session": payload.current_session,
        "new_session": payload.new_session,
        "matric_nos": matric_nos or [],
        "course_codes": payload.course_codes or []
    }

@app.post("/student/remove")
def remove_students(payload: DeleteStudentsRequest, db: Session = Depends(get_db)):
    matric_nos = payload.matric_nos or payload.matric_numbers
    if not matric_nos:
        raise HTTPException(status_code=400, detail="Provide matric_nos or matric_numbers")

    deleted_results = db.query(Result).filter(Result.matric_no.in_(matric_nos)).delete(synchronize_session=False)
    deleted_students = db.query(Student).filter(Student.matric_no.in_(matric_nos)).delete(synchronize_session=False)
    db.commit()

    return {
        "message": f"Deleted {deleted_students} students and {deleted_results} result record(s)",
        "matric_nos": matric_nos
    }

@app.delete("/result/course")
def delete_course_results(
    course_code: str,
    session: str,
    db: Session = Depends(get_db)
):
    deleted = db.query(Result).filter_by(
        course_code=course_code.upper(),
        session=session
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": f"Deleted {deleted} results for course {course_code}",
        "course_code": course_code,
        "session": session
    }