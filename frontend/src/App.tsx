import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { PatientLayout } from './layouts/PatientLayout';
import { DoctorLayout } from './layouts/DoctorLayout';

// Auth Pages
import { LoginPage } from './pages/LoginPage';

// Patient Pages
import { PatientDashboard } from './pages/PatientDashboard';
import { ExercisesPage } from './pages/ExercisesPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExerciseSessionPage } from './pages/ExerciseSessionPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage';
import { DoctorPatientDetailPage } from './pages/doctor/DoctorPatientDetailPage';
import { DoctorPlanManagementPage } from './pages/doctor/DoctorPlanManagementPage';
import { DoctorExercisesPage } from './pages/doctor/DoctorExercisesPage';
import { DoctorSessionsPage } from './pages/doctor/DoctorSessionsPage';
import { DoctorAnalyticsPage } from './pages/doctor/DoctorAnalyticsPage';
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage';

// Dev / Testing Routes
import { DevPoseTestPage } from './pages/dev/DevPoseTestPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Patient Routes */}
          <Route element={<ProtectedRoute allowedRole="patient" />}>
            <Route path="/patient" element={<PatientLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="exercises" element={<ExercisesPage />} />
              <Route path="exercises/:exerciseId" element={<ExerciseDetailPage />} />
              <Route path="session/:exerciseId" element={<ExerciseSessionPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Protected Doctor / Physiotherapist Routes */}
          <Route element={<ProtectedRoute allowedRole="doctor" />}>
            <Route path="/doctor" element={<DoctorLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="patients" element={<DoctorPatientsPage />} />
              <Route path="patients/:patientId" element={<DoctorPatientDetailPage />} />
              <Route path="patients/:patientId/plan" element={<DoctorPlanManagementPage />} />
              <Route path="exercises" element={<DoctorExercisesPage />} />
              <Route path="sessions" element={<DoctorSessionsPage />} />
              <Route path="analytics" element={<DoctorAnalyticsPage />} />
              <Route path="profile" element={<DoctorProfilePage />} />
            </Route>
          </Route>

          {/* Dev Pose Estimation Testing Route */}
          <Route path="/dev/pose-test" element={<DevPoseTestPage />} />

          {/* Default Root Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
