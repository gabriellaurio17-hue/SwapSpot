import React from 'react';
import Illustration from './Illustration';

function ShopItem({ item }) {
  return (
    <article className="shop-item card">
      <div className={`shop-item-art image-${item.art}`}><Illustration type={item.art} /></div>
      <div className="shop-item-info">
        <div className="shop-item-title"><div><h3>{item.name}</h3><p>{item.description}</p></div><strong>{item.price}</strong></div>
        <div className="size-pills" aria-label={`Available sizes: ${item.sizes.join(', ')}`}>{item.sizes.map((size) => <span key={size}>{size}</span>)}</div>
      </div>
    </article>
  );
}

export default React.memo(ShopItem);