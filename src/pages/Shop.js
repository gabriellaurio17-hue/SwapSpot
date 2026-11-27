import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import ShopItem from '../components/ShopItem';
import Stars from '../components/Stars';
import { API_BASE_URL } from '../utils/api';

const DEFAULT_SHOP_ID = '44444444-4444-4444-4444-444444444444';

function pickArt(category = '', title = '') {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes('book') || text.includes('supply') || text.includes('supplies') || text.includes('note')) return 'book';
  if (text.includes('calc')) return 'calculator';
  if (text.includes('lab') || text.includes('meter')) return 'multimeter';
  return 'shirt';
}

function Shop() {
  const [shop, setShop] = useState({
    name: 'Engineering Student Council',
    subtitle: 'Made by students, for students',
    status: 'Approved',
    ownerEmail: 'org@cit.edu',
    rating: 4.9,
    reviews: 28,
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // Runs once when /shop loads to fetch the shop's profile and live inventory from SQL Server.
  useEffect(() => {
    let cancelled = false;

    async function loadShopData() {
      setLoading(true);
      setApiError('');
      try {
        // GET /api/Shops/{shopId} — fetches shop name, approval status, and owner email from Shops table.
        // GET /api/Shops/{shopId}/inventory — fetches all Listings belonging to this shop.
        const [shopRes, invRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}`),
          fetch(`${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/inventory`),
        ]);

        if (shopRes.ok) {
          const shopData = await shopRes.json();
          if (!cancelled) {
            setShop((prev) => ({
              ...prev,
              name: shopData.shopName || prev.name,
              status: shopData.status || prev.status,
              ownerEmail: shopData.ownerEmail || prev.ownerEmail,
            }));
          }
        }

        if (!invRes.ok) throw new Error('Could not load shop inventory.');
        const invData = await invRes.json();

        if (!cancelled) {
          const mapped = (Array.isArray(invData) ? invData : [])
            .filter((item) => Number(item.stockQuantity) > 0)
            .map((item) => ({
              id: item.listingId,
              listingId: item.listingId,
              name: item.title,
              description: `${item.category} · ${item.stockQuantity} in stock`,
              price: `₱${Number(item.price).toLocaleString('en-PH')}`,
              sizes: [item.category, `${item.stockQuantity} left`],
              art: pickArt(item.category, item.title),
            }));
          setItems(mapped);
        }
      } catch {
        if (!cancelled) {
          setApiError('Cannot load shop items from the backend. Make sure the API is running.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShopData();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-shell">
      <section className="shop-banner photo-bg photo-bg--shop">
        <Topbar dark />
        <div className="container shop-banner-content">
          <div className="shop-emblem">ESC</div>
          <div className="shop-banner-copy">
            <span className="approved-badge"><span>✓</span> {shop.status === 'Approved' ? 'Admin approved shop' : 'Pending approval'}</span>
            <h1>{shop.name}</h1>
            <p>{shop.subtitle} · Student Center, CIT-U</p>
            <div className="shop-banner-rating"><Stars rating={shop.rating} count={shop.reviews} /><span>Accepts GCash QR &amp; cash</span></div>
          </div>
          <div className="officers">
            <span className="eyebrow eyebrow-gold">Meet your officers</span>
            <div className="officer-stack"><span className="avatar officer-one">MC</span><span className="avatar officer-two">AJ</span><span className="avatar officer-three">KR</span><span className="avatar officer-more">+2</span></div>
            <small>Shop messages answered by our team</small>
          </div>
        </div>
      </section>
      <main className="container shop-page">
        <div className="shop-section-heading">
          <div><span className="eyebrow">Made by your campus community</span><h2>Shop the collection</h2></div>
          <a className="btn btn-secondary" href={`mailto:${shop.ownerEmail}`}>Message the shop <span aria-hidden="true">↗</span></a>
        </div>
        {loading ? (
          <div className="empty-state card"><h3>Loading shop collection...</h3><p>Fetching live items from SQL Server.</p></div>
        ) : apiError ? (
          <div className="empty-state card" role="alert"><h3>Couldn’t load shop</h3><p>{apiError}</p></div>
        ) : items.length ? (
          <div className="grid-auto shop-grid">{items.map((item) => <ShopItem item={item} key={item.id} />)}</div>
        ) : (
          <div className="empty-state card"><h3>No items in stock right now</h3><p>Check back soon for the next org drop.</p></div>
        )}
        <section className="shop-reviews"><div className="reviews-heading"><div><span className="eyebrow">Good deals, good words</span><h2>Community reviews</h2></div><div className="review-score"><strong>4.9</strong><Stars rating={shop.rating} count={shop.reviews} /></div></div><div className="review-grid"><article className="review-card card"><Stars rating={5} /><p>Great quality and super easy to pick up after class. Love supporting our org!</p><div><span className="avatar review-avatar">JL</span><span><strong>J. L.</strong><small>Completed purchase · Oct 12</small></span></div></article><article className="review-card card"><Stars rating={5} /><p>Quick replies and the shirt fits perfectly. Will definitely be back for the next drop.</p><div><span className="avatar review-avatar">PR</span><span><strong>P. R.</strong><small>Completed purchase · Oct 8</small></span></div></article><article className="review-card card"><Stars rating={4} /><p>Really nice notebook and friendly pickup. A lovely campus-made find.</p><div><span className="avatar review-avatar">AM</span><span><strong>A. M.</strong><small>Completed purchase · Oct 4</small></span></div></article></div><p className="review-rule"><span>✓</span> One review per completed deal. Reviews can only be left by verified campus members.</p></section>
        <p className="shop-disclaimer">Payments are arranged directly between you and the shop. SwapSpot does not process or verify transfers.</p>
      </main>
    </div>
  );
}

export default Shop;
