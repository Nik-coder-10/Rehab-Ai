import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Mail,
  Ruler,
  Save,
  Shield,
  Weight,
} from 'lucide-react';
import { api } from '../services/api';
import type { PatientProfile } from '../types';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [medicalConditions, setMedicalConditions] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await api.getPatientProfile();
        setProfile(data);
        if (data.height_cm) setHeight(data.height_cm.toString());
        if (data.weight_kg) setWeight(data.weight_kg.toString());
        if (data.medical_conditions) setMedicalConditions(data.medical_conditions);
        if (data.notes) setNotes(data.notes);
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
      const updated = await api.updatePatientProfile({
        height_cm: height ? parseFloat(height) : undefined,
        weight_kg: weight ? parseFloat(weight) : undefined,
        medical_conditions: medicalConditions,
        notes: notes,
      });
      setProfile(updated);
      setSuccessMsg('Patient profile updated successfully.');
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

  const assignedDoctor = profile?.assigned_doctors && profile.assigned_doctors[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Patient Medical Profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Personal health details, clinical diagnosis, and assigned physiotherapist connection.
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
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            border: '2px solid var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff',
          }}
        >
          {profile?.full_name?.charAt(0) || 'P'}
        </div>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>{profile?.full_name}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> {profile?.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Shield size={14} /> Patient Verified</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} /> Registered {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
            </span>
          </div>
        </div>
      </section>

      {/* Biometrics & Medical Conditions Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
          Physical & Rehabilitation Attributes
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Height (cm)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.5"
                placeholder="180"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Ruler size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.5"
                placeholder="75"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Weight size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Diagnosed Medical Conditions / Surgical History</label>
          <textarea
            rows={3}
            value={medicalConditions}
            onChange={(e) => setMedicalConditions(e.target.value)}
            className="form-textarea"
            placeholder="e.g. Post-operative Right ACL Reconstruction, Meniscal Repair..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Patient Rehabilitation Notes & Symptoms</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-textarea"
            placeholder="Any current stiffness, range-of-motion limits, or doctor instructions..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Connected Care Team Section */}
      {assignedDoctor && (
        <section className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
            Connected Healthcare Provider
          </h3>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                color: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              MD
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{assignedDoctor.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary-light)' }}>{assignedDoctor.specialization}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {assignedDoctor.organization} • License: {assignedDoctor.license_number || 'PT-Verified'}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
