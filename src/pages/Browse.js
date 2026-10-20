import React, { useCallback, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import ListingCard from '../components/ListingCard';
import useListingFilters from '../hooks/useListingFilters';
import { listings } from '../data/mock';

const categories = ['All', 'Textbooks', 'Calculators', 'Lab gear', 'Org merch'];

function Browse() {
  const [category, setCategory] = useState('All');
  const [keyword, setKeyword] = useState('');
  const [under500, setUnder500] = useState(false);
  const filteredListings = useListingFilters(listings, category, keyword, under500);
  const handleKeyword = useCallback((event) => setKeyword(event.target.value), []);
  const handleCategory = useCallback((event) => setCategory(event.currentTarget.value), []);
  const handleBudget = useCallback(() => setUnder500((current) => !current), []);
  const resetFilters = useCallback(() => {
    setCategory('All');
    setKeyword('');
    setUnder500(false);
  }, []);

  return (
    <div className="page-shell">
      <section className="search-band photo-bg photo-bg--browse"><Topbar /><div className="search-copy container"><div><span className="eyebrow eyebrow-gold">The campus marketplace</span><h1>Find your next <em>good thing.</em></h1><p>Real finds from people around CIT-U.</p></div><label className="search-field"><span className="search-icon" aria-hidden="true">⌕</span><span className="sr-only">Search listings</span><input type="search" value={keyword} onChange={handleKeyword} placeholder="Try “calculator” or “textbooks”" /><kbd>↵</kbd></label></div></section>
      <main className="container browse-layout">
        <aside className="browse-filters"><span className="eyebrow">Refine your search</span><h2>Categories</h2><div className="category-list" role="group" aria-label="Listing categories">{categories.map((item) => <button type="button" className={`category-chip${category === item ? ' selected' : ''}`} key={item} value={item} onClick={handleCategory}><span className="category-dot" />{item}</button>)}</div><div className="filter-divider" /><button type="button" className={`budget-chip${under500 ? ' selected' : ''}`} aria-pressed={under500} onClick={handleBudget}><span className="check-square">{under500 ? '✓' : ''}</span> Under ₱500</button><div className="safe-note"><span className="safe-icon">✓</span><p><strong>Campus community</strong><br />Every member signs up with a CIT-U email.</p></div></aside>
        <section className="browse-results" aria-live="polite"><div className="results-heading"><div><span className="eyebrow">For the curious and resourceful</span><h2>Browse listings <span className="count-pill">{filteredListings.length}</span></h2></div><label className="sort-label">Sort by <select aria-label="Sort listings"><option>Recommended</option><option>Price: low to high</option></select></label></div>
          {filteredListings.length ? <div className="grid-auto listing-grid">{filteredListings.map((listing) => <ListingCard listing={listing} key={listing.id} />)}</div> : <div className="empty-state card"><span className="empty-mark" aria-hidden="true">⌕</span><h3>No listings just yet</h3><p>Try another search or clear a filter to see what’s available.</p><button className="btn btn-secondary" type="button" onClick={resetFilters}>Clear filters</button></div>}
          <p className="browse-note">Sold items are hidden so you can focus on what’s available. <Link to="/auth">Have something to share?</Link></p>
        </section>
      </main>
    </div>
  );
}

export default Browse;