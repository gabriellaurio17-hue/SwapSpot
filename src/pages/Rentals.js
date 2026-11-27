import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import RentalCard from '../components/RentalCard';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';

const NEXT_STEP = {
  Requested: { nextStatus: 'Approved', action: 'Approve request' },
  Approved: { nextStatus: 'Active', action: 'Mark as handed over' },
  Active: { nextStatus: 'Returned', action: 'Mark as returned' },
  Returned: { nextStatus: 'Completed', action: 'Confirm completion' },
  Completed: { nextStatus: null, action: 'Completed ✓' },
};

function formatDateShort(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateRange(startIso, dueIso) {
  const start = new Date(startIso);
  const due = new Date(dueIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) return '';
  return `${formatDateShort(startIso)} – ${formatDateShort(dueIso)}, ${due.getFullYear()}`;
}

function formatNameFromEmail(email = '') {
  if (!email) return 'CIT-U Member';
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function mapApiRental(item, currentUserId) {
  const isRenting = item.buyerId === currentUserId;
  const apiStatus = item.status || 'Requested';
  const displayStatus = apiStatus === 'Active' ? 'Ongoing' : apiStatus;
  const transition = NEXT_STEP[apiStatus] || NEXT_STEP.Completed;
  const dueDate = new Date(item.dueDate);
  const msUntilDue = dueDate.getTime() - Date.now();
  const daysLeft = Math.ceil(msUntilDue / (1000 * 60 * 60 * 24));
  const dueSoon = apiStatus === 'Active' && daysLeft <= 2;

  return {
    id: item.rentalId,
    listingId: item.listingId,
    role: isRenting ? 'I’m renting' : 'I’m lending',
    item: item.listingTitle,
    person: isRenting
      ? `From ${formatNameFromEmail(item.sellerEmail)}`
      : `To ${formatNameFromEmail(item.buyerEmail)}`,
    counterpartyName: isRenting
      ? formatNameFromEmail(item.sellerEmail)
      : formatNameFromEmail(item.buyerEmail),
    apiStatus,
    status: displayStatus,
    dates: formatDateRange(item.startDate, item.dueDate),
    dueDate,
    daysLeft,
    deposit: `₱${Number(item.depositAmount ?? 0).toLocaleString('en-PH')}`,
    dueSoon,
    nextStatus: transition.nextStatus,
    action: transition.action,
  };
}

function Rentals() {
  const { user } = useAuth();
  const [tab, setTab] = useState('renting');
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError('');

    const query = user?.userId ? `?userId=${encodeURIComponent(user.userId)}` : '';
    fetch(`${API_BASE_URL}/api/Transactions/rentals${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load rentals.');
        const data = await res.json();
        if (!cancelled) {
          setRentals(Array.isArray(data) ? data.map((item) => mapApiRental(item, user?.userId)) : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiError('Cannot load rentals from the backend. Make sure the API is running.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const handleAdvanceStatus = useCallback(async (rentalId, nextStatus) => {
    setUpdatingId(rentalId);
    setApiError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/Transactions/rentals/${encodeURIComponent(rentalId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setApiError(data.message || 'Could not update rental status.');
        return;
      }

      const updatedApiStatus = data.status || nextStatus;
      const transition = NEXT_STEP[updatedApiStatus] || NEXT_STEP.Completed;
      const displayStatus = updatedApiStatus === 'Active' ? 'Ongoing' : updatedApiStatus;

      setRentals((current) => current.map((rental) => (
        rental.id === rentalId
          ? {
              ...rental,
              apiStatus: updatedApiStatus,
              status: displayStatus,
              dueSoon: updatedApiStatus === 'Active' && rental.daysLeft <= 2,
              nextStatus: transition.nextStatus,
              action: transition.action,
            }
          : rental
      )));
    } catch {
      setApiError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setUpdatingId('');
    }
  }, []);

  const rentingCount = useMemo(() => rentals.filter((r) => r.role === 'I’m renting').length, [rentals]);
  const lendingCount = useMemo(() => rentals.filter((r) => r.role === 'I’m lending').length, [rentals]);
  const visibleRentals = useMemo(
    () => rentals.filter((rental) => rental.role === (tab === 'renting' ? 'I’m renting' : 'I’m lending')),
    [rentals, tab],
  );

  const upcomingReturn = useMemo(() => {
    const active = rentals
      .filter((r) => r.role === 'I’m renting' && r.apiStatus !== 'Returned' && r.apiStatus !== 'Completed')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return active[0] || null;
  }, [rentals]);

  const handleTabChange = useCallback((event) => setTab(event.currentTarget.value), []);

  return (
    <div className="page-shell">
      <div className="rentals-topbar">
        <Topbar />
      </div>
      <main className="rentals-page">
        <div className="container rentals-content">
          <div className="page-intro"><span className="eyebrow">Everything in its right place</span><h1>Rental <em>tracker</em></h1><p>Your requests, dates, deposits, and returns — all together.</p></div>
          {apiError && <p className="field-error" role="alert" style={{ marginBottom: '1rem' }}>{apiError}</p>}
          <div className="rentals-layout"><section className="rental-list-section">
            <div className="rental-tabs" role="tablist" aria-label="Rental roles">
              <button type="button" role="tab" value="renting" aria-selected={tab === 'renting'} className={tab === 'renting' ? 'active' : ''} onClick={handleTabChange}>I’m renting <span>{rentingCount}</span></button>
              <button type="button" role="tab" value="lending" aria-selected={tab === 'lending'} className={tab === 'lending' ? 'active' : ''} onClick={handleTabChange}>I’m lending <span>{lendingCount}</span></button>
            </div>
            {loading ? (
              <div className="empty-state card"><h3>Loading rentals...</h3><p>Fetching your rental tracker from SwapSpot.</p></div>
            ) : visibleRentals.length ? (
              <div className="rental-card-list">
                {visibleRentals.map((rental) => (
                  <RentalCard
                    rental={rental}
                    key={rental.id}
                    onAdvanceStatus={handleAdvanceStatus}
                    updating={updatingId === rental.id}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <h3>No {tab === 'renting' ? 'rentals' : 'lending requests'} yet</h3>
                <p>{tab === 'renting' ? 'Browse campus gear and request a rental to track it here.' : 'When someone requests to borrow your listed gear, it will appear here.'}</p>
                <Link to="/browse" className="btn btn-secondary">Browse listings</Link>
              </div>
            )}
          </section>
          <aside className="rentals-aside">
            <section className="upcoming-card">
              <span className="eyebrow eyebrow-gold">A friendly reminder</span>
              <h2>Upcoming returns</h2>
              <p>Keep the good things moving.</p>
              {upcomingReturn ? (
                <>
                  <div className="return-reminder">
                    <span className="reminder-date">
                      {upcomingReturn.dueDate.getDate()}
                      <br />
                      <small>{upcomingReturn.dueDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</small>
                    </span>
                    <span>
                      <strong>{upcomingReturn.item}</strong>
                      <small>
                        Return to {upcomingReturn.counterpartyName} · {upcomingReturn.daysLeft <= 0 ? 'Due today' : `In ${upcomingReturn.daysLeft} day${upcomingReturn.daysLeft === 1 ? '' : 's'}`}
                      </small>
                    </span>
                    <span className="reminder-arrow">→</span>
                  </div>
                  <Link to={`/listing?id=${upcomingReturn.listingId}`} className="upcoming-link">Open rental details <span aria-hidden="true">↗</span></Link>
                </>
              ) : (
                <p style={{ marginTop: '0.75rem', opacity: 0.85 }}>No active rentals due right now.</p>
              )}
            </section>
            <section className="lend-card card"><span className="lend-icon">↗</span><span className="eyebrow">Share what you’ve got</span><h2>Lend your own gear</h2><p>Set your rental period and deposit. Your campus neighbors will take it from there.</p><Link to="/browse" className="btn btn-primary">Browse gear <span aria-hidden="true">→</span></Link></section>
            <p className="side-safety"><span>✓</span> Agree on a public campus meetup and document the item’s condition together.</p>
          </aside></div>
        </div>
      </main>
    </div>
  );
}

export default Rentals;
