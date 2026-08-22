import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Lock, Mail, ShieldAlert, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await api.register({ email, password, full_name: fullName, role });
        // Auto-login after registration
        const authData = await api.login({ email, password });
        login(authData.access_token, authData.user);
        if (authData.user.role === 'patient') {
          navigate('/patient');
        } else if (authData.user.role === 'doctor') {
          navigate('/doctor');
        }
      } else {
        const authData = await api.login({ email, password });
        login(authData.access_token, authData.user);
        if (authData.user.role === 'patient') {
          navigate('/patient');
        } else if (authData.user.role === 'doctor') {
          navigate('/doctor');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string, targetPath: string) => {
    setError(null);
    setLoading(true);
    try {
      const authData = await api.login({ email: demoEmail, password: demoPass });
      login(authData.access_token, authData.user);
      navigate(targetPath);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.12) 0%, #0c121e 70%)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.25rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <HeartPulse size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Rehab<span style={{ color: 'var(--primary-light)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {isRegister ? 'Create your rehabilitation account' : 'Physiotherapy & Patient Portal'}
          </p>
        </div>

        {/* Demo Fast Access Buttons */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(20, 184, 166, 0.08)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(20, 184, 166, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={16} color="var(--primary-light)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
              Instant Demo Access
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDemoLogin('patient@rehabai.com', 'PatientPass123!', '/patient')}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.825rem', padding: '0.5rem', justifyContent: 'center' }}
            disabled={loading}
          >
            Load Demo Patient (Marcus Sterling)
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('doctor@rehabai.com', 'DoctorPass123!', '/doctor')}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '0.825rem', padding: '0.5rem', justifyContent: 'center' }}
            disabled={loading}
          >
            Load Demo Doctor (Dr. Elena Vance, DPT)
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="patient@rehabai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'patient' | 'doctor')}
                className="form-select"
              >
                <option value="patient">Patient (Therapy & Exercise Tracking)</option>
                <option value="doctor">Physiotherapist / Doctor</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-light)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};
