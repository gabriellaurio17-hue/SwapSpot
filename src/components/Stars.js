import React from 'react';

function Stars({ rating = 5, count, compact = false }) {
  const fullStars = Math.round(rating);
  return (
    <span className={`stars${compact ? ' stars-compact' : ''}`} aria-label={`${rating} out of 5 stars${count ? `, ${count} reviews` : ''}`}>
      <span aria-hidden="true">{'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}</span>
      <strong>{rating.toFixed(1)}</strong>
      {count !== undefined && <span className="stars-count">({count})</span>}
    </span>
  );
}

export default React.memo(Stars);