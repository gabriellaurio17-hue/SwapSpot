import React from 'react';

const stages = ['Requested', 'Approved', 'Ongoing', 'Returned', 'Completed'];

function RentalCard({ rental, onAction, actionLoading, actionError }) {
  const statusToIndex = {
    requested: 0,
    approved: 1,
    active: 2,
    returned: 3,
    completed: 4,
  };
  const currentIndex = rental.rawStatus === 'rejected'
    ? -1
    : statusToIndex[rental.rawStatus] ?? -1;

  let actions = [];
  if (rental.role === 'I’m lending') {
    if (rental.rawStatus === 'requested') {
      actions = [
        { label: 'Approve', status: 'approved' },
        { label: 'Reject', status: 'rejected' },
      ];
    } else if (rental.rawStatus === 'approved') {
      actions = [{ label: 'Mark as handed over', status: 'active' }];
    } else if (rental.rawStatus === 'active') {
      actions = [{ label: 'Mark as returned', status: 'returned' }];
    }
  }
  if (rental.rawStatus === 'returned') {
    actions = [{ label: 'Confirm completed', status: 'completed' }];
  }

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
      {rental.rawStatus === 'rejected' && (
        <p className="return-alert"><span aria-hidden="true">×</span> This rental request was rejected.</p>
      )}
      {actions.map((action) => (
        <button
          type="button"
          className="btn btn-secondary btn-small"
          key={action.status}
          disabled={Boolean(actionLoading)}
          onClick={() => onAction(rental.id, action.status)}
          style={{ marginRight: 8, marginBottom: 4 }}
        >
          {actionLoading === action.status ? 'Updating…' : action.label}
        </button>
      ))}
      {actionError && <p className="field-error" role="alert">{actionError}</p>}
    </article>
  );
}

export default React.memo(RentalCard);