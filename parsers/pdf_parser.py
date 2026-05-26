import re
import pdfplumber
from app.grades import get_grade

CS_PREFIX = "25190"


def _clean_name(raw: str) -> str:
    """Remove stray digits and extra whitespace from a name string."""
    name = re.sub(r'\d+', '', raw).strip()
    return re.sub(r'\s+', ' ', name).strip()


def _parse_line_format_a(line: str) -> dict | None:
    """
    Format A (STA111-style): MATRIC  NAME  CA  EXAM  TOTAL
    No S/N column, no Grade column. Total = last number.
    Example: '251901001 Adenuga Omobolaji David 22 57 79'
    """
    pattern = re.compile(
        r'^(25190\d{4})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,3})\s*$'
    )
    m = pattern.match(line.strip())
    if not m:
        return None
    matric = m.group(1)
    name = _clean_name(m.group(2))
    ca, exam, total = float(m.group(3)), float(m.group(4)), float(m.group(5))
    grade, grade_point = get_grade(total)
    return dict(matric_no=matric, name=name, ca_score=ca,
                exam_score=exam, total_score=total, grade=grade, grade_point=grade_point)


def _parse_line_format_b(line: str) -> dict | None:
    """
    Format B (MTH101-style): SN  MATRIC  NAME  CA  EXAM  TOTAL  GRADE
    Has serial number prefix and explicit grade column.
    Names sometimes have digits glued in from PDF extraction errors.
    Example: '1086 251901001 Adenuga Omobolaji David 29 32 61 B'
    """
    line = line.strip()
    if not re.match(r'^\d+\s+25190', line):
        return None

    # Must end with a grade letter
    grade_match = re.search(r'\s([A-F])\s*$', line)
    if not grade_match:
        return None
    grade = grade_match.group(1)

    # Extract matric
    matric_match = re.search(r'(25190\d{4})', line)
    if not matric_match:
        return None
    matric = matric_match.group(1)

    # Extract all digit groups
    all_nums = re.findall(r'\d+', line)
    # Skip S/N and matric digits, get trailing numbers
    matric_idx = next(i for i, n in enumerate(all_nums) if n == matric)
    trailing = all_nums[matric_idx + 1:]

    if len(trailing) >= 3:
        ca   = float(trailing[-3])
        exam = float(trailing[-2])
        total = float(trailing[-1])
    elif len(trailing) == 2:
        exam  = float(trailing[-2])
        total = float(trailing[-1])
        ca    = round(total - exam, 1)   # derive CA
    else:
        return None

    # Extract and clean name
    after_matric = line[line.index(matric) + 9:].strip()
    name_raw = re.sub(r'[\d\s]+[A-F]\s*$', '', after_matric).strip()
    name = _clean_name(name_raw)

    _, grade_point = get_grade(total)
    return dict(matric_no=matric, name=name, ca_score=ca,
                exam_score=exam, total_score=total, grade=grade, grade_point=grade_point)


def parse_result_pdf(pdf_path: str, course_code: str, session: str) -> list[dict]:
    """
    Parse a result PDF. Auto-detects format A or B per line.
    Only students with matric starting with CS_PREFIX are included.
    """
    records = []
    seen = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
            for line in text.splitlines():
                if CS_PREFIX not in line:
                    continue
                # Try format B first (has S/N prefix), then format A
                result = _parse_line_format_b(line) or _parse_line_format_a(line)
                if result and result["matric_no"] not in seen:
                    result.update(course_code=course_code, session=session)
                    records.append(result)
                    seen.add(result["matric_no"])
                elif CS_PREFIX in line and not result:
                    print(f"  ⚠️  Could not parse: {line.strip()}")

    print(f"✅ Parsed {len(records)} CS students from {pdf_path}")
    return records


def parse_result_text(text: str, course_code: str, session: str) -> list[dict]:
    """
    Parse raw text (copy-pasted). Tries both formats per line.
    """
    records = []
    seen = set()

    for line in text.splitlines():
        if CS_PREFIX not in line:
            continue
        result = _parse_line_format_b(line) or _parse_line_format_a(line)
        if result and result["matric_no"] not in seen:
            result.update(course_code=course_code, session=session)
            records.append(result)
            seen.add(result["matric_no"])

    print(f"✅ Parsed {len(records)} CS students from text")
    return records


# ── Grade-only OCR parser (for image-based PDFs like COS101) ──────────────

def parse_grade_only_pdf(pdf_path: str, course_code: str, session: str) -> list[dict]:
    """
    Parse scanned/image-based PDFs that only show grades (no CA/Exam scores).
    Format: SN | MATRIC | NAME | GRADE | DEPARTMENT | COURSE_CODE
    Uses OCR via pytesseract.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError:
        raise ImportError("Install pdf2image and pytesseract: pip install pdf2image pytesseract")

    GRADE_MAP = {'A': 5.0, 'B': 4.0, 'C': 3.0, 'D': 2.0, 'E': 1.0, 'F': 0.0}

    pages = convert_from_path(pdf_path, dpi=200)
    records = []
    seen = set()

    for page in pages:
        text = pytesseract.image_to_string(page)
        for line in text.splitlines():
            if CS_PREFIX not in line:
                continue
            line = line.strip()

            # Extract matric
            matric_m = re.search(r'(25190\d{4})', line)
            if not matric_m:
                continue
            matric = matric_m.group(1)
            if matric in seen:
                continue

            # Extract grade — uppercase or lowercase, before "Computer"
            # Also handle OCR confusion: 8→B
            grade_m = re.search(r'\s([A-Fa-f8])\s+Computer', line)
            if not grade_m:
                grade_m = re.search(r'[a-z\.]\s+([A-Fa-f8])\s', line)
            if not grade_m:
                print(f"  ⚠️  No grade found: {repr(line)}")
                continue

            raw = grade_m.group(1).upper()
            grade = 'B' if raw == '8' else raw
            if grade not in GRADE_MAP:
                print(f"  ⚠️  Unknown grade '{grade}': {repr(line)}")
                continue

            grade_point = GRADE_MAP[grade]

            # Extract name between matric and grade
            after_matric = line[line.index(matric) + 9:].strip()
            after_matric = re.sub(r'^[\|\[\]\s]+', '', after_matric)
            name_m = re.match(r'^(.+?)\s+[A-Fa-f8]\s+Computer', after_matric)
            raw_name = name_m.group(1) if name_m else after_matric.split(grade)[0]
            name = re.sub(r'[^\w\s\-]', '', raw_name).strip()
            name = re.sub(r'\s+', ' ', name)

            records.append({
                'matric_no': matric,
                'name': name,
                'ca_score': None,
                'exam_score': None,
                'total_score': None,
                'grade': grade,
                'grade_point': grade_point,
                'course_code': course_code,
                'session': session,
            })
            seen.add(matric)

    print(f"✅ Parsed {len(records)} CS students (grade-only) from {pdf_path}")
    return records