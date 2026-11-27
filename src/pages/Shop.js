import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import Illustration from '../components/Illustration';
import Topbar from '../components/Topbar';
import Stars from '../components/Stars';
import { getListingPhotoUrl } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

function formatPrice(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH')}`;
}

function Shop() {
  const location = useLocation();
  const requestedShopId = new URLSearchParams(location.search).get('id');
  const [shops, setShops] = useState([]);
  const [shop, setShop] = useState(null);
  const [owner, setOwner] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      setIsLoading(true);
      setError('');
      setShop(null);
      setOwner(null);
      setItems([]);

      try {
        const { data: shopRows, error: shopsError } = await supabase
          .from('shops')
          .select('id, owner_id, name, description, shop_type, status')
          .eq('status', 'approved')
          .order('name', { ascending: true });
        if (shopsError) throw shopsError;

        const approvedShops = shopRows || [];
        if (cancelled) return;
        setShops(approvedShops);

        if (approvedShops.length === 0) {
          setShop(null);
          return;
        }

        const selectedShop = requestedShopId
          ? approvedShops.find((candidate) => candidate.id === requestedShopId)
          : approvedShops[0];
        if (!selectedShop) {
          setError('That shop is not available.');
          return;
        }
        setShop(selectedShop);

        const [{ data: listingRows, error: listingsError }, { data: ownerRow, error: ownerError }] = await Promise.all([
          supabase
            .from('listings')
            .select('id, title, description, category, condition, price, listing_type, photo_path')
            .eq('shop_id', selectedShop.id)
            .eq('status', 'available')
            .order('created_at', { ascending: false }),
          supabase
            .from('public_profiles')
            .select('id, full_name, avg_rating, rating_count')
            .eq('id', selectedShop.owner_id)
            .maybeSingle(),
        ]);
        if (listingsError) throw listingsError;
        if (ownerError) throw ownerError;
        if (cancelled) return;

        setOwner(ownerRow);
        setItems((listingRows || []).map((row) => ({
          id: row.id,
          name: row.title,
          description: row.description || '',
          category: row.category,
          condition: row.condition || 'Not specified',
          price: `${formatPrice(row.price)}${row.listing_type === 'rent' ? ' / day' : ''}`,
          photoUrl: row.photo_path ? getListingPhotoUrl(row.photo_path) : null,
          art: {
            Textbooks: 'book',
            Calculators: 'calculator',
            'Lab gear': 'multimeter',
            'Org merch': 'shirt',
          }[row.category] || 'book',
        })));
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Could not load shops.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadShop();
    return () => {
      cancelled = true;
    };
  }, [requestedShopId]);

  const initials = (shop?.name || 'Shop')
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  const rating = Number(owner?.avg_rating || 0);
  const ratingCount = Number(owner?.rating_count || 0);

  return (
    <div className="page-shell">
      <section className="shop-banner photo-bg photo-bg--shop">
        <Topbar dark />
        <div className="container shop-banner-content">
          <div className="shop-emblem">{initials}</div>
          <div className="shop-banner-copy">
            <span className="approved-badge"><span>✓</span> Admin approved shop</span>
            <h1>{isLoading ? 'Loading shops…' : shop?.name || 'Campus shops'}</h1>
            <p>{shop?.description || 'Explore approved shops from your campus community.'}</p>
            <div className="shop-banner-rating">
              <Stars rating={rating} count={ratingCount} />
              <span>{shop?.shop_type === 'organization' ? 'Organization shop' : shop ? 'Individual shop' : 'Campus storefronts'}</span>
            </div>
          </div>
          {shop && (
            <div className="officers">
              <span className="eyebrow eyebrow-gold">Shop owner</span>
              <div className="officer-stack">
                <span className="avatar officer-one">{(owner?.full_name || shop.name).split(/\s+/).map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase()}</span>
              </div>
              <small>{owner?.full_name || 'Verified campus member'}</small>
            </div>
          )}
        </div>
      </section>
      <main className="container shop-page">
        <div className="shop-section-heading">
          <div>
            <span className="eyebrow">Made by your campus community</span>
            <h2>{shops.length > 1 ? 'Approved campus shops' : 'Shop the collection'}</h2>
          </div>
          <Link className="btn btn-secondary" to="/shop/apply">Open a shop <span aria-hidden="true">↗</span></Link>
        </div>

        {shops.length > 1 && (
          <nav aria-label="Approved shops" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {shops.map((candidate) => (
              <Link
                key={candidate.id}
                to={`/shop?id=${encodeURIComponent(candidate.id)}`}
                className="btn btn-secondary"
                aria-current={candidate.id === shop?.id ? 'page' : undefined}
              >
                {candidate.name}
              </Link>
            ))}
          </nav>
        )}

        {isLoading ? (
          <p role="status">Loading shops and listings…</p>
        ) : error ? (
          <p className="field-error" role="alert">{error}</p>
        ) : !shop ? (
          <div className="dash-empty-list"><strong>No approved shops yet</strong><span>Check back when a shop has been approved.</span></div>
        ) : items.length ? (
          <div className="grid-auto shop-grid">
            {items.map((item) => (
              <article className="shop-item card" key={item.id}>
                <Link to={`/listing?id=${encodeURIComponent(item.id)}`} className={`shop-item-art image-${item.art}`} aria-label={`View ${item.name}`}>
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Illustration type={item.art} />
                  )}
                </Link>
                <div className="shop-item-info">
                  <div className="shop-item-title">
                    <div><h3>{item.name}</h3><p>{item.description}</p></div>
                    <strong>{item.price}</strong>
                  </div>
                  <div className="size-pills" aria-label={`${item.category}, ${item.condition}`}>
                    <span>{item.category}</span><span>{item.condition}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dash-empty-list"><strong>No available listings</strong><span>This shop has no available items right now.</span></div>
        )}

        {shop && (
          <section className="shop-reviews">
            <div className="reviews-heading">
              <div><span className="eyebrow">Good deals, good words</span><h2>Shop owner rating</h2></div>
              <div className="review-score"><strong>{rating.toFixed(1)}</strong><Stars rating={rating} count={ratingCount} /></div>
            </div>
            <p className="review-rule"><span>✓</span> Rating summary from completed campus transactions.</p>
          </section>
        )}
        <p className="shop-disclaimer">Payments are arranged directly between you and the shop. SwapSpot does not process or verify transfers.</p>
      </main>
    </div>
  );
}

export default Shop;
