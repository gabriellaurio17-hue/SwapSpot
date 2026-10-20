import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Logo from '../components/Logo';
import { applications, reports } from '../data/mock';

function Admin() {
  const [activeSection, setActiveSection] = useState('Reports');
  const [resolvedReports, setResolvedReports] = useState([]);
  const [resolvedApplications, setResolvedApplications] = useState([]);
  const openReports = useMemo(() => reports.filter((report) => !resolvedReports.includes(report.id)), [resolvedReports]);
  const pendingApplications = useMemo(() => applications.filter((application) => !resolvedApplications.includes(application.id)), [resolvedApplications]);
  const resolveReport = useCallback((id) => setResolvedReports((current) => current.includes(id) ? current : [...current, id]), []);
  const resolveApplication = useCallback((id) => setResolvedApplications((current) => current.includes(id) ? current : [...current, id]), []);
  return (
    <main className="admin-layout">
      {/* This route must be guarded by role in the real app. */}
      <aside className="admin-sidebar"><Link to="/" className="admin-brand"><Logo variant="dark" /></Link><span className="admin-label">WORKSPACE</span><nav aria-label="Admin sections">{['Reports', 'Shop applications', 'Accounts', 'Listings'].map((section) => <button type="button" key={section} className={activeSection === section ? 'active' : ''} onClick={() => setActiveSection(section)}><span className="admin-nav-icon" aria-hidden="true">{section === 'Reports' ? '!' : section === 'Shop applications' ? '▣' : section === 'Accounts' ? '◉' : '▤'}</span>{section}{section === 'Reports' && <span className="nav-counter">2</span>}</button>)}</nav><div className="admin-only"><span className="lock-symbol">▣</span><strong>Admin only</strong><p>This workspace is for authorized SwapSpot administrators.</p></div><Link to="/" className="admin-exit">← Return to marketplace</Link></aside>
      <section className="admin-content"><header className="admin-header"><div><span className="eyebrow">SwapSpot operations</span><h1>Good afternoon, <em>Admin.</em></h1></div><div className="admin-profile"><span className="avatar admin-avatar">AD</span><span><strong>SwapSpot Admin</strong><small>Administrator</small></span></div></header>
        <div className="admin-stats"><article className="stat-card"><span className="stat-icon">⚑</span><span className="stat-label">Open reports</span><strong>{openReports.length}</strong><small>Needs review</small></article><article className="stat-card"><span className="stat-icon stat-gold">▣</span><span className="stat-label">Shop applications</span><strong>{pendingApplications.length}</strong><small>Pending approval</small></article><article className="stat-card"><span className="stat-icon stat-green">✓</span><span className="stat-label">Active members</span><strong>1,284</strong><small>Verified @cit.edu</small></article><article className="stat-card"><span className="stat-icon stat-blue">↗</span><span className="stat-label">Listings live</span><strong>346</strong><small>Across campus</small></article></div>
        <div className="admin-panels"><section className="admin-panel card"><div className="admin-panel-heading"><div><span className="eyebrow">Community safety</span><h2>Reported items</h2></div><span className="count-pill">{openReports.length} open</span></div>{openReports.map((report) => <article className="moderation-row" key={report.id}><span className="report-symbol">!</span><div className="moderation-copy"><h3>{report.item}</h3><p>{report.reason}</p><small>Reported by {report.reporter}</small></div><div className="moderation-actions"><button type="button" className="btn btn-danger-quiet" onClick={() => resolveReport(report.id)}>Take down</button><button type="button" className="text-action" onClick={() => resolveReport(report.id)}>Suspend</button><button type="button" className="text-action" onClick={() => resolveReport(report.id)}>Dismiss</button></div></article>)}{!openReports.length && <p className="admin-empty">All reports have been reviewed. Thank you for keeping the community safe.</p>}</section>
          <section className="admin-panel card"><div className="admin-panel-heading"><div><span className="eyebrow">Grow the community</span><h2>Shop applications</h2></div><span className="count-pill">{pendingApplications.length} pending</span></div>{pendingApplications.map((application) => <article className="application-row" key={application.id}><span className="application-mark">{application.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><div className="moderation-copy"><h3>{application.name}</h3><p>{application.contact}</p><small>Submitted {application.submitted}</small></div><div className="application-actions"><button type="button" className="btn btn-primary btn-small" onClick={() => resolveApplication(application.id)}>Approve</button><button type="button" className="text-action" onClick={() => resolveApplication(application.id)}>Reject</button></div></article>)}{!pendingApplications.length && <p className="admin-empty">No applications are waiting for review.</p>}</section></div>
        <p className="admin-footer-note"><span>i</span> All moderation actions should be documented and follow the SwapSpot community guidelines.</p>
      </section>
    </main>
  );
}

export default Admin;