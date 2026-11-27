import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

function ShopApply() {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shopType, setShopType] = useState('organization');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [applicationSent, setApplicationSent] = useState(false);

  const loadShop = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setError('Log in to apply to open a shop.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('shops')
        .select('id, name, description, shop_type, status')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (queryError) throw queryError;
      setShop(data);
    } catch (loadError) {
      setError(loadError.message || 'Could not load your shop application.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Enter a shop name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim(),
          shop_type: shopType,
          status: 'pending',
        })
        .select('id, name, description, shop_type, status')
        .single();
      if (insertError) {
        if (insertError.code === '23505') {
          await loadShop();
          return;
        }
        throw insertError;
      }

      setShop(data);
      setApplicationSent(true);
    } catch (submitError) {
      setError(submitError.message || 'Could not submit your shop application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <Topbar />
      <main className="container shop-page">
        <div className="shop-section-heading">
          <div>
            <span className="eyebrow">Campus storefronts</span>
            <h1>Open a shop</h1>
          </div>
          <Link className="btn btn-secondary" to="/shop">Browse shops</Link>
        </div>

        <section className="card" style={{ maxWidth: 680, padding: 28, margin: '0 auto' }}>
          {isLoading ? (
            <p role="status">Checking for an existing shop…</p>
          ) : error && !shop ? (
            <>
              <p className="field-error" role="alert">{error}</p>
              <button type="button" className="btn btn-secondary" onClick={loadShop}>Try again</button>
            </>
          ) : shop ? (
            <div role="status">
              <span className="eyebrow">Your application</span>
              <h2>{shop.name}</h2>
              <p>Shop status: <strong>{shop.status}</strong></p>
              {applicationSent && shop.status === 'pending' && (
                <p className="inventory-saved">Application sent, waiting for admin approval</p>
              )}
              {shop.status !== 'pending' && (
                <p>{shop.status === 'approved'
                  ? 'Your shop is approved and ready to list items.'
                  : `Your application is currently ${shop.status}.`}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="inventory-section-heading">
                <span className="eyebrow">Shop application</span>
                <h2>Tell us about your shop</h2>
              </div>
              <div className="inventory-fields" style={{ marginTop: 20 }}>
                <label className="inventory-field inventory-field-wide">
                  <span>Shop name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength="80"
                    required
                    placeholder="Your organization or shop name"
                  />
                </label>
                <label className="inventory-field inventory-field-wide">
                  <span>Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows="4"
                    placeholder="What will your shop offer?"
                  />
                </label>
                <label className="inventory-field">
                  <span>Shop type</span>
                  <select value={shopType} onChange={(event) => setShopType(event.target.value)}>
                    <option value="organization">Organization</option>
                    <option value="individual">Individual</option>
                  </select>
                </label>
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="inventory-form-actions" style={{ marginTop: 22 }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending application…' : 'Submit application'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default ShopApply;
