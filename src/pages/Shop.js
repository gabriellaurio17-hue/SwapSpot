import React from 'react';
import Topbar from '../components/Topbar';
import ShopItem from '../components/ShopItem';
import Stars from '../components/Stars';
import { shopItems, shops } from '../data/mock';

function Shop() {
  const shop = shops[0];
  return (
    <div className="page-shell">
      <section className="shop-banner photo-bg photo-bg--shop"><Topbar dark /><div className="container shop-banner-content"><div className="shop-emblem">ESC</div><div className="shop-banner-copy"><span className="approved-badge"><span>✓</span> Admin approved shop</span><h1>{shop.name}</h1><p>{shop.subtitle} · Student Center, CIT-U</p><div className="shop-banner-rating"><Stars rating={shop.rating} count={shop.reviews} /><span>Accepts GCash QR &amp; cash</span></div></div><div className="officers"><span className="eyebrow eyebrow-gold">Meet your officers</span><div className="officer-stack"><span className="avatar officer-one">MC</span><span className="avatar officer-two">AJ</span><span className="avatar officer-three">KR</span><span className="avatar officer-more">+2</span></div><small>Shop messages answered by our team</small></div></div></section>
      <main className="container shop-page">
        <div className="shop-section-heading"><div><span className="eyebrow">Made by your campus community</span><h2>Shop the collection</h2></div><a className="btn btn-secondary" href="mailto:engineeringcouncil@cit.edu">Message the shop <span aria-hidden="true">↗</span></a></div>
        <div className="grid-auto shop-grid">{shopItems.map((item) => <ShopItem item={item} key={item.id} />)}</div>
        <section className="shop-reviews"><div className="reviews-heading"><div><span className="eyebrow">Good deals, good words</span><h2>Community reviews</h2></div><div className="review-score"><strong>4.9</strong><Stars rating={shop.rating} count={shop.reviews} /></div></div><div className="review-grid"><article className="review-card card"><Stars rating={5} /><p>Great quality and super easy to pick up after class. Love supporting our org!</p><div><span className="avatar review-avatar">JL</span><span><strong>J. L.</strong><small>Completed purchase · Oct 12</small></span></div></article><article className="review-card card"><Stars rating={5} /><p>Quick replies and the shirt fits perfectly. Will definitely be back for the next drop.</p><div><span className="avatar review-avatar">PR</span><span><strong>P. R.</strong><small>Completed purchase · Oct 8</small></span></div></article><article className="review-card card"><Stars rating={4} /><p>Really nice notebook and friendly pickup. A lovely campus-made find.</p><div><span className="avatar review-avatar">AM</span><span><strong>A. M.</strong><small>Completed purchase · Oct 4</small></span></div></article></div><p className="review-rule"><span>✓</span> One review per completed deal. Reviews can only be left by verified campus members.</p></section>
        <p className="shop-disclaimer">Payments are arranged directly between you and the shop. SwapSpot does not process or verify transfers.</p>
      </main>
    </div>
  );
}

export default Shop;