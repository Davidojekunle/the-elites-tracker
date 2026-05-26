COURSES_100L = [
    # --- FIRST SEMESTER ---
    {"code": "GST111",      "title": "Communication in English",                        "credit_units": 2, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "MTH101",      "title": "Elementary Mathematics I",                        "credit_units": 2, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "PHY101",      "title": "General Physics I",                               "credit_units": 2, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "PHY107",      "title": "General Practical Physics I",                     "credit_units": 1, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "STA111",      "title": "Descriptive Statistics",                          "credit_units": 3, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "COS101",      "title": "Introduction to Computing Sciences",              "credit_units": 3, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "LAGCSC103",   "title": "Fundamentals of Programming",                     "credit_units": 3, "semester": 1, "level": 100, "is_elective": 0},
    {"code": "LAGCYB105",   "title": "Intro to Data Analysis with Statistical Packages","credit_units": 2, "semester": 1, "level": 100, "is_elective": 1},

    # --- SECOND SEMESTER ---
    {"code": "GST112",      "title": "Nigerian Peoples and Culture",                    "credit_units": 2, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "MTH102",      "title": "Elementary Mathematics II",                       "credit_units": 2, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "PHYCM102",    "title": "General Physics II",                              "credit_units": 2, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "PHYCM108",    "title": "General Practical Physics II",                    "credit_units": 1, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "COS102",      "title": "Problem Solving",                                 "credit_units": 3, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "LAGCSC104",   "title": "Introduction to Web Design and Development",      "credit_units": 3, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "LAGCYB106",   "title": "Basic Theory and Principles of Computer Security","credit_units": 3, "semester": 2, "level": 100, "is_elective": 0},
    {"code": "LAGCSC106",   "title": "Introduction to Algorithms and Data Structures",  "credit_units": 3, "semester": 2, "level": 100, "is_elective": 1},
]


def seed_courses(db):
    from app.database import Course
    for c in COURSES_100L:
        exists = db.query(Course).filter_by(code=c["code"]).first()
        if not exists:
            db.add(Course(**c))
    db.commit()
    print(f"✅ Seeded {len(COURSES_100L)} courses.")