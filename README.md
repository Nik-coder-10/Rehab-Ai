# 🏥 RehabAI - AI-Assisted Physical Therapy & Rehabilitation Platform

> **SIH Hackathon Prototype**  
> *AI-powered posture analysis, real-time exercise feedback, remote patient monitoring, and personalized rehabilitation plans.*

---

## 📌 Overview

**RehabAI** is an intelligent digital health platform designed to transform physiotherapy and motor rehabilitation. By combining real-time computer vision posture analysis with clinical workflow management, RehabAI enables doctors to prescribe personalized rehabilitation plans and empowers patients to perform exercises accurately with real-time feedback.

> ⚠️ **Disclaimer**: *This software is a prototype developed for Smart India Hackathon (SIH). It is intended for demonstration purposes only and is not a certified medical device.*

---

## 🛠️ Architecture & Tech Stack

### Backend Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) `v0.115+` (Async API & Sync DB Session Handling)
- **Database ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) `2.0+` (Type-annotated Declarative Mapping)
- **Database Driver**: [psycopg3](https://www.psycopg.org/psycopg3/) `3.2+` (PostgreSQL integration)
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/) `1.13+`
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
- **Authentication**: JWT (`PyJWT`) & Password Hashing (`bcrypt`)

### Computer Vision (CV) Engine Stack
- **Pose Detection & Tracking**: [MediaPipe](https://mediapipe.dev/) `0.10+`
- **Image & Video Processing**: [OpenCV](https://opencv.org/) `4.10+`
- **Numerical Processing**: [NumPy](https://numpy.org/) `1.26+`

---

## 📁 Repository Structure

```
SIH/
├── README.md
├── .gitignore
└── backend/
    ├── alembic/              # Database migration scripts & environment
    ├── app/
    │   ├── api/              # API endpoints and routers (v1)
    │   ├── core/             # Configuration, logging, security & exceptions
    │   │   ├── config.py     # Settings loaded from environment / .env
    │   │   ├── exceptions.py # Custom HTTP domain exceptions
    │   │   ├── logging.py    # Structured logging configuration
    │   │   └── security.py   # JWT generation & bcrypt hashing helpers
    │   ├── db/               # Database engine, session setup & base class
    │   │   ├── base.py       # Import registry for Alembic metadata
    │   │   ├── base_class.py # Declarative Base model
    │   │   └── session.py    # Scoped DB sessions & FastAPI dependency
    │   ├── models/           # SQLAlchemy ORM Data Models
    │   │   ├── user.py       # User & UserRole models (Patient / Doctor / Admin)
    │   │   ├── doctor.py     # DoctorProfile, PatientProfile & PatientDoctor mapping
    │   │   ├── exercise.py   # Exercise catalogue & JSON engine configuration
    │   │   ├── plan.py       # RehabilitationPlan & PlanExercise prescriptions
    │   │   ├── session.py    # ExerciseSession, ExerciseMetric & ProgressRecord
    │   │   └── mixins.py     # Common Timestamp mixin (created_at, updated_at)
    │   ├── schemas/          # Pydantic schemas for request/response validation
    │   │   ├── auth.py       # Login & Registration payload definitions
    │   │   └── user.py       # User response schemas
    │   └── services/         # Business logic layer
    │       └── auth_service.py # Authentication & User registration workflows
    ├── .env.example          # Sample environment configuration file
    ├── alembic.ini           # Alembic migration configuration
    ├── requirements.txt      # Core backend dependencies
    ├── requirements-cv.txt   # Computer vision & pose tracking dependencies
    └── requirements-dev.txt  # Testing & developer tooling dependencies
```

---

## 🗄️ Core Data Models & Schema

1. **User & Roles (`users`)**: Central account system supporting `patient`, `doctor`, and `admin` roles with encrypted password hashes.
2. **Patient & Doctor Profiles (`patient_profiles`, `doctor_profiles`, `patient_doctors`)**: 1:1 user profile extensions and many-to-many relationship mapping care teams.
3. **Exercise Catalogue (`exercises`)**: Stores exercise definitions and dynamic JSON configurations for the CV engine (`default_engine_config`).
4. **Rehabilitation Plans (`rehabilitation_plans`, `plan_exercises`)**: Prescription structures linking patients with doctors, sets, reps, and target Range of Motion (ROM).
5. **Exercise Sessions & Metrics (`exercise_sessions`, `exercise_metrics`, `progress_records`)**: Track real-time patient session execution, rep-by-rep ROM angles, form score metrics, form issue logs, and longitudinal patient progress.

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- **Python**: `3.11` or `3.12` recommended
- **PostgreSQL**: Local instance or Docker container

### 2. Environment Setup

Clone the repository and navigate into the directory:
```bash
git clone https://github.com/Nik-coder-10/Rehab-Ai.git
cd Rehab-Ai/backend
```

Create and activate a virtual environment:
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

Install the core backend dependencies:
```bash
pip install -r requirements.txt
```

*(Optional)* Install Computer Vision dependencies for pose estimation work:
```bash
pip install -r requirements-cv.txt
```

### 4. Configuration

Copy the example environment file and update your variables:
```bash
cp .env.example .env
```

Update your `.env` settings:
```env
REHABAI_ENVIRONMENT=development
REHABAI_DEBUG=true
REHABAI_LOG_LEVEL=INFO
REHABAI_SECRET_KEY=your-super-secret-key-here
REHABAI_DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/rehabai
REHABAI_ACCESS_TOKEN_EXPIRE_MINUTES=1440
REHABAI_CORS_ORIGINS=["http://localhost:5173"]
```

---

## 🗃️ Database Migrations

Apply database migrations using Alembic:
```bash
alembic upgrade head
```

To create a new migration after model changes:
```bash
alembic revision --autogenerate -m "describe_migration_changes"
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
