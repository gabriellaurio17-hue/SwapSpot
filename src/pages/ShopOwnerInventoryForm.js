import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Illustration from '../components/Illustration';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../utils/api';

const DEFAULT_SHOP_ID = '44444444-4444-4444-4444-444444444444';
const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'A5', 'One size'];
const categoryOptions = ['Apparel', 'Org merch', 'School supplies', 'Accessories', 'PE gear', 'Lab gear', 'Food & drinks', 'Other'];

function pickArt(category = '', title = '') {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes('book') || text.includes('supply') || text.includes('supplies') || text.includes('note')) return 'book';
  if (text.includes('calc')) return 'calculator';
  if (text.includes('lab') || text.includes('meter') || text.includes('pe')) return 'multimeter';
  return 'shirt';
}

function ShopOwnerInventoryForm({ mode }) {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Apparel',
    price: '',
    stock: 1,
    sizes: [],
    art: 'shirt',
    isRentable: false,
  });
  const [loading, setLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [saved, setSaved] = useState(false);

  // In edit mode, load the existing item from SQL Server via GET /api/Listings/{itemId}.
  useEffect(() => {
    if (mode !== 'edit' || !itemId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setApiError('');

    // GET /api/Listings/{itemId} — fetches current title, category, price, and stock from Listings table.
    fetch(`${API_BASE_URL}/api/Listings/${encodeURIComponent(itemId)}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Could not load item.');
        const data = await res.json();
        if (!cancelled) {
          setForm({
            name: data.title ?? '',
            description: '',
            category: data.category ?? 'Apparel',
            price: String(data.price ?? ''),
            stock: Number(data.stockQuantity ?? 0),
            sizes: [],
            art: pickArt(data.category, data.title),
            isRentable: Boolean(data.isRentable),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setApiError('Cannot load item from backend. Make sure the API is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [itemId, mode]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'category' || name === 'name') {
        next.art = pickArt(next.category, next.name);
      }
      return next;
    });
    setSaved(false);
    setApiError('');
  };

  const toggleSize = (size) => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.includes(size)
        ? current.sizes.filter((selectedSize) => selectedSize !== size)
        : [...current.sizes, size],
    }));
    setSaved(false);
  };

  // Submits the form to SQL Server:
  // Add mode  -> POST /api/Shops/{shopId}/inventory
  // Edit mode -> PUT  /api/Shops/{shopId}/inventory/{listingId}
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setApiError('');
    setSaved(false);

    const payload = {
      title: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      stockQuantity: Number(form.stock),
      isRentable: form.isRentable,
    };

    const url = mode === 'edit'
      ? `${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/inventory/${encodeURIComponent(itemId)}`
      : `${API_BASE_URL}/api/Shops/${DEFAULT_SHOP_ID}/inventory`;

    try {
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setApiError(data.message || 'Could not save inventory item.');
        return;
      }

      setSaved(true);
      window.setTimeout(() => navigate('/shop-owner'), 600);
    } catch {
      setApiError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'edit' && loading) {
    return (
      <main className="admin-layout">
        <aside className="admin-sidebar">
          <Link to="/shop-owner" className="admin-brand"><Logo variant="dark" /></Link>
          <span className="admin-label">SHOP WORKSPACE</span>
          <Link to="/shop-owner" className="admin-exit">← Return to inventory</Link>
        </aside>
        <section className="admin-content">
          <div className="admin-panel card inventory-not-found">
            <span className="eyebrow">Inventory</span>
            <h1>Loading item...</h1>
            <p>Fetching item details from SQL Server.</p>
          </div>
        </section>
      </main>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <main className="admin-layout">
        <aside className="admin-sidebar">
          <Link to="/shop-owner" className="admin-brand"><Logo variant="dark" /></Link>
          <span className="admin-label">SHOP WORKSPACE</span>
          <Link to="/shop-owner" className="admin-exit">← Return to inventory</Link>
        </aside>
        <section className="admin-content">
          <div className="admin-panel card inventory-not-found">
            <span className="eyebrow">Inventory</span>
            <h1>Item not found</h1>
            <p>This item may have been removed from the database.</p>
            <Link to="/shop-owner" className="btn btn-primary">Return to inventory</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/shop-owner" className="admin-brand"><Logo variant="dark" /></Link>
        <span className="admin-label">SHOP WORKSPACE</span>
        <nav aria-label="Shop owner sections">
          <Link to="/shop-owner" className="active">
            <span className="admin-nav-icon" aria-hidden="true">▣</span>
            Inventory
          </Link>
        </nav>
        <div className="admin-only">
          <span className="lock-symbol">▣</span>
          <strong>{mode === 'edit' ? 'Edit listing' : 'New listing'}</strong>
          <p>Keep item details and stock information up to date for your campus storefront.</p>
        </div>
        <Link to="/shop-owner" className="admin-exit">← Return to inventory</Link>
      </aside>

      <section className="admin-content inventory-editor-content">
        <header className="inventory-editor-heading">
          <div>
            <Link to="/shop-owner" className="inventory-back-link">← Back to inventory</Link>
            <span className="eyebrow">{mode === 'edit' ? 'Update your catalog' : 'Grow your storefront'}</span>
            <h1>{mode === 'edit' ? 'Edit item' : 'Add an item'}</h1>
            <p>{mode === 'edit' ? 'Update the details students see in your shop.' : 'Add a new product to your campus storefront.'}</p>
          </div>
          <span className="inventory-step">ITEM DETAILS <strong>01</strong></span>
        </header>

        <form className="inventory-editor-grid" onSubmit={handleSubmit}>
          <section className="admin-panel card inventory-form-panel">
            <div className="inventory-section-heading">
              <span className="eyebrow">Product information</span>
              <h2>Tell students about this item</h2>
            </div>

            <div className="inventory-fields">
              <label className="inventory-field inventory-field-wide">
                <span>Item name</span>
                <input name="name" value={form.name} onChange={updateField} placeholder="e.g. Campus hoodie" required />
              </label>
              <label className="inventory-field inventory-field-wide">
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={updateField} placeholder="Share the details students should know" rows="3" />
              </label>
              <label className="inventory-field">
                <span>Category</span>
                <select name="category" value={form.category} onChange={updateField}>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <label className="inventory-field">
                <span>Price (₱)</span>
                <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={updateField} placeholder="0.00" required />
              </label>
              <label className="inventory-field">
                <span>Available stock</span>
                <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={updateField} required />
              </label>
            </div>

            <div className="inventory-size-section">
              <span className="inventory-field-label">Available sizes or options</span>
              <div className="inventory-size-options">
                {availableSizes.map((size) => (
                  <label className={form.sizes.includes(size) ? 'inventory-size selected' : 'inventory-size'} key={size}>
                    <input type="checkbox" checked={form.sizes.includes(size)} onChange={() => toggleSize(size)} />
                    {size}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <aside className="inventory-editor-aside">
            <section className="admin-panel card inventory-image-panel">
              <div className="inventory-section-heading">
                <span className="eyebrow">Item image</span>
                <h2>Make it stand out</h2>
              </div>
              <div className="inventory-image-preview">
                <Illustration type={form.art} />
              </div>
              <label className="inventory-upload">
                <span aria-hidden="true">↑</span>
                <span><strong>Upload a photo</strong><small>JPG or PNG, up to 10 MB</small></span>
                <input type="file" accept="image/png,image/jpeg" />
              </label>
            </section>

            <section className="inventory-tip">
              <span aria-hidden="true">✦</span>
              <p><strong>Helpful tip</strong> Clear photos and specific descriptions help your campus community shop with confidence.</p>
            </section>
          </aside>

          <div className="inventory-form-actions">
            {apiError && <p className="field-error" role="alert">{apiError}</p>}
            {saved && <p className="inventory-saved" role="status">{mode === 'edit' ? 'Changes saved to database!' : 'Item added to database!'}</p>}
            <Link to="/shop-owner" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ShopOwnerInventoryForm;
