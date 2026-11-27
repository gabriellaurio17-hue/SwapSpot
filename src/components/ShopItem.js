import React from 'react';
import { Link } from 'react-router';
import Illustration from './Illustration';

function ShopItem({ item }) {
  const cardBody = (
    <article className="shop-item card">
      <div className={`shop-item-art image-${item.art}`}><Illustration type={item.art} /></div>
      <div className="shop-item-info">
        <div className="shop-item-title"><div><h3>{item.name}</h3><p>{item.description}</p></div><strong>{item.price}</strong></div>
        <div className="size-pills" aria-label={`Available options: ${item.sizes.join(', ')}`}>{item.sizes.map((size) => <span key={size}>{size}</span>)}</div>
      </div>
    </article>
  );

  // If the item has a real DB ListingId, clicking it opens the Listing detail page to buy/chat.
  if (item.listingId) {
    return (
      <Link to={`/listing?id=${item.listingId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}

export default React.memo(ShopItem);
