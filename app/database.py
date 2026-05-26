import os
from sqlalchemy import create_engine, Column, Integer, String, Float, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Locally: uses SQLite
# On Render/Supabase: set DATABASE_URL environment variable to your Postgres connection string
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cs_tracker.db")

# Supabase/Render give a URL starting with "postgres://" but SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False; Postgres does not
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    matric_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    credit_units = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)   # 1 or 2
    level = Column(Integer, nullable=False)      # 100, 200, 300, 400
    is_elective = Column(Integer, default=0)     # 0 = compulsory, 1 = elective


class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    matric_no = Column(String, nullable=False, index=True)
    course_code = Column(String, nullable=False)
    session = Column(String, nullable=False)     # e.g. "2025/2026"
    ca_score = Column(Float, nullable=True)
    exam_score = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)
    grade = Column(String, nullable=True)
    grade_point = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("matric_no", "course_code", "session", name="uq_result"),
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)