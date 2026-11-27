import React from 'react';
import { Link } from 'react-router';
import Illustration from './Illustration';
import Stars from './Stars';

function ListingCard({ listing }) {
  const stockCount = Number(listing.stock);
  let stockLabel = '';
  if (listing.mode === 'Sell') {
    stockLabel = stockCount > 0 ? `${stockCount} in stock` : 'Out of stock';
  }

  return (
    <article className="listing-card card">
      <div className={`listing-image image-${listing.art}`}>
        <Link to={`/listing?id=${listing.id}`} className="listing-image-link" aria-label={`View ${listing.title}`} style={{ width: '100%', height: '100%' }}>
          {listing.photoUrl
            ? <img src={listing.photoUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Illustration type={listing.art} />}
        </Link>
        <span className={`badge ${listing.mode === 'Rent' ? 'badge-gold' : 'badge-maroon'}`}>{listing.isSold ? 'Sold' : listing.mode}</span>
        <button className="save-button" type="button" aria-label={`Save ${listing.title}`}><span aria-hidden="true">♡</span></button>
      </div>
      <div className="listing-info">
        <div className="listing-title-row"><h3><Link to={`/listing?id=${listing.id}`}>{listing.title}</Link></h3><Stars rating={listing.rating} compact /></div>
        <p className="listing-meta">{listing.category}<span aria-hidden="true"> · </span>{listing.condition}</p>
        <div className="listing-bottom">
          <strong>{listing.price}</strong>
          <span>{stockLabel}{stockLabel && listing.location ? ' · ' : ''}{listing.location}</span>
        </div>
      </div>
    </article>
  );
}

export default React.memo(ListingCard);