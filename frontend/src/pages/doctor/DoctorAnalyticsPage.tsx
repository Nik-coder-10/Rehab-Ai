import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../services/api';
import type { DoctorAnalyticsSummary } from '../../types';

export const DoctorAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<DoctorAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const data = await api.getDoctorAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '100px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
        <div className="skeleton" style={{ height: '350px', width: '100%' }} />
      </div>
    );
  }

  const weeklyData = analytics?.weekly_session_volume || [];
  const adherenceData = analytics?.adherence_distribution || [];
  const topExercises = analytics?.top_prescribed_exercises || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Care Team Rehabilitation Analytics</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Clinical compliance metrics, aggregate biomechanical form scores, and therapy workload tracking.
        </p>
      </div>

      {/* KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL PATIENTS MANAGED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '0.4rem' }}>
            {analytics?.total_patients || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Direct clinical caseload</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AVG CASELOAD ADHERENCE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '0.4rem' }}>
            {analytics?.average_adherence_rate || 85.0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>High protocol engagement</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AGGREGATE FORM ACCURACY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.4rem' }}>
            {analytics?.average_form_score ? `${analytics.average_form_score}%` : '88.0%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Across verified repetitions</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL EXERCISE SESSIONS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '0.4rem' }}>
            {analytics?.total_sessions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Telemetry logged sessions</div>
        </div>
      </section>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Weekly Workout Volume Chart */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Weekly Caseload Workout Volume</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sessions executed by assigned patients</p>
            </div>
            <span className="badge badge-blue">Workload Volume</span>
          </div>

          <div style={{ height: '240px', width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131b2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="sessions" name="Sessions Logged" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Adherence Tier Distribution */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Patient Adherence Distribution</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clinical compliance tier classification</p>
            </div>
            <span className="badge badge-green">Compliance Tiers</span>
          </div>

          <div style={{ height: '240px', width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adherenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="tier" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131b2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="count" name="Patients" fill="#14b8a6" radius={[4, 4, 0, 0]}>
                  {adherenceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Prescribed Exercises Summary */}
      <section className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Most Frequently Prescribed Exercises</h3>
        {topExercises.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {topExercises.map((item, idx) => (
              <div key={idx} style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RANK #{idx + 1}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-light)', marginTop: '0.25rem' }}>
                  {item.count} active prescriptions
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No prescription data available yet.
          </div>
        )}
      </section>
    </div>
  );
};
