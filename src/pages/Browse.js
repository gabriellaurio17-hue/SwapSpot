import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import ListingCard from '../components/ListingCard';
import useListingFilters from '../hooks/useListingFilters';
import { API_BASE_URL } from '../utils/api';

function pickArt(category = '', title = '') {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes('calc')) return 'calculator';
  if (text.includes('book') || text.includes('supply') || text.includes('supplies') || text.includes('note')) return 'book';
  if (text.includes('lab') || text.includes('meter') || text.includes('goggle') || text.includes('pe') || text.includes('mat')) return 'multimeter';
  return 'shirt';
}

function mapApiListing(item) {
  const numericPrice = Number(item.price ?? 0);
  const formattedPrice = `₱${numericPrice.toLocaleString()}`;
  return {
    id: item.listingId,
    title: item.title,
    category: item.category,
    condition: `${item.stockQuantity} in stock`,
    price: item.isRentable ? `${formattedPrice} / day` : formattedPrice,
    priceValue: numericPrice,
    mode: item.isRentable ? 'Rent' : 'Sell',
    rating: 4.9,
    location: item.shopName || 'CIT-U Campus',
    art: pickArt(item.category, item.title),
    under500: numericPrice < 500,
  };
}

function Browse() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [category, setCategory] = useState('All');
  const [keyword, setKeyword] = useState('');
  const [under500, setUnder500] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError('');

    fetch(`${API_BASE_URL}/api/Listings`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load listings.');
        const data = await res.json();
        if (!cancelled) {
          setListings(Array.isArray(data) ? data.map(mapApiListing) : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiError('Cannot load listings from the backend. Make sure the API is running.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(listings.map((item) => item.category).filter(Boolean)));
    return ['All', ...unique];
  }, [listings]);

  const filteredListings = useListingFilters(listings, category, keyword, under500);

  const displayedListings = useMemo(() => {
    if (sortBy === 'price-asc') {
      return [...filteredListings].sort((a, b) => a.priceValue - b.priceValue);
    }
    return filteredListings;
  }, [filteredListings, sortBy]);

  const handleKeyword = useCallback((event) => setKeyword(event.target.value), []);
  const handleCategory = useCallback((event) => setCategory(event.currentTarget.value), []);
  const handleBudget = useCallback(() => setUnder500((current) => !current), []);
  const handleSort = useCallback((event) => setSortBy(event.target.value), []);
  const resetFilters = useCallback(() => {
    setCategory('All');
    setKeyword('');
    setUnder500(false);
  }, []);

  return (
    <div className="page-shell">
      <section className="search-band photo-bg photo-bg--browse"><Topbar /><div className="search-copy container"><div><span className="eyebrow eyebrow-gold">The campus marketplace</span><h1>Find your next <em>good thing.</em></h1><p>Real finds from people around CIT-U.</p></div><label className="search-field"><span className="search-icon" aria-hidden="true">⌕</span><span className="sr-only">Search listings</span><input type="search" value={keyword} onChange={handleKeyword} placeholder="Try “yoga mat”, “lab gown”, or “lanyard”" /><kbd>↵</kbd></label></div></section>
      <main className="container browse-layout">
        <aside className="browse-filters"><span className="eyebrow">Refine your search</span><h2>Categories</h2><div className="category-list" role="group" aria-label="Listing categories">{categories.map((item) => <button type="button" className={`category-chip${category === item ? ' selected' : ''}`} key={item} value={item} onClick={handleCategory}><span className="category-dot" />{item}</button>)}</div><div className="filter-divider" /><button type="button" className={`budget-chip${under500 ? ' selected' : ''}`} aria-pressed={under500} onClick={handleBudget}><span className="check-square">{under500 ? '✓' : ''}</span> Under ₱500</button><div className="safe-note"><span className="safe-icon">✓</span><p><strong>Campus community</strong><br />Every member signs up with a CIT-U email.</p></div></aside>
        <section className="browse-results" aria-live="polite"><div className="results-heading"><div><span className="eyebrow">For the curious and resourceful</span><h2>Browse listings <span className="count-pill">{displayedListings.length}</span></h2></div><label className="sort-label">Sort by <select aria-label="Sort listings" value={sortBy} onChange={handleSort}><option value="recommended">Recommended</option><option value="price-asc">Price: low to high</option></select></label></div>
          {loading ? (
            <div className="empty-state card"><h3>Loading listings...</h3><p>Fetching available items from SwapSpot.</p></div>
          ) : apiError ? (
            <div className="empty-state card" role="alert"><h3>Couldn’t reach the server</h3><p>{apiError}</p></div>
          ) : displayedListings.length ? (
            <div className="grid-auto listing-grid">{displayedListings.map((listing) => <ListingCard listing={listing} key={listing.id} />)}</div>
          ) : (
            <div className="empty-state card"><span className="empty-mark" aria-hidden="true">⌕</span><h3>No listings just yet</h3><p>Try another search or clear a filter to see what’s available.</p><button className="btn btn-secondary" type="button" onClick={resetFilters}>Clear filters</button></div>
          )}
          <p className="browse-note">Sold items are hidden so you can focus on what’s available. <Link to="/auth">Have something to share?</Link></p>
        </section>
      </main>
    </div>
  );
}

export default Browse;
