import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DashboardRowSkeleton,
  DashboardShell,
  DashboardStat,
  DashboardStatSkeleton,
} from '../components/DashboardShell';
import Illustration from '../components/Illustration';
import { useAuth } from '../context/AuthContext';
import {
  mapAdminApplication,
  mapAdminAuditEntry,
  mapAdminReport,
  mapProfile,
} from '../lib/mappers';
import { supabase } from '../lib/supabaseClient';

const decisions = [
  ['Remove listing', 'Resolve the report and remove the listing.'],
  ['Suspend user', 'Suspend the user associated with this report.'],
  ['Dismiss', 'No violation found.'],
];

function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [openReports, setOpenReports] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [applicationReasons, setApplicationReasons] = useState({});
  const [memberCount, setMemberCount] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [mappedAdmin, setMappedAdmin] = useState(null);

  useEffect(() => {
    if (profile) {
      setMappedAdmin(mapProfile(profile));
    } else {
      setMappedAdmin(null);
    }
  }, [profile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedReport = useMemo(
    () => openReports.find((report) => report.id === selectedId) ?? openReports[0] ?? null,
    [openReports, selectedId],
  );

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [
        { data: reportRows, error: reportsError },
        { data: applicationRows, error: applicationsError },
        { data: auditRows, error: auditError },
        { count: activeMembers, error: membersError },
        { count: liveListings, error: listingsCountError },
      ] = await Promise.all([
        supabase.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: true }),
        supabase.from('shops').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      ]);
      if (reportsError) throw reportsError;
      if (applicationsError) throw applicationsError;
      if (auditError) throw auditError;
      if (membersError) throw membersError;
      if (listingsCountError) throw listingsCountError;

      const reports = reportRows || [];
      const applications = applicationRows || [];
      const auditEntries = auditRows || [];
      const listingIds = [...new Set(reports.map((report) => report.target_listing_id).filter(Boolean))];
      const profileIds = [...new Set([
        ...reports.map((report) => report.reporter_id),
        ...reports.map((report) => report.target_user_id),
        ...applications.map((application) => application.owner_id),
        ...auditEntries.map((entry) => entry.actor_id),
      ].filter(Boolean))];

      const [listingResult, profileResult] = await Promise.all([
        listingIds.length
          ? supabase.from('listings').select('id, title, seller_id, category').in('id', listingIds)
          : Promise.resolve({ data: [], error: null }),
        profileIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (listingResult.error) throw listingResult.error;
      if (profileResult.error) throw profileResult.error;

      const listingById = new Map((listingResult.data || []).map((listing) => [listing.id, listing]));
      const profileById = new Map((profileResult.data || []).map((person) => [person.id, person]));
      setOpenReports(reports.map((report) => mapAdminReport(
        report,
        listingById.get(report.target_listing_id),
        profileById.get(report.reporter_id),
      )));
      setPendingApplications(applications.map((application) => mapAdminApplication(
        application,
        profileById.get(application.owner_id),
      )));
      setAuditLog(auditEntries.map((entry) => mapAdminAuditEntry(
        entry,
        profileById.get(entry.actor_id),
      )));
      setMemberCount(activeMembers || 0);
      setListingCount(liveListings || 0);
      setSelectedId((current) => (
        reports.some((report) => report.id === current)
          ? current
          : reports[0]?.id ?? ''
      ));
    } catch (error) {
      setLoadError(error.message || 'Could not load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleRetry = () => fetchAdminData();

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

  const handleDecision = (event) => {
    setDecision(event.target.value);
    setActionError('');
  };

  const confirmDecision = async (event) => {
    event.preventDefault();
    const note = reason.trim();
    if (!selectedReport || !decision || note.length < 5) {
      setActionError('Choose a decision and enter a reason of at least 5 characters.');
      return;
    }

    setActionLoading(`report-${selectedReport.id}`);
    setActionError('');
    let userSuspended = false;
    try {
      if (decision === 'Dismiss') {
        const { error } = await supabase.rpc('admin_resolve_report', {
          p_report: selectedReport.id,
          p_status: 'dismissed',
          p_note: note,
        });
        if (error) throw error;
      } else if (decision === 'Remove listing') {
        if (!selectedReport.targetListingId) throw new Error('This report has no listing to remove.');
        const { error } = await supabase.rpc('admin_resolve_report', {
          p_report: selectedReport.id,
          p_status: 'resolved',
          p_note: note,
          p_remove_listing: true,
        });
        if (error) throw error;
      } else if (decision === 'Suspend user') {
        if (!selectedReport.targetUserId) throw new Error('This report has no associated user to suspend.');
        const { error: suspendError } = await supabase.rpc('admin_set_user_status', {
          p_user: selectedReport.targetUserId,
          p_status: 'suspended',
          p_reason: note,
        });
        if (suspendError) throw suspendError;
        userSuspended = true;

        const { error: resolveError } = await supabase.rpc('admin_resolve_report', {
          p_report: selectedReport.id,
          p_status: 'resolved',
          p_note: note,
        });
        if (resolveError) throw resolveError;
      }

      setReason('');
      setDecision('');
      setToast(`${decision} completed.`);
      await fetchAdminData();
    } catch (error) {
      setActionError(userSuspended
        ? `User was suspended, but the report could not be resolved: ${error.message}`
        : error.message || 'Could not apply this decision.');
    } finally {
      setActionLoading('');
    }
  };

  const resolveApplication = async (application, status) => {
    const applicationReason = (applicationReasons[application.id] || '').trim();
    if (applicationReason.length < 5) {
      setActionError('Enter a reason of at least 5 characters before deciding on an application.');
      return;
    }
    setActionLoading(`shop-${application.id}`);
    setActionError('');
    try {
      const { error } = await supabase.rpc('admin_set_shop_status', {
        p_shop: application.id,
        p_status: status,
        p_reason: applicationReason,
      });
      if (error) throw error;
      setApplicationReasons((current) => ({ ...current, [application.id]: '' }));
      setToast(`Shop ${status}.`);
      await fetchAdminData();
    } catch (error) {
      setActionError(error.message || 'Could not update this shop application.');
    } finally {
      setActionLoading('');
    }
  };

  const nav = [
    { id: 'reports', label: 'Reports', icon: '!', count: openReports.length },
    { id: 'applications', label: 'Shop applications', icon: '▣', count: pendingApplications.length },
    { id: 'audit', label: 'Audit log', icon: '▤' },
    { id: 'account', label: 'Account', icon: '◌' },
  ];

  return (
    <DashboardShell
      label="WORKSPACE"
      nav={nav}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      eyebrow="SWAPSPOT OPERATIONS"
      title={<>Good afternoon, <em>Admin.</em></>}
      user={{ initials: 'AD', name: 'SwapSpot Admin', role: 'Administrator' }}
      returnTo="/"
      returnLabel="Return to marketplace"
    >
      {toast && <div className="dash-toast" role="status">✓ {toast}</div>}
      {loadError && (
        <div className="dash-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={handleRetry}>Try again</button>
        </div>
      )}

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
            <DashboardStat icon="⚑" label="Open reports" value={openReports.length} hint="Awaiting review" attention onClick={() => setActiveTab('reports')} />
            <DashboardStat icon="▣" label="Shop applications" value={pendingApplications.length} hint="Awaiting approval" onClick={() => setActiveTab('applications')} />
            <DashboardStat icon="✓" label="Active members" value={memberCount.toLocaleString()} hint="Current active accounts" onClick={() => setActiveTab('audit')} />
            <DashboardStat icon="↗" label="Listings live" value={listingCount.toLocaleString()} hint="Currently available" onClick={() => setActiveTab('reports')} />
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
                    <span className="dash-report-thumb"><Illustration type={report.art} /></span>
                    <span className="dash-queue-copy">
                      <strong>{report.item}</strong>
                      <span>{report.reason}</span>
                    </span>
                    <span className="dash-age">{report.createdAt}</span>
                  </button>
                );
              })}
            </div>

            {selectedReport && (
              <article className="dash-card dash-review">
                <span className="dash-section-eyebrow">Report review</span>
                <div className="dash-review-item">
                  <span className="dash-report-thumb dash-report-thumb-large"><Illustration type={selectedReport.art} /></span>
                  <div>
                    <h2>{selectedReport.item}</h2>
                    <p>{selectedReport.targetUserId ? `Reported account: ${selectedReport.targetUserId}` : 'No associated account found'}</p>
                  </div>
                </div>
                <blockquote className="dash-report-note">
                  “{selectedReport.reason}”
                  <small>Reported by {selectedReport.reporter} · {selectedReport.createdAt}</small>
                </blockquote>
                <form onSubmit={confirmDecision}>
                  <fieldset className="dash-decisions">
                    <legend>Decision</legend>
                    {decisions.map(([label, explanation]) => (
                      <label className={`dash-decision${decision === label ? ' selected' : ''}`} key={label}>
                        <input
                          type="radio"
                          name="report-decision"
                          value={label}
                          checked={decision === label}
                          onChange={handleDecision}
                          disabled={label === 'Remove listing' ? !selectedReport.targetListingId : label === 'Suspend user' ? !selectedReport.targetUserId : false}
                        />
                        <span><strong>{label}</strong><small>{explanation}</small></span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="dash-reason">
                    <span>Reason (saved to the audit log)</span>
                    <textarea
                      rows="2"
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                        setActionError('');
                      }}
                      placeholder="Briefly explain your decision"
                      minLength={5}
                      required
                    />
                  </label>
                  {actionError && <p className="field-error" role="alert">{actionError}</p>}
                  <button className="dash-primary-button" type="submit" disabled={!decision || reason.trim().length < 5 || Boolean(actionLoading)}>
                    {actionLoading === `report-${selectedReport.id}` ? 'Applying decision…' : 'Confirm & log decision'}
                  </button>
                </form>
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
                  <span>{application.shopType === 'organization' ? 'Organization' : 'Individual'} · {application.ownerName} · Submitted {application.submitted}</span>
                  {application.description && <span>{application.description}</span>}
                </span>
                <div>
                  <label className="dash-reason">
                    <span>Decision reason (required)</span>
                    <textarea
                      rows="2"
                      value={applicationReasons[application.id] || ''}
                      onChange={(event) => {
                        setApplicationReasons((current) => ({ ...current, [application.id]: event.target.value }));
                        setActionError('');
                      }}
                      minLength={5}
                      placeholder="Explain your decision"
                    />
                  </label>
                  <span className="dash-row-actions">
                    <button
                      type="button"
                      className="dash-primary-button dash-small-button"
                      disabled={(applicationReasons[application.id] || '').trim().length < 5 || Boolean(actionLoading)}
                      onClick={() => resolveApplication(application, 'approved')}
                    >
                      {actionLoading === `shop-${application.id}` ? 'Updating…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="dash-quiet-button"
                      disabled={(applicationReasons[application.id] || '').trim().length < 5 || Boolean(actionLoading)}
                      onClick={() => resolveApplication(application, 'rejected')}
                    >
                      Reject
                    </button>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="dash-empty-list"><strong>No pending applications</strong><span>New shop applications will show up here.</span></div>
          )}
          {actionError && <p className="field-error" role="alert">{actionError}</p>}
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
                <span>Time</span><span>Actor</span><span>Action</span><span>Target &amp; details</span>
              </div>
              {auditLog.map((entry) => (
                <div className="dash-audit-row" role="row" key={entry.id}>
                  <span>{entry.time}</span>
                  <span>{entry.admin}</span>
                  <span><strong>{entry.action}</strong></span>
                  <span>{entry.target}{entry.details && <small>{entry.details}</small>}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty-list"><strong>No audit entries yet</strong><span>Recorded decisions will appear here.</span></div>
          )}
          <p className="dash-readonly-note">Read-only. Entries cannot be edited or deleted.</p>
        </section>
      )}

      {activeTab === 'account' && mappedAdmin && (
        <section className="dash-card dash-profile-card" style={{ marginTop: 24, borderRadius: 12, background: '#ffffff', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          <div className="dash-profile-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <span className="dash-section-eyebrow" style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>ADMIN PROFILE</span>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>Admin account</h2>
            </div>
          </div>
          <div className="dash-profile-list" style={{ padding: '24px' }}>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Full name</span>
                <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mappedAdmin.name}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Email address</span>
                <span className="dash-profile-value" style={{ fontSize: 15, color: '#0f172a' }}>{mappedAdmin.email}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Campus role</span>
                <span className="dash-profile-value" style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{mappedAdmin.role}</span>
              </div>
            </article>
            <article className="dash-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
              <div style={{ flex: 1 }}>
                <span className="dash-profile-label" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 }}>Account status</span>
                <span className="dash-profile-value" style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{mappedAdmin.status}</span>
              </div>
            </article>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}

export default Admin;
