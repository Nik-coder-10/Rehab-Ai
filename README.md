# RehabAI - AI-Assisted Physical Therapy & Motor Rehabilitation Platform

RehabAI is an intelligent, real-time motor rehabilitation platform engineered for Smart India Hackathon (SIH). It features client-side MediaPipe pose detection, real-time WebSocket exercise telemetry, deterministic biomechanical scoring, longitudinal Recovery Score algorithms, doctor clinical intelligence triage, and safety-prompted AI coaching.

---

## 🏗️ System Architecture

```
Physical Exercises (Patient Webcam)
              │
              ▼
Client-Side MediaPipe Engine (Angles, Velocities, Calibration)
              │
              ▼
WebSocket Telemetry (/api/ws/exercise-session/{id})
              │
              ▼
Deterministic Scoring & Recovery Engine (PostgreSQL DB)
              │
              ▼
[Doctor Clinical Intelligence & Patient Portals]
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18+ & npm
- **Python**: 3.11+
- **Docker & Docker Compose** (Optional, for full containerized stack)

---

### Option A: Running via Docker Compose (Recommended for Judges / Evaluators)

1. Clone the repository:
   ```bash
   git clone https://github.com/Nik-coder-10/Rehab-Ai.git
   cd Rehab-Ai
   ```

2. Start the full multi-tier containerized stack (PostgreSQL + FastAPI + Vite Nginx frontend):
   ```bash
   docker-compose up --build -d
   ```

3. Access the portals:
   - **Frontend Application**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Local Development Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Automated Test Suites

### Backend Integration & Security Tests (45 Tests)
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Biomechanical & Calibration Tests (38 Tests)
```bash
cd frontend
npx vitest run
```

### Frontend Production Build Verification
```bash
cd frontend
npm run build
```

---

## 🔒 Security, Privacy & RBAC

- **Role-Based Access Control (RBAC)**: Distinct permissions for `PATIENT` and `DOCTOR` users.
- **IDOR Protection**: Verified ownership checks on workout sessions, patient charts, and care protocols.
- **Security Headers**: Enforces `nosniff`, `DENY` frame ancestors, CSP, and strict CORS.
- **AI Safety**: Zero-hallucination architecture; the AI layer acts as an interpreter of verified database metrics rather than the source of truth.

---

## 👥 Default Demo Credentials

- **Doctor Account**:
  - Email: `doctor@rehabai.com`
  - Password: `Password123!`
- **Patient Account**:
  - Email: `patient@rehabai.com`
  - Password: `Password123!`
