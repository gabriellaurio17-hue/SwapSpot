import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DashboardError,
  DashboardRowSkeleton,
  DashboardShell,
  DashboardStat,
  DashboardStatSkeleton,
} from '../components/DashboardShell';
import Illustration from '../components/Illustration';
import { useAuth } from '../context/AuthContext';
import { reports as initialReports } from '../data/mock';
import { API_BASE_URL } from '../utils/api';

const reportContext = {
  'report-1': {
    age: '2 days',
    note: 'Listing says “works perfectly” but the cable is frayed in the photo.',
    seller: 'USR-2291',
    priorReports: 1,
    price: '₱150',
    art: 'multimeter',
  },
  'report-2': {
    age: '3 days',
    note: 'These look like scanned pages from a published textbook.',
    seller: 'USR-1180',
    priorReports: 0,
    price: '₱90',
    art: 'book',
  },
};

const initialAuditLog = [
  { id: 'audit-1', time: 'Oct 16, 2026 · 14:32', admin: 'admin@cit.edu', action: 'Approved shop', target: 'Engineering Student Council' },
];

const decisions = [
  ['Take down listing', 'Hides the listing. The seller is notified.'],
  ['Suspend account', 'Blocks login. Can be reinstated later.'],
  ['Dismiss report', 'No violation found.'],
];

const roleOptions = ['Student', 'StoreOwner', 'Admin'];

