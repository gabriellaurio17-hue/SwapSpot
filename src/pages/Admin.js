import React, { useEffect, useMemo, useState } from 'react';
import {
  DashboardError,
  DashboardRowSkeleton,
  DashboardShell,
  DashboardStat,
  DashboardStatSkeleton,
} from '../components/DashboardShell';
import Illustration from '../components/Illustration';
import { applications as initialApplications, reports as initialReports } from '../data/mock';

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
  { id: 'audit-1', time: 'Oct 16, 2026 · 14:32', admin: 'ADM-0007', action: 'Approved shop', target: 'Engineering Student Council' },
  { id: 'audit-2', time: 'Oct 16, 2026 · 11:05', admin: 'ADM-0007', action: 'Removed listing', target: 'Broken phone charger' },
  { id: 'audit-3', time: 'Oct 15, 2026 · 17:48', admin: 'ADM-0003', action: 'Suspended account', target: 'USR-2291' },
  { id: 'audit-4', time: 'Oct 15, 2026 · 09:12', admin: 'ADM-0003', action: 'Reinstated account', target: 'USR-1180' },
];

const decisions = [
  ['Take down listing', 'Hides the listing. The seller is notified.'],
  ['Suspend account', 'Blocks login. Can be reinstated later.'],
  ['Dismiss report', 'No violation found.'],
];

function Admin() {
  const [activeTab, setActiveTab] = useState('reports');
  const [openReports, setOpenReports] = useState(initialReports);
  const [pendingApplications, setPendingApplications] = useState(initialApplications);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [selectedId, setSelectedId] = useState(initialReports[0]?.id ?? '');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedReport = useMemo(
    () => openReports.find((report) => report.id === selectedId) ?? openReports[0] ?? null,
    [openReports, selectedId],
  );

  const handleRetry = () => {
    setLoadError(false);
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 350);
  };

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
      admin: 'ADM-0007',
      action: decision,
      target: selectedReport.item,
      reason: reason.trim(),
    }, ...current]);

    const remaining = openReports.filter((report) => report.id !== selectedReport.id);
    setOpenReports(remaining);
    setSelectedId(remaining[0]?.id ?? '');
    setDecision('');
    setReason('');
    setToast(`${decision} recorded in the audit log as ADM-0007`);
  };

  const resolveApplication = (application, action) => {
    setPendingApplications((current) => current.filter((item) => item.id !== application.id));
    setAuditLog((current) => [{
      id: `audit-${Date.now()}`,
      time: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      admin: 'ADM-0007',
      action,
      target: application.name,
    }, ...current]);
  };

  const nav = [
    { id: 'reports', label: 'Reports', icon: '!', count: openReports.length },
    { id: 'applications', label: 'Shop applications', icon: '▣', count: pendingApplications.length },
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
      user={{ initials: 'AD', name: 'SwapSpot Admin', role: 'Administrator' }}
      returnTo="/"
      returnLabel="Return to marketplace"
    >
      {toast && <div className="dash-toast" role="status">✓ {toast}</div>}
      {loadError && <DashboardError onRetry={handleRetry} />}

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
            <DashboardStat icon="⚑" label="Open reports" value={openReports.length} hint="Oldest waiting 3 days" attention onClick={() => setActiveTab('reports')} />
            <DashboardStat icon="▣" label="Shop applications" value={pendingApplications.length} hint="Oldest waiting 2 days" onClick={() => setActiveTab('applications')} />
            <DashboardStat icon="✓" label="Active members" value="1,284" hint="+12 this week" onClick={() => setActiveTab('audit')} />
            <DashboardStat icon="↗" label="Listings live" value="346" hint="−3 vs last week" onClick={() => setActiveTab('reports')} />
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
                  <span>{application.contact} · Submitted {application.submitted}</span>
                </span>
                <span className="dash-row-actions">
                  <button type="button" className="dash-primary-button dash-small-button" onClick={() => resolveApplication(application, 'Approved shop')}>Approve</button>
                  <button type="button" className="dash-quiet-button" onClick={() => resolveApplication(application, 'Rejected shop')}>Reject</button>
                </span>
              </div>
            ))
          ) : (
            <div className="dash-empty-list"><strong>No pending applications</strong><span>New shop applications will show up here.</span></div>
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
                <span>Time</span><span>Admin ID</span><span>Action</span><span>Target</span>
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
