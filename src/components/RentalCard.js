import React from 'react';

const stages = ['Requested', 'Approved', 'Ongoing', 'Returned', 'Completed'];

function RentalCard({ rental }) {
  const currentIndex = stages.indexOf(rental.status);
  return (
    <article className="rental-card card">
      <div className="rental-card-top">
        <div><span className="eyebrow">{rental.role}</span><h3>{rental.item}</h3><p>{rental.person}</p></div>
        <span className={`status-pill status-${rental.status.toLowerCase()}`}>{rental.status}</span>
      </div>
      <div className="rental-details"><span><small>Rental dates</small>{rental.dates}</span><span><small>Deposit</small>{rental.deposit}</span></div>
      <ol className="stepper" aria-label={`Rental status: ${rental.status}`}>
        {stages.map((stage, index) => (
          <li className={index <= currentIndex ? 'step-done' : ''} key={stage}>
            <span className="step-dot" />
            {stage}
          </li>
        ))}
      </ol>
      {rental.dueSoon && <p className="return-alert"><span aria-hidden="true">!</span> Return due soon — please arrange your handoff.</p>}
      <button type="button" className="btn btn-secondary btn-small">{rental.action}</button>
    </article>
  );
}

export default React.memo(RentalCard);