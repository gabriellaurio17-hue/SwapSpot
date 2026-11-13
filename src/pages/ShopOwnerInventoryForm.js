import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import Illustration from '../components/Illustration';
import Logo from '../components/Logo';
import inventory from '../data/shopOwnerInventory';

const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'A5', 'One size'];

function ShopOwnerInventoryForm({ mode }) {
  const { itemId } = useParams();
  const existingItem = mode === 'edit' ? inventory.find((item) => item.id === itemId) : null;
  const [form, setForm] = useState(() => ({
    name: existingItem?.name ?? '',
    description: existingItem?.description ?? '',
    category: existingItem?.category ?? 'Apparel',
    price: existingItem?.price.replace(/[^\d.]/g, '') ?? '',
    stock: existingItem?.stock ?? 0,
    sizes: existingItem?.sizes ?? [],
    art: existingItem?.art ?? 'shirt',
  }));
  const [saved, setSaved] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
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

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaved(true);
  };

  if (mode === 'edit' && !existingItem) {
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
            <p>This item may have been removed from the demo inventory.</p>
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
                  <option>Apparel</option>
                  <option>School supplies</option>
                  <option>Accessories</option>
                  <option>Food &amp; drinks</option>
                  <option>Other</option>
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
            {saved && <p className="inventory-saved" role="status">{mode === 'edit' ? 'Changes saved in this preview.' : 'Item added in this preview.'}</p>}
            <Link to="/shop-owner" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save changes' : 'Add item'}</button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ShopOwnerInventoryForm;
