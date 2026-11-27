import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Illustration from '../components/Illustration';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { uploadListingPhoto } from '../lib/storage';

const categories = ['Textbooks', 'Calculators', 'Lab gear', 'Electronics', 'Org merch', 'Other'];

function ShopOwnerInventoryForm({ mode }) {
  const { itemId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveMode = mode === 'edit' ? 'edit' : 'new';
  const [form, setForm] = useState(() => ({
    title: '',
    description: '',
    category: 'Other',
    price: '',
    stock: 0,
    status: 'available',
    condition: '',
    photoPath: null,
  }));
  const [photoFile, setPhotoFile] = useState(null);
  const [art, setArt] = useState('book');
  const [shop, setShop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      if (!user?.id) {
        setLoadError('Please log in to manage your inventory.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');
      try {
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (shopError) throw shopError;
        if (!cancelled) setShop(shopData);

        if (effectiveMode === 'edit') {
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', itemId)
            .maybeSingle();
          if (listingError) throw listingError;
          if (!listingData) throw new Error('Listing not found');
          if (listingData.seller_id !== user.id) throw new Error('You can only edit your own listings.');

          if (!cancelled) {
            setForm({
              title: listingData.title || '',
              description: listingData.description || '',
              category: listingData.category || 'Other',
              price: listingData.price ?? '',
              stock: listingData.stock ?? 0,
              status: listingData.status || 'available',
              condition: listingData.condition || '',
              photoPath: listingData.photo_path || null,
            });
            setArt({
              Textbooks: 'book',
              Calculators: 'calculator',
              'Lab gear': 'multimeter',
              'Org merch': 'shirt',
            }[listingData.category] || 'book');
          }
        }
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Could not load this inventory item.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFormData();
    return () => {
      cancelled = true;
    };
  }, [effectiveMode, itemId, user?.id]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'category') {
      setArt({
        Textbooks: 'book',
        Calculators: 'calculator',
        'Lab gear': 'multimeter',
        'Org merch': 'shirt',
      }[value] || 'book');
    }
    setSaved(false);
    setSaveError('');
  };

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setSaveError('');
    setSaved(false);

    if (!user?.id || !shop) {
      setSaveError('You do not have a shop associated with this account.');
      return;
    }
    if (!shop.id) {
      setSaveError('Your shop record is missing a valid ID.');
      return;
    }
    if (shop.status !== 'approved') {
      setSaveError('Your shop must be approved before listing items.');
      return;
    }
    if (effectiveMode === 'new' && !photoFile) {
      setSaveError('Choose a photo for the new listing.');
      return;
    }
    if (!form.title.trim()) {
      setSaveError('Item name is required.');
      return;
    }
    if (Number(form.price) < 0) {
      setSaveError('Price cannot be negative.');
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setSaveError('Stock must be a whole number of 0 or more.');
      return;
    }

    setIsSaving(true);
    let uploadedPath = null;
    try {
      if (photoFile) {
        uploadedPath = await uploadListingPhoto(photoFile, user.id);
      }

      const listingValues = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number(form.price),
        stock: Number(form.stock),
        condition: form.condition.trim() || null,
        ...(uploadedPath ? { photo_path: uploadedPath } : {}),
      };

      if (effectiveMode === 'new') {
        const { data, error } = await supabase
          .from('listings')
          .insert({
            ...listingValues,
            seller_id: user.id,
            shop_id: shop.id,
            listing_type: 'sale',
            status: 'available',
            photo_path: uploadedPath,
          })
          .select('id')
          .single();
        if (error) throw error;
        setSaved(true);
        navigate('/shop-owner', { replace: true, state: { itemAdded: data.id } });
        return;
      }

      const restoreSoldListing = Number(form.stock) > 0 && form.status === 'unavailable';
      const { error } = await supabase
        .from('listings')
        .update({
          ...listingValues,
          ...(restoreSoldListing ? { status: 'available' } : {}),
        })
        .eq('id', itemId);
      if (error) throw error;
      setSaved(true);
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from('listing-photos').remove([uploadedPath]);
      }
      setSaveError(error.message || 'Could not save this listing.');
    } finally {
      setIsSaving(false);
    }
  }, [effectiveMode, form, itemId, navigate, photoFile, shop, user?.id]);

  const handleRemove = useCallback(async () => {
    if (effectiveMode !== 'edit' || !itemId) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'removed' })
        .eq('id', itemId);
      if (error) throw error;
      navigate('/shop-owner');
    } catch (error) {
      setSaveError(error.message || 'Could not remove this listing.');
    } finally {
      setIsSaving(false);
    }
  }, [effectiveMode, itemId, navigate]);

  if (isLoading) {
    return (
      <main className="admin-layout">
        <aside className="admin-sidebar">
          <Link to="/shop-owner" className="admin-brand"><Logo variant="dark" /></Link>
          <span className="admin-label">SHOP WORKSPACE</span>
        </aside>
        <section className="admin-content"><p role="status">Loading inventory item…</p></section>
      </main>
    );
  }

  if (loadError && effectiveMode === 'edit') {
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
            <p role="alert">{loadError}</p>
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
          <strong>{effectiveMode === 'edit' ? 'Edit listing' : 'New listing'}</strong>
          <p>Keep item details and stock information up to date for your campus storefront.</p>
        </div>
        <Link to="/shop-owner" className="admin-exit">← Return to inventory</Link>
      </aside>

      <section className="admin-content inventory-editor-content">
        <header className="inventory-editor-heading">
          <div>
            <Link to="/shop-owner" className="inventory-back-link">← Back to inventory</Link>
            <span className="eyebrow">{effectiveMode === 'edit' ? 'Update your catalog' : 'Grow your storefront'}</span>
            <h1>{effectiveMode === 'edit' ? 'Edit item' : 'Add an item'}</h1>
            <p>{effectiveMode === 'edit' ? 'Update the details students see in your shop.' : 'Add a new product to your campus storefront.'}</p>
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
                <input name="title" value={form.title} onChange={updateField} placeholder="e.g. Campus hoodie" maxLength="100" required />
              </label>
              <label className="inventory-field inventory-field-wide">
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={updateField} placeholder="Share the details students should know" rows="3" />
              </label>
              <label className="inventory-field">
                <span>Category</span>
                <select name="category" value={form.category} onChange={updateField}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="inventory-field">
                <span>Condition</span>
                <input name="condition" value={form.condition} onChange={updateField} placeholder="e.g. Like new" />
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
            {shop?.status !== 'approved' && (
              <p className="field-error" role="alert">Your shop must be approved before you can add or edit listings.</p>
            )}
          </section>

          <aside className="inventory-editor-aside">
            <section className="admin-panel card inventory-image-panel">
              <div className="inventory-section-heading">
                <span className="eyebrow">Item image</span>
                <h2>Make it stand out</h2>
              </div>
              <div className="inventory-image-preview">
                <Illustration type={art} />
              </div>
              <label className="inventory-upload">
                <span aria-hidden="true">↑</span>
                <span><strong>Upload a photo</strong><small>JPG or PNG, up to 2 MB</small></span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    setPhotoFile(event.target.files?.[0] || null);
                    setSaved(false);
                    setSaveError('');
                  }}
                  required={effectiveMode === 'new'}
                />
              </label>
            </section>

            <section className="inventory-tip">
              <span aria-hidden="true">✦</span>
              <p><strong>Helpful tip</strong> Clear photos and specific descriptions help your campus community shop with confidence.</p>
            </section>
          </aside>

          <div className="inventory-form-actions">
            {saved && <p className="inventory-saved" role="status">{effectiveMode === 'edit' ? 'Changes saved.' : 'Item added.'}</p>}
            {saveError && <p className="field-error" role="alert">{saveError}</p>}
            {effectiveMode === 'edit' && (
              <button type="button" className="btn btn-secondary" onClick={handleRemove} disabled={isSaving}>Remove</button>
            )}
            <Link to="/shop-owner" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSaving || shop?.status !== 'approved'}>
              {isSaving ? 'Saving…' : effectiveMode === 'edit' ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ShopOwnerInventoryForm;
