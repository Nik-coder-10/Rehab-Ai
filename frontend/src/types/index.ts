export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DoctorSummary {
  id: string;
  full_name: string;
  email: string;
  specialization: string | null;
  organization: string | null;
  license_number: string | null;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization: string | null;
  organization: string | null;
  license_number: string | null;
  created_at: string;
  patients_count: number;
  active_plans_count: number;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  medical_conditions: string | null;
  notes: string | null;
  created_at: string;
  assigned_doctors: DoctorSummary[];
}

export interface PatientListItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  date_of_birth: string | null;
  medical_conditions: string | null;
  notes: string | null;
  linked_at: string;
  active_plan_title: string | null;
  active_plan_id: string | null;
  total_sessions_completed: number;
  last_session_at: string | null;
  adherence_rate: number;
  needs_attention: boolean;
}

export interface PatientDetail {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  medical_conditions: string | null;
  notes: string | null;
  created_at: string;
  linked_at: string;
  active_plan: RehabilitationPlan | null;
  all_plans: RehabilitationPlan[];
  recent_sessions: ExerciseSession[];
  total_sessions_completed: number;
  average_form_score: number | null;
  adherence_percentage: number;
  rom_progress_records: Array<{
    id: string;
    metric: string;
    value: number;
    unit: string;
    recorded_at: string;
  }>;
}

export type ExerciseCategory = 'strength' | 'mobility' | 'stretching' | 'balance';

export interface Exercise {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: ExerciseCategory;
  instructions: string | null;
  is_active: boolean;
  default_engine_config: Record<string, any> | null;
}

export interface PlanExercise {
  id: string;
  plan_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_rom_degrees: number | null;
  frequency_per_week: number | null;
  instructions_override: string | null;
  exercise: Exercise;
}

export type PlanStatus = 'active' | 'completed' | 'archived';

export interface RehabilitationPlan {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  start_date: string | null;
  end_date: string | null;
  doctor: DoctorSummary | null;
  exercises: PlanExercise[];
}

export type SessionStatus = 'in_progress' | 'completed' | 'aborted';

export interface ExerciseMetric {
  id: string;
  rep_index: number;
  performed_at: string;
  rom_min_deg: number | null;
  rom_max_deg: number | null;
  form_score: number | null;
  form_issues: any[] | null;
  valid: boolean;
}

export interface ExerciseSession {
  id: string;
  patient_profile_id: string;
  exercise_id: string;
  plan_exercise_id: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  exercise?: Exercise;
  metrics_count?: number;
  average_form_score?: number | null;
  max_rom?: number | null;
  metrics?: ExerciseMetric[];
}

export interface ProgressSummary {
  total_sessions_completed: number;
  total_exercises_completed: number;
  adherence_percentage: number;
  recovery_score_placeholder: string;
  average_form_score: number | null;
  rom_progress_records: Array<{
    id: string;
    metric: string;
    value: number;
    unit: string;
    recorded_at: string;
  }>;
  weekly_frequency: Array<{
    day: string;
    sessions: number;
    target: number;
  }>;
  recent_sessions: ExerciseSession[];
}

export interface DoctorDashboardSummary {
  total_patients: number;
  active_plans_count: number;
  total_sessions_completed: number;
  patients_needing_attention_count: number;
  average_adherence_rate: number;
  recent_patient_activity: PatientListItem[];
  recent_sessions: ExerciseSession[];
}

export interface DoctorAnalyticsSummary {
  total_patients: number;
  total_sessions: number;
  average_adherence_rate: number;
  average_form_score: number | null;
  weekly_session_volume: Array<{
    week: string;
    sessions: number;
    completed: number;
  }>;
  adherence_distribution: Array<{
    tier: string;
    count: number;
  }>;
  top_prescribed_exercises: Array<{
    name: string;
    count: number;
  }>;
}
