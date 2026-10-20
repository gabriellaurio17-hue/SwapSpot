import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import RentalCard from '../components/RentalCard';
import { rentals } from '../data/mock';

function Rentals() {
  const [tab, setTab] = useState('renting');
  const visibleRentals = useMemo(() => rentals.filter((rental) => rental.role === (tab === 'renting' ? 'I’m renting' : 'I’m lending')), [tab]);
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
            <div className="rental-card-list">{visibleRentals.map((rental) => <RentalCard rental={rental} key={rental.id} />)}</div>
          </section>
          <aside className="rentals-aside"><section className="upcoming-card"><span className="eyebrow eyebrow-gold">A friendly reminder</span><h2>Upcoming returns</h2><p>Keep the good things moving.</p><div className="return-reminder"><span className="reminder-date">19<br /><small>OCT</small></span><span><strong>Casio fx-991ES Plus</strong><small>Return to Mika C. · In 2 days</small></span><span className="reminder-arrow">→</span></div><Link to="/listing" className="upcoming-link">Open rental details <span aria-hidden="true">↗</span></Link></section>
            <section className="lend-card card"><span className="lend-icon">↗</span><span className="eyebrow">Share what you’ve got</span><h2>Lend your own gear</h2><p>Set your rental period and deposit. Your campus neighbors will take it from there.</p><Link to="/browse" className="btn btn-primary">Create a listing <span aria-hidden="true">→</span></Link></section>
            <p className="side-safety"><span>✓</span> Agree on a public campus meetup and document the item’s condition together.</p></aside></div>
        </div>
      </main>
    </div>
  );
}

export default Rentals;