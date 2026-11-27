import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import RentalCard from '../components/RentalCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { mapRental } from '../lib/mappers';

function Rentals() {
  const { user } = useAuth();
  const [tab, setTab] = useState('renting');
  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchRentals = useCallback(async () => {
    if (!user?.id) {
      setRentals([]);
      setLoadError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, transaction:transactions(id, buyer_id, seller_id, payment_status, listing:listings(id, title, photo_path))')
        .order('created_at', { ascending: false });
      if (error) throw error;

      setRentals((data || []).map((row) => mapRental(row, user.id)));
    } catch (error) {
      setLoadError(error.message || 'Could not load rentals.');
      setRentals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const handleAction = useCallback(async (rentalId, nextStatus) => {
    setActionLoading(nextStatus);
    setActionError('');
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: nextStatus })
        .eq('id', rentalId);
      if (error) throw error;
      await fetchRentals();
    } catch (error) {
      setActionError(error.message || 'Could not update this rental.');
    } finally {
      setActionLoading('');
    }
  }, [fetchRentals]);

  const visibleRentals = useMemo(
    () => rentals.filter((rental) => rental.role === (tab === 'renting' ? 'I’m renting' : 'I’m lending')),
    [rentals, tab]
  );
  const upcomingReturns = useMemo(() => rentals
    .filter((rental) => rental.rawStatus === 'active')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [rentals]);

  const getDueLabel = useCallback((dueDate) => {
    const due = new Date(`${dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const difference = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (difference === 0) return 'Due today';
    if (difference === 1) return 'In 1 day';
    if (difference > 1) return `In ${difference} days`;
    const overdueBy = Math.abs(difference);
    return overdueBy === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueBy} days`;
  }, []);

  const handleTabChange = useCallback((event) => setTab(event.currentTarget.value), []);
  return (
    <div className="page-shell">
      <div className="rentals-topbar">
        <Topbar />
      </div>
      <main className="rentals-page">
        <div className="container rentals-content">
          <div className="page-intro"><span className="eyebrow">Everything in its right place</span><h1>Rental <em>tracker</em></h1><p>Your requests, dates, deposits, and returns — all together.</p></div>
          <div className="rentals-layout"><section className="rental-list-section">
            <div className="rental-tabs" role="tablist" aria-label="Rental roles"><button type="button" role="tab" value="renting" aria-selected={tab === 'renting'} className={tab === 'renting' ? 'active' : ''} onClick={handleTabChange}>I’m renting <span>{rentals.filter((r) => r.role === 'I’m renting').length}</span></button><button type="button" role="tab" value="lending" aria-selected={tab === 'lending'} className={tab === 'lending' ? 'active' : ''} onClick={handleTabChange}>I’m lending <span>{rentals.filter((r) => r.role === 'I’m lending').length}</span></button></div>
            {isLoading ? (
              <p role="status" style={{ marginTop: 16 }}>Loading rentals…</p>
            ) : loadError ? (
              <p className="field-error" role="alert">{loadError}</p>
            ) : visibleRentals.length === 0 ? (
              <p style={{ marginTop: 16, color: '#65534B' }}>No rentals in this tab yet.</p>
            ) : (
              <div className="rental-card-list">{visibleRentals.map((rental) => (
                <RentalCard
                  rental={rental}
                  key={rental.id}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  actionError={actionError}
                />
              ))}</div>
            )}
          </section>
          <aside className="rentals-aside"><section className="upcoming-card"><span className="eyebrow eyebrow-gold">A friendly reminder</span><h2>Upcoming returns</h2><p>Keep the good things moving.</p>
            {isLoading ? (
              <p role="status">Loading upcoming returns…</p>
            ) : upcomingReturns.length === 0 ? (
              <p>No active rentals due.</p>
            ) : upcomingReturns.map((rental) => {
              const due = new Date(`${rental.dueDate}T00:00:00`);
              return (
                <div className="return-reminder" key={rental.id}>
                  <span className="reminder-date">{due.toLocaleDateString('en-PH', { day: '2-digit' })}<br /><small>{due.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase()}</small></span>
                  <span><strong>{rental.item}</strong><small>{getDueLabel(rental.dueDate)}</small></span>
                  <span className="reminder-arrow">→</span>
                </div>
              );
            })}
            {upcomingReturns.length > 0 && <Link to="/rentals" className="upcoming-link">Open rental tracker <span aria-hidden="true">↗</span></Link>}
          </section>
            <section className="lend-card card"><span className="lend-icon">↗</span><span className="eyebrow">Share what you’ve got</span><h2>Lend your own gear</h2><p>Set your rental period and deposit. Your campus neighbors will take it from there.</p><Link to="/browse" className="btn btn-primary">Create a listing <span aria-hidden="true">→</span></Link></section>
            <p className="side-safety"><span>✓</span> Agree on a public campus meetup and document the item’s condition together.</p></aside></div>
        </div>
      </main>
    </div>
  );
}

export default Rentals;