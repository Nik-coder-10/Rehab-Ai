import type {
  AuthResponse,
  DoctorAnalyticsSummary,
  DoctorDashboardSummary,
  DoctorProfile,
  Exercise,
  ExerciseSession,
  PatientDetail,
  PatientListItem,
  PatientProfile,
  PlanExercise,
  ProgressSummary,
  RehabilitationPlan,
  User,
} from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('rehabai_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errorMsg;
    } catch {
      errorMsg = `${res.status} ${res.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<AuthResponse>(res);
  },

  register: async (data: { email: string; password: string; full_name: string; role: string }): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse<User>(res);
  },

  // Patient Dashboard & Plan
  getPatientProfile: async (): Promise<PatientProfile> => {
    const res = await fetch(`${API_BASE}/patient/profile`, {
      headers: getHeaders(),
    });
    return handleResponse<PatientProfile>(res);
  },

  updatePatientProfile: async (data: Partial<PatientProfile>): Promise<PatientProfile> => {
    const res = await fetch(`${API_BASE}/patient/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<PatientProfile>(res);
  },

  getPatientPlan: async (): Promise<RehabilitationPlan | null> => {
    const res = await fetch(`${API_BASE}/patient/plan`, {
      headers: getHeaders(),
    });
    return handleResponse<RehabilitationPlan | null>(res);
  },

  getPatientExercises: async (): Promise<Exercise[]> => {
    const res = await fetch(`${API_BASE}/patient/exercises`, {
      headers: getHeaders(),
    });
    return handleResponse<Exercise[]>(res);
  },

  getExerciseDetail: async (exerciseId: string): Promise<Exercise> => {
    const res = await fetch(`${API_BASE}/exercises/${exerciseId}`, {
      headers: getHeaders(),
    });
    return handleResponse<Exercise>(res);
  },

  getPatientSessions: async (): Promise<ExerciseSession[]> => {
    const res = await fetch(`${API_BASE}/patient/sessions`, {
      headers: getHeaders(),
    });
    return handleResponse<ExerciseSession[]>(res);
  },

  getPatientProgress: async (): Promise<ProgressSummary> => {
    const res = await fetch(`${API_BASE}/patient/progress`, {
      headers: getHeaders(),
    });
    return handleResponse<ProgressSummary>(res);
  },

  // Sessions
  createSession: async (exerciseId: string, planExerciseId?: string | null): Promise<ExerciseSession> => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        exercise_id: exerciseId,
        plan_exercise_id: planExerciseId || null,
      }),
    });
    return handleResponse<ExerciseSession>(res);
  },

  getSessionDetail: async (sessionId: string): Promise<ExerciseSession> => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      headers: getHeaders(),
    });
    return handleResponse<ExerciseSession>(res);
  },

  finishSession: async (sessionId: string, data: { status: string; completed_reps: number; ended_at?: string }): Promise<ExerciseSession> => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ExerciseSession>(res);
  },

  updateSession: async (sessionId: string, data: Partial<ExerciseSession>): Promise<ExerciseSession> => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ExerciseSession>(res);
  },

  // --- Doctor Management APIs ---
  getDoctorProfile: async (): Promise<DoctorProfile> => {
    const res = await fetch(`${API_BASE}/doctor/profile`, {
      headers: getHeaders(),
    });
    return handleResponse<DoctorProfile>(res);
  },

  updateDoctorProfile: async (data: Partial<DoctorProfile>): Promise<DoctorProfile> => {
    const res = await fetch(`${API_BASE}/doctor/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<DoctorProfile>(res);
  },

  getDoctorDashboard: async (): Promise<DoctorDashboardSummary> => {
    const res = await fetch(`${API_BASE}/doctor/dashboard`, {
      headers: getHeaders(),
    });
    return handleResponse<DoctorDashboardSummary>(res);
  },

  getDoctorAnalytics: async (): Promise<DoctorAnalyticsSummary> => {
    const res = await fetch(`${API_BASE}/doctor/analytics`, {
      headers: getHeaders(),
    });
    return handleResponse<DoctorAnalyticsSummary>(res);
  },

  getDoctorPatients: async (search?: string): Promise<PatientListItem[]> => {
    const url = search ? `${API_BASE}/doctor/patients?search=${encodeURIComponent(search)}` : `${API_BASE}/doctor/patients`;
    const res = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse<PatientListItem[]>(res);
  },

  getDoctorPatientDetail: async (patientId: string): Promise<PatientDetail> => {
    const res = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
      headers: getHeaders(),
    });
    return handleResponse<PatientDetail>(res);
  },

  createPatientPlan: async (patientId: string, data: { title: string; description?: string; start_date?: string; end_date?: string }): Promise<RehabilitationPlan> => {
    const res = await fetch(`${API_BASE}/doctor/patients/${patientId}/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RehabilitationPlan>(res);
  },

  updatePlan: async (planId: string, data: Partial<RehabilitationPlan>): Promise<RehabilitationPlan> => {
    const res = await fetch(`${API_BASE}/doctor/plans/${planId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<RehabilitationPlan>(res);
  },

  assignExerciseToPlan: async (planId: string, data: {
    exercise_id: string;
    target_sets: number;
    target_reps: number;
    target_rom_degrees?: number;
    frequency_per_week?: number;
    instructions_override?: string;
  }): Promise<PlanExercise> => {
    const res = await fetch(`${API_BASE}/doctor/plans/${planId}/exercises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<PlanExercise>(res);
  },

  updatePlanExercise: async (planId: string, planExerciseId: string, data: Partial<PlanExercise>): Promise<PlanExercise> => {
    const res = await fetch(`${API_BASE}/doctor/plans/${planId}/exercises/${planExerciseId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<PlanExercise>(res);
  },

  removePlanExercise: async (planId: string, planExerciseId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/doctor/plans/${planId}/exercises/${planExerciseId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<void>(res);
  },

  getDoctorExercises: async (): Promise<Exercise[]> => {
    const res = await fetch(`${API_BASE}/doctor/exercises`, {
      headers: getHeaders(),
    });
    return handleResponse<Exercise[]>(res);
  },

  createExercise: async (data: Partial<Exercise>): Promise<Exercise> => {
    const res = await fetch(`${API_BASE}/doctor/exercises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Exercise>(res);
  },
};
