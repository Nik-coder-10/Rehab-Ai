import React, { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface PatientTriage {
  patient_id: string;
  patient_name: string;
  active_plan_name: string;
  recovery_score: number;
  recovery_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
  adherence_percentage: number;
  priority: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA';
  active_alerts: string[];
  pending_recommendations_count: number;
  total_sessions_completed: number;
  last_session_date: string | null;
}

interface IntelligenceData {
  total_active_patients: number;
  improving_patients_count: number;
  stable_patients_count: number;
  needs_attention_count: number;
  insufficient_data_count: number;
  pending_recommendations_count: number;
  recent_alerts_count: number;
  patients: PatientTriage[];
}

export const DoctorIntelligencePage: React.FC = () => {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDoctorIntelligence();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '100px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
        </div>
        <div className="skeleton" style={{ height: '380px', width: '100%' }} />
      </div>
    );
  }

  const filteredPatients = (data?.patients || []).filter((p) => {
    const matchesPriority = filterPriority === 'ALL' || p.priority === filterPriority;
    const matchesSearch =
      p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.active_plan_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Brain size={28} color="var(--primary-light)" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Doctor Clinical Intelligence Center</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Deterministic patient triage, AI-assisted telemetry digests, and adaptive protocol recommendations.
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          <RefreshCw size={16} /> Refresh Triage
        </button>
      </div>

      {/* KPI Triage Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div
          className="glass-panel"
          onClick={() => setFilterPriority('ALL')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            border: filterPriority === 'ALL' ? '2px solid var(--primary-light)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE PATIENTS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '0.3rem' }}>
            {data?.total_active_patients || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Under direct supervision</div>
        </div>

        <div
          className="glass-panel"
          onClick={() => setFilterPriority('NEEDS_ATTENTION')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            border: filterPriority === 'NEEDS_ATTENTION' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>NEEDS ATTENTION</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '0.3rem' }}>
            {data?.needs_attention_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Declining or low adherence</div>
        </div>

        <div
          className="glass-panel"
          onClick={() => setFilterPriority('IMPROVING')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            border: filterPriority === 'IMPROVING' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>IMPROVING RECOVERY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
            {data?.improving_patients_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>High compliance & gains</div>
        </div>

        <div
          className="glass-panel"
          onClick={() => setFilterPriority('STABLE')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            border: filterPriority === 'STABLE' ? '2px solid #60a5fa' : '1px solid rgba(96, 165, 250, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>STABLE TRAJECTORY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.3rem' }}>
            {data?.stable_patients_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Consistent performance</div>
        </div>
      </section>

      {/* Patient Triage Table Panel */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Patient Clinical Triage & Telemetry Roster</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Deterministic prioritization based on form accuracy, ROM envelope, adherence, and active alerts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search patient or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', paddingRight: '12px', fontSize: '0.85rem', height: '36px' }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>PATIENT NAME</th>
                <th style={{ padding: '0.75rem 1rem' }}>ACTIVE PRESCRIPTION</th>
                <th style={{ padding: '0.75rem 1rem' }}>RECOVERY SCORE</th>
                <th style={{ padding: '0.75rem 1rem' }}>ADHERENCE</th>
                <th style={{ padding: '0.75rem 1rem' }}>TRIAGE STATUS</th>
                <th style={{ padding: '0.75rem 1rem' }}>ACTIVE ALERTS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No patient records matched the selected triage filter.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  let badgeClass = 'badge badge-teal';
                  if (p.priority === 'IMPROVING') badgeClass = 'badge badge-green';
                  if (p.priority === 'NEEDS_ATTENTION') badgeClass = 'badge badge-red';
                  if (p.priority === 'STABLE') badgeClass = 'badge badge-teal';

                  return (
                    <tr
                      key={p.patient_id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(20, 184, 166, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <User size={16} color="var(--primary-light)" />
                          </div>
                          <span>{p.patient_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.active_plan_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#ffffff' }}>{p.recovery_score}/100</span>
                          {p.recovery_trend === 'IMPROVING' && <TrendingUp size={14} color="#10b981" />}
                          {p.recovery_trend === 'DECLINING' && <TrendingDown size={14} color="#ef4444" />}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                        {p.adherence_percentage}%
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={badgeClass}>{p.priority.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {p.active_alerts.length === 0 ? (
                          <span style={{ color: '#10b981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={14} /> Clear
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {p.active_alerts.map((alt, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                              >
                                {alt}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <Link
                          to={`/doctor/patients/${p.patient_id}`}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          Review Chart <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
