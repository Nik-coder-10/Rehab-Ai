import React, { useEffect, useState } from 'react';
import {
  Award,
  Building,
  CheckCircle,
  FileBadge,
  Mail,
  Save,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { DoctorProfile } from '../../types';

export const DoctorProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Form state
  const [specialization, setSpecialization] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await api.getDoctorProfile();
        setProfile(data);
        if (data.specialization) setSpecialization(data.specialization);
        if (data.organization) setOrganization(data.organization);
        if (data.license_number) setLicenseNumber(data.license_number);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await api.updateDoctorProfile({
        specialization,
        organization,
        license_number: licenseNumber,
      });
      setProfile(updated);
      setSuccessMsg('Physiotherapist profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '120px', width: '100%' }} />
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Physiotherapist Clinical Profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Professional physical therapy credentials, licensing details, and clinical organization affiliation.
        </p>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Account Info Header */}
      <section className="glass-panel" style={{ padding: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid #60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#93c5fd',
          }}
        >
          MD
        </div>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>{profile?.full_name || user?.full_name}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> {profile?.email || user?.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={14} /> Licensed Physical Therapist</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Award size={14} /> {profile?.patients_count || 0} Managed Patients
            </span>
          </div>
        </div>
      </section>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
          Professional Clinical Credentials
        </h3>

        <div className="form-group">
          <label className="form-label">Clinical Specialization</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. Orthopedic Rehabilitation & Sports Physical Therapy"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Stethoscope size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Clinic / Hospital / Organization</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. Apex Physical Therapy & Sports Medicine Institute"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Building size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Medical License / State Board Registry Number</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="PT-CA-984210"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <FileBadge size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
