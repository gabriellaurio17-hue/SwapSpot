import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  DashboardError,
  DashboardShell,
  DashboardStat,
} from '../components/DashboardShell';
import GcashQrSettings from '../components/GcashQrSettings';
import { useAuth } from '../context/AuthContext';
import { mapProfile } from '../lib/mappers';

const statVariants = {
  active: { borderColor: '#e2e8f0', textColor: '#1e293b' },
  suspended: { borderColor: '#fca5a5', textColor: '#b91c1c' },
};

function Profile() {
  const { profile, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mapped, setMapped] = useState(null);

  useEffect(() => {
    if (profile) {
      setMapped(mapProfile(profile));
    } else {
      setMapped(null);
    }
  }, [profile]);

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/');
  }, [signOut, navigate]);

  if (loading) {
    return (
      <main className="loading-screen" aria-label="Loading SwapSpot">
        <span className="loading-mark">S</span>
      </main>
    );
  }

  if (!mapped) {
    return (
      <DashboardShell
        label="ACCOUNT"
        nav={[{ id: 'profile', label: 'Profile', icon: '◌' }]}
        activeTab="profile"
        onTabChange={() => {}}
        eyebrow="CAMPUS COMMUNITY"
        title="Profile"
        user={{ initials: '?', name: 'Loading…', role: '' }}
        returnTo="/browse"
        returnLabel="Back to browse"
      >
        <DashboardError onRetry={() => {}} />
      </DashboardShell>
    );
  }

  const isSuspended = mapped.status === 'Suspended';
  const variant = isSuspended ? statVariants.suspended : statVariants.active;

  return (
    <DashboardShell
      label="ACCOUNT"
      nav={[{ id: 'profile', label: 'Profile', icon: '◌' }]}
      activeTab="profile"
      onTabChange={() => {}}
      eyebrow="CAMPUS COMMUNITY"
      title={<>My profile</>}
      user={mapped}
      returnTo="/browse"
      returnLabel="Back to browse"
    >
      {isSuspended && (
        <section className="dash-attention" aria-label="Account status" style={{ marginTop: 24 }}>
          <span className="dash-attention-icon" aria-hidden="true">!</span>
          <div>
            <strong>Account suspended</strong>
            <span>Your account has been suspended by an administrator.</span>
          </div>
          <button type="button" className="dash-attention-button" onClick={handleLogout}>
            Log out
          </button>
        </section>
      )}

      <section className="dash-stats" aria-label="Account overview" style={{ marginTop: isSuspended ? 16 : 0 }}>
        <>
          <DashboardStat
            icon="◌"
            label="Member since"
            value={mapped.memberSince}
            hint="Joined SwapSpot"
          />
          <DashboardStat
            icon="✉"
            label="Email"
            value={mapped.email}
            hint="CIT-U campus email"
          />
          <DashboardStat
            icon="◐"
            label="Campus role"
            value={mapped.role}
            hint={isSuspended ? 'Account suspended' : 'Campus community member'}
            style={{ borderColor: variant.borderColor }}
          />
          <DashboardStat
            icon="⚙️"
            label="Account status"
            value={mapped.status}
            hint="Account standing"
            attention={isSuspended}
            style={{ borderColor: variant.borderColor }}
          />
        </>
      </section>

      <section className="dash-card dash-profile-card" style={{ marginTop: 32, border: `1px solid ${variant.borderColor}`, borderRadius: 12, background: '#ffffff', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div className="dash-profile-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <span className="dash-section-eyebrow" style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>ACCOUNT DETAILS</span>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>Profile information</h2>
          </div>
          <button type="button" className="dash-outline-button" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8 }}>
            Log out
          </button>
        </div>

        <div className="dash-profile-list" style={{ padding: '24px' }}>
          <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ flex: 1 }}>
              <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Full name</span>
              <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mapped.name}</span>
            </div>
          </article>
          <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ flex: 1 }}>
              <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Email address</span>
              <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mapped.email}</span>
            </div>
          </article>
          <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ flex: 1 }}>
              <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Campus role</span>
              <span className="dash-profile-value" style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{mapped.role}</span>
            </div>
          </article>
          <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ flex: 1 }}>
              <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Account status</span>
              <span className={`dash-profile-value ${isSuspended ? 'dash-profile-suspended' : ''}`} style={{ fontSize: 15, fontWeight: 600, color: variant.textColor }}>
                {mapped.status}
              </span>
            </div>
          </article>
          <GcashQrSettings userId={user?.id} initialPath={profile?.gcash_qr_path} />
        </div>
      </section>

      <p className="browse-note" style={{ marginTop: 32, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
        Your GCash QR is shown to buyers with a transaction. Every member signs up with a CIT-U email.
      </p>
    </DashboardShell>
  );
}

export default Profile;