function Admin() {
  const { user } = useAuth();
  const adminLabel = user?.email || 'admin@cit.edu';

  const [activeTab, setActiveTab] = useState('reports');
  const [openReports, setOpenReports] = useState(initialReports);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ activeMembers: 0, totalMembers: 0, liveListings: 0, totalTransactions: 0 });
  const [roleDrafts, setRoleDrafts] = useState({});
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [resolvingShopId, setResolvingShopId] = useState('');
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [selectedId, setSelectedId] = useState(initialReports[0]?.id ?? '');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Loads live platform stats, pending org shops, and registered CIT-U accounts from AdminController.
  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      // GET /api/Admin/overview — reads live Users/Listings/Transactions counts and Pending Shops.
      // GET /api/Admin/users — reads all registered accounts from the Users table.
      const [overviewRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Admin/overview`),
        fetch(`${API_BASE_URL}/api/Admin/users`),
      ]);

      if (!overviewRes.ok || !usersRes.ok) throw new Error('Failed to load admin data');

      const overviewData = await overviewRes.json();
      const usersData = await usersRes.json();

      setStats({
        activeMembers: Number(overviewData.activeMembers ?? 0),
        totalMembers: Number(overviewData.totalMembers ?? 0),
        liveListings: Number(overviewData.liveListings ?? 0),
        totalTransactions: Number(overviewData.totalTransactions ?? 0),
      });

      const shops = Array.isArray(overviewData.pendingShops) ? overviewData.pendingShops : [];
      setPendingApplications(shops.map((s) => ({
        id: s.shopId,
        name: s.shopName,
        contact: s.ownerEmail || 'CIT-U Org',
        submitted: 'Pending review',
      })));

      const userList = Array.isArray(usersData) ? usersData : [];
      setUsers(userList);
      setRoleDrafts(Object.fromEntries(userList.map((u) => [u.userId, u.role])));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedReport = useMemo(
    () => openReports.find((report) => report.id === selectedId) ?? openReports[0] ?? null,
    [openReports, selectedId],
  );

  const handleSelectReport = (id) => {
    setSelectedId(id);
    setDecision('');
    setReason('');
  };

  const handleQueueKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
    if (!options.length) return;

    event.preventDefault();
    const currentIndex = options.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    else if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;
    else nextIndex = currentIndex < 0 ? options.length - 1 : (currentIndex - 1 + options.length) % options.length;

    options[nextIndex].focus();
    handleSelectReport(options[nextIndex].dataset.reportId);
  };

  const handleDecision = (event) => setDecision(event.target.value);

  const confirmDecision = (event) => {
    event.preventDefault();
    if (!selectedReport || !decision || reason.trim().length < 5) return;

    const when = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    setAuditLog((current) => [{
      id: `audit-${Date.now()}`,
      time: when,
      admin: adminLabel,
      action: decision,
      target: selectedReport.item,
      reason: reason.trim(),
    }, ...current]);

    const remaining = openReports.filter((report) => report.id !== selectedReport.id);
    setOpenReports(remaining);
    setSelectedId(remaining[0]?.id ?? '');
    setDecision('');
    setReason('');
    setToast(`${decision} recorded in the audit log as ${adminLabel}`);
  };

  // PATCH /api/Admin/shops/{shopId}/approve (Approve) or DELETE /api/Admin/shops/{shopId} (Reject).
  const resolveApplication = async (application, action) => {
    setResolvingShopId(application.id);
    const isApprove = action === 'Approved shop';
    const url = isApprove
      ? `${API_BASE_URL}/api/Admin/shops/${encodeURIComponent(application.id)}/approve`
      : `${API_BASE_URL}/api/Admin/shops/${encodeURIComponent(application.id)}`;

    try {
      const res = await fetch(url, { method: isApprove ? 'PATCH' : 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update shop application');

      setPendingApplications((current) => current.filter((item) => item.id !== application.id));
      setAuditLog((current) => [{
        id: `audit-${Date.now()}`,
        time: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
        admin: adminLabel,
        action,
        target: application.name,
      }, ...current]);
      setToast(data.message || `${action}: ${application.name}`);
    } catch {
      setLoadError(true);
    } finally {
      setResolvingShopId('');
    }
  };

  // PATCH /api/Admin/users/{userId}/role — promotes/updates a user's Role in SQL Server and emails their Outlook inbox.
  const handleUpdateUserRole = async (targetUser) => {
    const nextRole = roleDrafts[targetUser.userId] || targetUser.role;
    if (nextRole === targetUser.role) return;

    setUpdatingUserId(targetUser.userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Admin/users/${encodeURIComponent(targetUser.userId)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update role');

      setUsers((current) => current.map((u) => (
        u.userId === targetUser.userId ? { ...u, role: data.role || nextRole } : u
      )));
      setAuditLog((current) => [{
        id: `audit-${Date.now()}`,
        time: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
        admin: adminLabel,
        action: `Changed role (${targetUser.role} → ${nextRole})`,
        target: targetUser.email,
      }, ...current]);
      setToast(data.message || `${targetUser.email} updated to ${nextRole}`);
    } catch {
      setLoadError(true);
    } finally {
      setUpdatingUserId('');
    }
  };

  const nav = [
    { id: 'reports', label: 'Reports', icon: '!', count: openReports.length },
    { id: 'applications', label: 'Shop applications', icon: '▣', count: pendingApplications.length },
    { id: 'members', label: 'Members & roles', icon: '✓', count: users.length },
    { id: 'audit', label: 'Audit log', icon: '▤' },
  ];

  return (
    <DashboardShell
      label="WORKSPACE"
      nav={nav}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      eyebrow="SWAPSPOT OPERATIONS"
      title={<>Good afternoon, <em>Admin.</em></>}
      user={{ initials: 'AD', name: adminLabel, role: 'Administrator' }}
      returnTo="/"
      returnLabel="Return to marketplace"
    >
      {toast && <div className="dash-toast" role="status">✓ {toast}</div>}
      {loadError && <DashboardError onRetry={loadAdminData} />}

      <section className="dash-stats" aria-label="Admin overview">
        {isLoading ? (
          <>
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
          </>
        ) : (
          <>
            <DashboardStat icon="⚑" label="Open reports" value={openReports.length} hint="Moderation queue" attention={openReports.length > 0} onClick={() => setActiveTab('reports')} />
            <DashboardStat icon="▣" label="Shop applications" value={pendingApplications.length} hint="Pending approval" onClick={() => setActiveTab('applications')} />
            <DashboardStat icon="✓" label="Verified members" value={stats.activeMembers} hint={`${stats.totalMembers} total accounts`} onClick={() => setActiveTab('members')} />
            <DashboardStat icon="↗" label="Listings live" value={stats.liveListings} hint={`${stats.totalTransactions} transactions`} onClick={() => setActiveTab('audit')} />
          </>
        )}
      </section>

      {activeTab === 'reports' && (
        isLoading ? (
          <section className="dash-report-split" aria-label="Loading report queue">
            <div className="dash-card dash-queue"><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></div>
            <div className="dash-card dash-review"><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></div>
          </section>
        ) : openReports.length === 0 ? (
          <section className="dash-empty dash-card">
            <span className="dash-empty-icon" aria-hidden="true">✓</span>
            <h2>Queue is clear</h2>
            <p>New reports will appear here.</p>
          </section>
        ) : (
          <section className="dash-report-split">
            <div className="dash-card dash-queue" role="listbox" aria-label="Report queue" onKeyDown={handleQueueKeyDown}>
              <span className="dash-section-eyebrow">Queue · oldest first</span>
              {openReports.map((report) => {
                const context = reportContext[report.id] ?? {};
                const selected = selectedReport?.id === report.id;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    data-report-id={report.id}
                    className={`dash-queue-row${selected ? ' selected' : ''}`}
                    key={report.id}
                    onClick={() => handleSelectReport(report.id)}
                  >
                    <span className="dash-report-thumb"><Illustration type={context.art ?? 'book'} /></span>
                    <span className="dash-queue-copy">
                      <strong>{report.item}</strong>
                      <span>{report.reason}</span>
                    </span>
                    <span className="dash-age">{context.age ?? 'New'}</span>
                  </button>
                );
              })}
            </div>

            {selectedReport && (
              <article className="dash-card dash-review">
                {(() => {
                  const context = reportContext[selectedReport.id] ?? {};
                  const reporterParts = selectedReport.reporter.split(' · ');
                  return (
                    <>
                      <span className="dash-section-eyebrow">Report review</span>
                      <div className="dash-review-item">
                        <span className="dash-report-thumb dash-report-thumb-large"><Illustration type={context.art ?? 'book'} /></span>
                        <div>
                          <h2>{selectedReport.item}</h2>
                          <p>{context.price ?? 'Price not provided'} · Seller {context.seller ?? 'USR-0000'} · {context.priorReports ?? 0} prior reports</p>
                        </div>
                      </div>
                      <blockquote className="dash-report-note">
                        “{context.note ?? selectedReport.reason}”
                        <small>Reported by {reporterParts[0]} · {reporterParts[1] ?? context.age ?? 'Recently'}</small>
                      </blockquote>
                      <form onSubmit={confirmDecision}>
                        <fieldset className="dash-decisions">
                          <legend>Decision</legend>
                          {decisions.map(([label, explanation]) => (
                            <label className={`dash-decision${decision === label ? ' selected' : ''}`} key={label}>
                              <input type="radio" name="report-decision" value={label} checked={decision === label} onChange={handleDecision} />
                              <span><strong>{label}</strong><small>{explanation}</small></span>
                            </label>
                          ))}
                        </fieldset>
                        <label className="dash-reason">
                          <span>Reason (saved to the audit log)</span>
                          <textarea
                            rows="2"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Briefly explain your decision"
                            minLength={5}
                            required
                          />
                        </label>
                        <button className="dash-primary-button" type="submit" disabled={!decision || reason.trim().length < 5}>
                          Confirm &amp; log decision
                        </button>
                      </form>
                    </>
                  );
                })()}
              </article>
            )}
          </section>
        )
      )}

      {activeTab === 'applications' && (
        <section className="dash-card dash-list-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">Grow the community</span><h2>Shop applications</h2></div>
            <span className="dash-count-light">{pendingApplications.length} pending</span>
          </div>
          {isLoading ? (
            <><DashboardRowSkeleton /><DashboardRowSkeleton /></>
          ) : pendingApplications.length ? (
            pendingApplications.map((application) => (
              <div className="dash-application-row" key={application.id}>
                <span className="dash-application-mark">{application.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span>
                <span className="dash-application-copy">
                  <strong>{application.name}</strong>
                  <span>{application.contact} · {application.submitted}</span>
                </span>
                <span className="dash-row-actions">
                  <button
                    type="button"
                    className="dash-primary-button dash-small-button"
                    disabled={resolvingShopId === application.id}
                    onClick={() => resolveApplication(application, 'Approved shop')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="dash-quiet-button"
                    disabled={resolvingShopId === application.id}
                    onClick={() => resolveApplication(application, 'Rejected shop')}
                  >
                    Reject
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="dash-empty-list"><strong>No pending applications</strong><span>New shop applications will show up here.</span></div>
          )}
        </section>
      )}

      {activeTab === 'members' && (
        <section className="dash-card dash-list-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">ACCESS CONTROL</span><h2>Members &amp; roles</h2></div>
            <span className="dash-count-light">{users.length} accounts</span>
          </div>
          {isLoading ? (
            <><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></>
          ) : users.length ? (
            users.map((member) => {
              const selectedRole = roleDrafts[member.userId] || member.role;
              const isChanged = selectedRole !== member.role;
              const isSavingRole = updatingUserId === member.userId;
              return (
                <div className="dash-application-row" key={member.userId}>
                  <span className="dash-application-mark">{member.email.slice(0, 2).toUpperCase()}</span>
                  <span className="dash-application-copy">
                    <strong>{member.email}</strong>
                    <span>{member.isEmailVerified ? '✓ Verified @cit.edu' : 'Unverified'} · Current role: {member.role}</span>
                  </span>
                  <span className="dash-row-actions">
                    <select
                      aria-label={`Role for ${member.email}`}
                      value={selectedRole}
                      onChange={(event) => setRoleDrafts((prev) => ({ ...prev, [member.userId]: event.target.value }))}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d9d0c3' }}
                    >
                      {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                      type="button"
                      className="dash-primary-button dash-small-button"
                      disabled={!isChanged || isSavingRole}
                      onClick={() => handleUpdateUserRole(member)}
                    >
                      {isSavingRole ? 'Saving...' : 'Update role'}
                    </button>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="dash-empty-list"><strong>No members found</strong><span>Registered CIT-U accounts will appear here.</span></div>
          )}
        </section>
      )}

      {activeTab === 'audit' && (
        <section className="dash-card dash-list-card">
          <div className="dash-list-heading">
            <div><span className="dash-section-eyebrow">Accountability</span><h2>Audit log</h2></div>
            <span className="dash-readonly-label">Read only</span>
          </div>
          {isLoading ? (
            <><DashboardRowSkeleton /><DashboardRowSkeleton /><DashboardRowSkeleton /></>
          ) : auditLog.length ? (
            <div className="dash-audit-table" role="table" aria-label="Read-only audit log">
              <div className="dash-audit-row dash-audit-head" role="row">
                <span>Time</span><span>Admin</span><span>Action</span><span>Target</span>
              </div>
              {auditLog.map((entry) => (
                <div className="dash-audit-row" role="row" key={entry.id}>
                  <span>{entry.time}</span>
                  <span>{entry.admin}</span>
                  <span><strong>{entry.action}</strong>{entry.reason && <small>Reason: {entry.reason}</small>}</span>
                  <span>{entry.target}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty-list"><strong>No audit entries yet</strong><span>Recorded decisions will appear here.</span></div>
          )}
          <p className="dash-readonly-note">Read-only. Entries cannot be edited or deleted.</p>
        </section>
      )}
    </DashboardShell>
  );
}

export default Admin;
