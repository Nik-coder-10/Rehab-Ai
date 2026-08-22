import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/doctor', label: 'Clinical Overview', icon: LayoutDashboard, end: true },
    { to: '/doctor/patients', label: 'Patient Directory', icon: Users },
    { to: '/doctor/exercises', label: 'Exercise Library', icon: Dumbbell },
    { to: '/doctor/sessions', label: 'Session Logs', icon: History },
    { to: '/doctor/analytics', label: 'Rehab Analytics', icon: Activity },
    { to: '/doctor/profile', label: 'Physiotherapist Profile', icon: UserIcon },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Desktop Sidebar */}
      <aside
        style={{
          width: '270px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="desktop-sidebar"
      >
        {/* Brand Header */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Stethoscope size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Rehab<span style={{ color: '#60a5fa' }}>MD</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Clinical Workstation</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Clinical Management
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Doctor Status & User Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#93c5fd',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              MD
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.full_name || 'Dr. Elena Vance'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa' }}>Physiotherapist / DPT</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', justifyContent: 'center' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: '60px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="btn btn-secondary mobile-menu-btn"
              style={{ padding: '0.4rem', display: 'none' }}
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Stethoscope size={18} color="#60a5fa" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Physical Therapy Care Team Management
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-blue">Clinical Mode Active</span>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div
            style={{
              position: 'fixed',
              top: '60px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(12, 18, 30, 0.95)',
              zIndex: 50,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileNavOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-elevated)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={20} />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight size={18} />
                </NavLink>
              );
            })}
            <button
              onClick={() => {
                setMobileNavOpen(false);
                handleLogout();
              }}
              className="btn btn-secondary"
              style={{ marginTop: 'auto', padding: '0.85rem', justifyContent: 'center' }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}

        {/* Page View Container */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          main {
            padding: 1.25rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
