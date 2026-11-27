import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const REPORT_FIELDS = 'id, reporter_id, target_user_id, target_listing_id, status, resolution_note, created_at';
const FINAL_REPORT_STATUSES = ['dismissed', 'resolved'];
const DISMISSED_UPDATE_KEY = 'swapspot:dismissed-report-updates';

function readDismissedUpdates(userId) {
  if (!userId) return new Set();
  try {
    const stored = window.localStorage.getItem(`${DISMISSED_UPDATE_KEY}:${userId}`);
    const ids = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(ids)) throw new Error('Stored dismissed report updates are invalid.');
    return new Set(ids.filter((id) => typeof id === 'string'));
  } catch (error) {
    console.error('Could not read dismissed report updates:', error);
    return new Set();
  }
}

function describeUpdate(report, listing, userId) {
  const isReporter = report.reporter_id === userId;
  const isTargetUser = report.target_user_id === userId;
  const isListingOwner = Boolean(listing);
  const dismissed = report.status === 'dismissed';
  let title;
  let message;

  if (isTargetUser) {
    title = dismissed ? 'Account report dismissed' : 'Account suspended';
    message = dismissed
      ? 'A report concerning your account was dismissed. No action was taken.'
      : 'Your account was suspended after an admin review.';
  } else if (isListingOwner) {
    title = dismissed ? 'Listing report dismissed' : listing.status === 'removed' ? 'Listing removed' : 'Listing report reviewed';
    message = dismissed
      ? `A report concerning “${listing.title}” was dismissed. No action was taken.`
      : listing.status === 'removed'
        ? `“${listing.title}” was removed after an admin review.`
        : `A report concerning “${listing.title}” was reviewed by an admin.`;
  } else if (isReporter) {
    title = dismissed ? 'Your report was dismissed' : 'Your report was reviewed';
    message = dismissed
      ? 'No action was taken on the report you submitted.'
      : 'An admin reviewed the report you submitted.';
  } else {
    return null;
  }

  return {
    id: report.id,
    title,
    message,
    note: report.resolution_note || '',
    createdAt: new Date(report.created_at).toLocaleString(),
  };
}

function ReportNotifications({ userId }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [dismissedUpdateIds, setDismissedUpdateIds] = useState(() => readDismissedUpdates(userId));

  useEffect(() => {
    setDismissedUpdateIds(readDismissedUpdates(userId));
  }, [userId]);

  const dismissUpdates = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextDismissedIds = new Set(dismissedUpdateIds);
    updates.forEach((update) => nextDismissedIds.add(update.id));
    setDismissedUpdateIds(nextDismissedIds);
    setUpdates([]);
    try {
      window.localStorage.setItem(
        `${DISMISSED_UPDATE_KEY}:${userId}`,
        JSON.stringify([...nextDismissedIds]),
      );
    } catch (storageError) {
      console.error('Could not save dismissed report updates:', storageError);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadUpdates() {
      if (!userId) {
        setUpdates([]);
        setError('Sign in to view report updates.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [listingResult, userReportResult] = await Promise.all([
          supabase
            .from('listings')
            .select('id, title, status')
            .eq('seller_id', userId),
          supabase
            .from('reports')
            .select(REPORT_FIELDS)
            .or(`reporter_id.eq.${userId},target_user_id.eq.${userId}`)
            .in('status', FINAL_REPORT_STATUSES)
            .order('created_at', { ascending: false })
            .limit(25),
        ]);
        if (listingResult.error) throw listingResult.error;
        if (userReportResult.error) throw userReportResult.error;

        const listings = listingResult.data || [];
        const listingById = new Map(listings.map((listing) => [listing.id, listing]));
        const listingIds = listings.map((listing) => listing.id);
        let listingReportRows = [];

        if (listingIds.length) {
          const { data, error: listingReportsError } = await supabase
            .from('reports')
            .select(REPORT_FIELDS)
            .in('target_listing_id', listingIds)
            .in('status', FINAL_REPORT_STATUSES)
            .order('created_at', { ascending: false })
            .limit(25);
          if (listingReportsError) throw listingReportsError;
          listingReportRows = data || [];
        }

        if (cancelled) return;
        const reports = new Map(
          [...(userReportResult.data || []), ...listingReportRows].map((report) => [report.id, report]),
        );
        setUpdates([...reports.values()]
          .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
          .slice(0, 20)
          .map((report) => describeUpdate(
            report,
            listingById.get(report.target_listing_id),
            userId,
          ))
          .filter(Boolean));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Could not load report updates.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUpdates();
    return () => {
      cancelled = true;
    };
  }, [userId, retryCount]);

  if (loading) return <p role="status">Checking for admin updates…</p>;
  if (error) {
    return (
      <div className="dash-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={() => setRetryCount((count) => count + 1)}>Retry</button>
      </div>
    );
  }
  const visibleUpdates = updates.filter((update) => !dismissedUpdateIds.has(update.id));
  if (!visibleUpdates.length) return null;

  return (
    <section className="dash-card report-notifications" aria-label="Report notifications">
      <div className="dash-list-heading">
        <div><span className="dash-section-eyebrow">ACCOUNT NOTIFICATIONS</span><h2>Admin updates</h2></div>
        <button
          type="button"
          className="report-notification-dismiss"
          onClick={dismissUpdates}
          aria-label="Dismiss admin updates"
          title="Dismiss admin updates"
        >
          ×
        </button>
      </div>
      {visibleUpdates.map((update) => (
        <article className="dash-attention report-notification-item" key={update.id} role="status">
          <span className="dash-attention-icon" aria-hidden="true">!</span>
          <div>
            <strong>{update.title}</strong>
            <span>{update.message}</span>
            {update.note && <span>Admin note: {update.note}</span>}
            <small>{update.createdAt}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

export default ReportNotifications;
