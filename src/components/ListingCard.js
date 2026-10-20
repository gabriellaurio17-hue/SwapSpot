import React from 'react';
import { Link } from 'react-router';
import Illustration from './Illustration';
import Stars from './Stars';

function ListingCard({ listing }) {
  return (
    <article className="listing-card card">
      <div className={`listing-image image-${listing.art}`}>
        <Link to="/listing" className="listing-image-link" aria-label={`View ${listing.title}`}><Illustration type={listing.art} /></Link>
        <span className={`badge ${listing.mode === 'Rent' ? 'badge-gold' : 'badge-maroon'}`}>{listing.mode}</span>
        <button className="save-button" type="button" aria-label={`Save ${listing.title}`}><span aria-hidden="true">♡</span></button>
      </div>
      <div className="listing-info">
        <div className="listing-title-row"><h3><Link to="/listing">{listing.title}</Link></h3><Stars rating={listing.rating} compact /></div>
        <p className="listing-meta">{listing.category}<span aria-hidden="true"> · </span>{listing.condition}</p>
        <div className="listing-bottom"><strong>{listing.price}</strong><span>{listing.location}</span></div>
      </div>
    </article>
  );
}

export default React.memo(ListingCard);