import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Illustration from '../components/Illustration';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { uploadListingPhoto } from '../lib/storage';

const categories = ['Textbooks', 'Calculators', 'Lab gear', 'Electronics', 'Org merch', 'Other'];

const initialForm = {
  title: '',
  description: '',
  category: 'Textbooks',
  listingType: 'sale',
  price: '',
  depositAmount: '',
  maxRentalDays: '',
  condition: '',
  location: '',
};

async function insertListing(listing, photoPath) {
  let inserted;
  let insertError;

  try {
    inserted = await supabase
      .from('listings')
      .insert(listing)
      .select('id')
      .single();
    insertError = inserted.error;
    if (!insertError && !inserted.data?.id) {
      insertError = new Error('The listing was saved, but its ID was not returned.');
    }
  } catch (error) {
    insertError = error;
  }

  if (insertError) {
    let cleanupError;
    try {
      const { error } = await supabase.storage.from('listing-photos').remove([photoPath]);
      cleanupError = error;
    } catch (error) {
      cleanupError = error;
    }

    if (cleanupError) {
      throw new Error(`${insertError.message || 'Failed to create listing.'} Photo cleanup also failed: ${cleanupError.message || 'Unknown storage error.'}`);
    }
    throw insertError;
  }

  return inserted.data.id;
}

function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!user) {
      setError('You must be signed in to create a listing.');
      return;
    }
    if (!photo) {
      setError('Choose a photo for your listing.');
      return;
    }

    const price = Number(form.price);
    const depositAmount = Number(form.depositAmount);
    const maxRentalDays = Number(form.maxRentalDays);
    if (!form.title.trim() || form.title.trim().length > 100) {
      setError('Enter a title between 1 and 100 characters.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be zero or greater.');
      return;
    }
    if (form.listingType === 'rent') {
      if (!Number.isFinite(depositAmount) || depositAmount < 0) {
        setError('Enter a refundable deposit of zero or greater.');
        return;
      }
      if (!Number.isInteger(maxRentalDays) || maxRentalDays < 1) {
        setError('Enter a maximum rental period of at least one day.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const photoPath = await uploadListingPhoto(photo, user.id);
      const listingId = await insertListing({
        seller_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        listing_type: form.listingType,
        price,
        deposit_amount: form.listingType === 'rent' ? depositAmount : null,
        max_rental_days: form.listingType === 'rent' ? maxRentalDays : null,
        condition: form.condition.trim() || null,
        location: form.location.trim() || null,
        photo_path: photoPath,
      }, photoPath);

      navigate(`/listing?id=${encodeURIComponent(listingId)}`);
    } catch (submitError) {
      setError(submitError.message || 'Failed to create listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand"><Logo variant="dark" /></Link>
        <span className="admin-label">CAMPUS MARKETPLACE</span>
        <nav aria-label="Marketplace">
          <Link to="/browse">
            <span className="admin-nav-icon" aria-hidden="true">⌕</span>
            Browse listings
          </Link>
        </nav>
        <div className="admin-only">
          <span className="lock-symbol" aria-hidden="true">✦</span>
          <strong>Share with your campus</strong>
          <p>Clear photos and accurate details help students find the right item.</p>
        </div>
        <Link to="/browse" className="admin-exit">← Return to browse</Link>
      </aside>

      <section className="admin-content inventory-editor-content">
        <header className="inventory-editor-heading">
          <div>
            <Link to="/browse" className="inventory-back-link">← Back to browse</Link>
            <span className="eyebrow">Campus marketplace</span>
            <h1>Create a listing</h1>
            <p>Add the details students need to buy or rent your item.</p>
          </div>
          <span className="inventory-step">LISTING DETAILS <strong>01</strong></span>
        </header>

        <form className="inventory-editor-grid" onSubmit={handleSubmit}>
          <section className="admin-panel card inventory-form-panel">
            <div className="inventory-section-heading">
              <span className="eyebrow">Item information</span>
              <h2>Tell students about your item</h2>
            </div>

            <div className="inventory-fields">
              <label className="inventory-field inventory-field-wide">
                <span>Title</span>
                <input name="title" value={form.title} onChange={updateField} maxLength="100" required disabled={isSubmitting} placeholder="e.g. Casio fx-991ES Plus" />
              </label>
              <label className="inventory-field inventory-field-wide">
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={updateField} rows="3" disabled={isSubmitting} placeholder="Describe the item and anything a student should know." />
              </label>
              <label className="inventory-field">
                <span>Category</span>
                <select name="category" value={form.category} onChange={updateField} required disabled={isSubmitting}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="inventory-field">
                <span>Listing type</span>
                <select name="listingType" value={form.listingType} onChange={updateField} required disabled={isSubmitting}>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                </select>
              </label>
              <label className="inventory-field">
                <span>{form.listingType === 'rent' ? 'Price per day (₱)' : 'Price (₱)'}</span>
                <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={updateField} required disabled={isSubmitting} placeholder="0.00" />
              </label>
              {form.listingType === 'rent' && (
                <>
                  <label className="inventory-field">
                    <span>Refundable deposit (₱)</span>
                    <input name="depositAmount" type="number" min="0" step="0.01" value={form.depositAmount} onChange={updateField} required disabled={isSubmitting} placeholder="0.00" />
                  </label>
                  <label className="inventory-field">
                    <span>Maximum rental days</span>
                    <input name="maxRentalDays" type="number" min="1" step="1" value={form.maxRentalDays} onChange={updateField} required disabled={isSubmitting} placeholder="e.g. 7" />
                  </label>
                </>
              )}
              <label className="inventory-field">
                <span>Condition</span>
                <input name="condition" value={form.condition} onChange={updateField} disabled={isSubmitting} placeholder="e.g. Like new" />
              </label>
              <label className="inventory-field">
                <span>Location</span>
                <input name="location" value={form.location} onChange={updateField} disabled={isSubmitting} placeholder="e.g. Main campus" />
              </label>
            </div>
          </section>

          <aside className="inventory-editor-aside">
            <section className="admin-panel card inventory-image-panel">
              <div className="inventory-section-heading">
                <span className="eyebrow">Item photo</span>
                <h2>Show it clearly</h2>
              </div>
              <div className="inventory-image-preview">
                {photoPreview
                  ? <img src={photoPreview} alt="Selected listing preview" style={{ width: '100%', height: '180px', objectFit: 'contain' }} />
                  : <Illustration type="book" />}
              </div>
              <label className="inventory-upload">
                <span aria-hidden="true">↑</span>
                <span><strong>{photo ? photo.name : 'Upload one photo'}</strong><small>JPG, PNG, or WebP · up to 2 MB</small></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" required disabled={isSubmitting} onChange={(event) => { setPhoto(event.target.files?.[0] || null); setError(''); }} />
              </label>
            </section>

            <section className="inventory-tip">
              <span aria-hidden="true">✦</span>
              <p><strong>Helpful tip</strong> Use a clear photo and accurate description so buyers and renters know what to expect.</p>
            </section>
          </aside>

          <div className="inventory-form-actions">
            {error && <p className="field-error" role="alert">{error}</p>}
            <Link to="/browse" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading and publishing…' : 'Publish listing'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CreateListing;
