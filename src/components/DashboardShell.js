import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export function DashboardShell({ label, nav, activeTab, onTabChange, eyebrow, title, user, returnTo, returnLabel, children }) {
  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <Link to="/" className="dash-brand" aria-label="SwapSpot home"><Logo variant="dark" /></Link>
        <span className="dash-sidebar-label">{label}</span>
        <nav className="dash-nav" aria-label={`${label} navigation`}>
          {nav.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={activeTab === item.id ? 'active' : ''}
              onClick={() => onTabChange(item.id)}
            >
              <span className="dash-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.count !== undefined && <span className="dash-count">{item.count}</span>}
            </button>
          ))}
        </nav>
        <span className="dash-sidebar-spacer" />
        <Link className="dash-sidebar-return" to={returnTo}>← {returnLabel}</Link>
      </aside>

      <main className="dash-main">
        <div className="dash-bg" aria-hidden="true">
          <span className="dash-bg-guide dash-bg-guide-left" />
          <span className="dash-bg-guide dash-bg-guide-right" />
          <span className="dash-bg-guide dash-bg-guide-lines" />
          <span className="dash-bg-guide dash-bg-guide-horizontal" />
        </div>
        <div className="dash-content">
          <header className="dash-header">
            <div className="dash-heading">
              <span className="dash-eyebrow">{eyebrow}</span>
              <h1>{title}</h1>
            </div>
            <AvatarMenu user={user} returnTo={returnTo} returnLabel={returnLabel} />
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

function AvatarMenu({ user, returnTo, returnLabel }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    signOut();
    navigate('/');
  };

  return (
    <div className="dash-account" ref={menuRef}>
      <button
        type="button"
        className="dash-account-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="dash-account-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dash-avatar">{user.initials}</span>
        <span className="dash-account-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
        <span className="dash-account-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="dash-account-menu" id="dash-account-menu" role="menu" aria-label="Account menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/auth?mode=login'); }}>Account settings</button>
          <Link to={returnTo} role="menuitem" onClick={() => setOpen(false)}>{returnLabel}</Link>
          <button type="button" role="menuitem" className="dash-menu-logout" onClick={handleLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export function DashboardStat({ icon, label, value, hint, attention = false, onClick }) {
  return (
    <button type="button" className={`dash-stat${attention ? ' dash-stat-attention' : ''}`} onClick={onClick}>
      <span className="dash-stat-icon" aria-hidden="true">{icon}</span>
      <span className="dash-stat-label">{label}</span>
      <strong className="dash-stat-value">{value}</strong>
      <span className="dash-stat-hint">{hint}</span>
    </button>
  );
}

export function DashboardStatSkeleton() {
  return <div className="dash-stat dash-skeleton-card" aria-hidden="true"><span /><span /><span /><span /></div>;
}

export function DashboardRowSkeleton() {
  return <div className="dash-row-skeleton" aria-hidden="true"><span /><span /><span /></div>;
}

export function DashboardError({ onRetry }) {
  return (
    <div className="dash-error" role="alert">
      <span>We couldn’t load this dashboard data.</span>
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}
