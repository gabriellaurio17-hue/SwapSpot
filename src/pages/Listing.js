import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import Illustration from '../components/Illustration';
import QrCode from '../components/QrCode';
import Stars from '../components/Stars';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { mapListing } from '../lib/mappers';
import { getGcashQrUrl } from '../lib/storage';
import useChat from '../hooks/useChat';

const rentalDays = [1, 3, 5, 7];
const millisecondsPerDay = 24 * 60 * 60 * 1000;

function formatPeso(amount) {
  return `₱${amount.toLocaleString('en-PH')}`;
}

function ListingSkeleton() {
  return (
    <div className="ld-loading-layout" role="status" aria-label="Loading listing details">
      <section>
        <div className="ld-skeleton ld-skeleton-image" />
        <div className="ld-skeleton ld-skeleton-title" />
        <div className="ld-skeleton ld-skeleton-specs" />
      </section>
      <div className="ld-skeleton ld-skeleton-panel" />
    </div>
  );
}

function Listing() {
  const location = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [listing, setListing] = useState(null);
  const [selectedDays, setSelectedDays] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [buyConfirmOpen, setBuyConfirmOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState('');
  const [requestError, setRequestError] = useState('');
  const [saved, setSaved] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState('');
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [sellerQrUrl, setSellerQrUrl] = useState('');
  const [sellerQrLoading, setSellerQrLoading] = useState(false);
  const [sellerQrError, setSellerQrError] = useState('');
  const [paymentUpdating, setPaymentUpdating] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingStatus, setRatingStatus] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [reportError, setReportError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const chatInputRef = useRef(null);
  const buyConfirmRef = useRef(null);
  const listingId = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    let cancelled = false;

    async function fetchListing() {
      setIsLoading(true);
      setLoadError(null);
      setListing(null);
      setSelectedDays(null);
      setStartDate('');
      setDueDate('');
      setBuyConfirmOpen(false);
      setRequestStatus('');
      setRequestError('');
      setReportOpen(false);
      setReportReason('');
      setReportStatus('');
      setReportError('');
      setChatOpen(false);
      setDraft('');

      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, seller:public_profiles!listings_seller_id_fkey(id, full_name, avg_rating, rating_count)')
          .eq('id', listingId)
          .maybeSingle();

        let listingData = data;
        if (error) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .maybeSingle();

          if (fallbackError) throw fallbackError;
          listingData = fallbackData;

          if (listingData?.seller_id) {
            const { data: sellerData, error: sellerError } = await supabase
              .from('public_profiles')
              .select('id, full_name, avg_rating, rating_count')
              .eq('id', listingData.seller_id)
              .maybeSingle();

            if (sellerError) throw sellerError;
            listingData = { ...listingData, seller: sellerData };
          }
        }

        if (cancelled) return;
        if (!listingData) {
          setLoadError('Listing not found');
          return;
        }
        setListing(mapListing(listingData));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load listing');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (!listingId) {
      setLoadError('Listing not found');
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    fetchListing();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    let cancelled = false;
    setTransaction(null);
    setTransactionError('');

    if (!listing?.id || !user?.id) {
      setTransactionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setTransactionLoading(true);
    async function fetchTransaction() {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, listing_id, buyer_id, seller_id, payment_method, payment_status, created_at')
          .eq('listing_id', listing.id)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setTransaction(data);
      } catch (error) {
        if (!cancelled) setTransactionError(error.message || 'Could not load transaction details.');
      } finally {
        if (!cancelled) setTransactionLoading(false);
      }
    }

    fetchTransaction();
    return () => {
      cancelled = true;
    };
  }, [listing?.id, user?.id, transactionRefresh]);

  useEffect(() => {
    let cancelled = false;
    setSellerQrUrl('');
    setSellerQrError('');

    if (!transaction || !user?.id || transaction.buyer_id !== user.id || transaction.payment_status === 'paid') {
      setSellerQrLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSellerQrLoading(true);
    async function loadSellerQr() {
      try {
        const signedUrl = await getGcashQrUrl(`${transaction.seller_id}/qr.png`);
        if (!cancelled) setSellerQrUrl(signedUrl);
      } catch (error) {
        if (!cancelled) setSellerQrError(error.message || 'Could not load the seller’s GCash QR.');
      } finally {
        if (!cancelled) setSellerQrLoading(false);
      }
    }

    loadSellerQr();
    return () => {
      cancelled = true;
    };
  }, [transaction, user?.id]);

  useEffect(() => {
    setRatingScore(0);
    setRatingComment('');
    setRatingError('');
    setRatingStatus('');
  }, [transaction?.id]);

  const isSeller = Boolean(listing && user && listing.sellerId === user.id);
  const isLoggedIn = !!user;
  const isSale = listing?.mode === 'Sell';
  const isSold = Boolean(isSale && listing?.status === 'unavailable' && Number(listing.stock) === 0);
  const isRented = Boolean(listing?.mode === 'Rent' && listing.status === 'unavailable');
  const isUnavailable = Boolean(listing && listing.status !== 'available');
  const isOutOfStock = Boolean(isSale && Number(listing?.stock) <= 0);
  const chatEnabled = Boolean(chatOpen && isLoggedIn && !isSeller && listing);
  const {
    threadId: chatThreadId,
    messages,
    loading: chatLoading,
    sending: chatSending,
    error: chatError,
    sendMessage,
  } = useChat(chatEnabled ? listing.id : null, chatEnabled ? listing.sellerId : null);
  const itemPrice = listing?.priceAmount || 0;
  const dateDurationDays = startDate && dueDate
    ? (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / millisecondsPerDay
    : null;
  const rentalTotalDays = Number.isFinite(dateDurationDays) && dateDurationDays > 0
    ? dateDurationDays
    : selectedDays;
  const rentalTotal = rentalTotalDays ? rentalTotalDays * itemPrice : null;
  const daysExceedMax = Boolean(
    listing?.maxRentalDays
      && Number.isFinite(dateDurationDays)
      && dateDurationDays > listing.maxRentalDays
  );
  const rentalDateError = Number.isFinite(dateDurationDays)
    ? dateDurationDays <= 0
      ? 'Return date must be after the start date.'
      : listing?.maxRentalDays && dateDurationDays > listing.maxRentalDays
        ? `Maximum rental period is ${listing.maxRentalDays} days.`
        : ''
    : '';

  const relatedListings = useMemo(() => [], []);

  useEffect(() => {
    if (chatOpen && !chatLoading) chatInputRef.current?.focus();
  }, [chatOpen, chatLoading]);

  useEffect(() => {
    if (!buyConfirmOpen) return undefined;
    buyConfirmRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && requestStatus !== 'sending') {
        setBuyConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [buyConfirmOpen, requestStatus]);

  const handleChatSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!draft.trim() || chatSending || !chatThreadId) return;
    const sent = await sendMessage(draft);
    if (sent) setDraft('');
  }, [draft, chatSending, chatThreadId, sendMessage]);

  const handleRequest = useCallback(async () => {
    if (!listing || isLoading || isUnavailable || isOutOfStock || isSeller || !user) return;
    setRequestError('');

    if (isSale) {
      try {
        setRequestStatus('sending');
        const { error } = await supabase.rpc('start_transaction', { p_listing: listing.id });
        if (error) throw error;
        setRequestStatus('sent');
        setBuyConfirmOpen(false);
        setTransactionRefresh((current) => current + 1);
        const { data: currentListing, error: stockError } = await supabase
          .from('listings')
          .select('stock, status')
          .eq('id', listing.id)
          .single();
        if (stockError) {
          setRequestError(`Transaction started, but stock could not be refreshed: ${stockError.message}`);
        } else {
          setListing((current) => current
            ? { ...current, stock: currentListing.stock, status: currentListing.status }
            : current);
        }
      } catch (err) {
        setRequestStatus('');
        setRequestError(err.message || 'Failed to start transaction');
      }
      return;
    }

    if (!startDate || !dueDate) {
      setRequestError('Please select both start and return dates.');
      return;
    }
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const due = Date.parse(`${dueDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(due)) {
      setRequestError('Please enter valid rental dates.');
      return;
    }
    if (due <= start) {
      setRequestError('Return date must be after the start date.');
      return;
    }
    const diffDays = (due - start) / millisecondsPerDay;
    if (listing.maxRentalDays && diffDays > listing.maxRentalDays) {
      setRequestError(`Maximum rental period is ${listing.maxRentalDays} days.`);
      return;
    }

    try {
      setRequestStatus('sending');
      const { error } = await supabase.rpc('request_rental', {
        p_listing: listing.id,
        p_start: startDate,
        p_due: dueDate,
      });
      if (error) throw error;
      setRequestStatus('sent');
      setTransactionRefresh((current) => current + 1);
    } catch (err) {
      setRequestStatus('');
      setRequestError(err.message || 'Failed to send rental request');
    }
  }, [listing, isLoading, isUnavailable, isOutOfStock, isSeller, user, isSale, startDate, dueDate]);

  const handleMarkPaid = useCallback(async (paymentMethod) => {
    if (!transaction || !user || transaction.buyer_id !== user.id || transaction.payment_status === 'paid') return;

    setPaymentUpdating(paymentMethod);
    setPaymentError('');
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ payment_method: paymentMethod, payment_status: 'paid' })
        .eq('id', transaction.id)
        .select('id, listing_id, buyer_id, seller_id, payment_method, payment_status, created_at')
        .single();
      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      setPaymentError(error.message || 'Could not update the payment status.');
    } finally {
      setPaymentUpdating('');
    }
  }, [transaction, user]);

  const handleRatingSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!transaction || !user || transaction.payment_status !== 'paid') return;
    if (ratingScore < 1 || ratingScore > 5) {
      setRatingError('Choose a rating from 1 to 5 stars.');
      return;
    }

    const rateeId = transaction.buyer_id === user.id
      ? transaction.seller_id
      : transaction.buyer_id;
    setRatingSubmitting(true);
    setRatingError('');
    try {
      const { error } = await supabase.from('ratings').insert({
        transaction_id: transaction.id,
        rater_id: user.id,
        ratee_id: rateeId,
        score: ratingScore,
        comment: ratingComment.trim(),
      });
      if (error) {
        if (error.code === '23505') {
          setRatingError('You have already rated this transaction.');
          return;
        }
        throw error;
      }
      setRatingStatus('sent');
    } catch (error) {
      setRatingError(error.message || 'Could not submit your rating.');
    } finally {
      setRatingSubmitting(false);
    }
  }, [transaction, user, ratingScore, ratingComment]);

  const handleReport = useCallback(async () => {
    if (!user || !listing) {
      setReportError('Please log in to file a report.');
      return;
    }
    if (!reportReason.trim()) {
      setReportError('Please enter a reason.');
      return;
    }
    setReportStatus('sending');
    setReportError('');
    try {
      const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: user.id, target_listing_id: listing.id, reason: reportReason.trim() });
      if (error) throw error;
      setReportStatus('sent');
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      setReportStatus('');
      setReportError(err.message || 'Failed to submit report.');
    }
  }, [user, listing, reportReason]);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="container ld-page">
        {isLoading ? (
          <ListingSkeleton />
        ) : loadError || !listing ? (
          <section className="card ld-state-card" role="alert">
            <span className="eyebrow">Listing unavailable</span>
            <h1>Listing not found</h1>
            <p>{loadError || 'It may have been removed or the link may be incorrect.'}</p>
            <Link to="/browse" className="btn btn-primary">Back to browse</Link>
          </section>
        ) : (
          <>
            <nav className="ld-breadcrumb" aria-label="Breadcrumb">
              <Link to="/browse">Browse</Link>
              <span aria-hidden="true">/</span>
              <span>{listing.category}</span>
            </nav>

            <div className="ld-layout">
              <section className="ld-main">
                <div className="ld-photo-stage">
                  <span className="ld-ring" aria-hidden="true" />
                  <span className="ld-ring-dashed" aria-hidden="true" />
                  <span className="ld-ring-dot" aria-hidden="true" />
                  {listing.photoUrl ? (
                    <img
                      className="ld-listing-photo"
                      src={listing.photoUrl}
                      alt={listing.title}
                      style={{
                        width: '80%',
                        height: '80%',
                        position: 'relative',
                        zIndex: 1,
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Illustration type={listing.art} className="ld-product-art" />
                  )}
                  <div className="ld-photo-meta">
                    <span className="ld-photo-chip">{listing.photoUrl ? '01 / 01 photo' : 'Product illustration'}</span>
                    {listing.photoUrl && <span className="ld-photo-chip">Listing photo</span>}
                  </div>
                  <button
                    className={`ld-favorite${saved ? ' is-saved' : ''}`}
                    type="button"
                    aria-label={saved ? 'Remove from saved listings' : 'Save listing'}
                    aria-pressed={saved}
                    onClick={() => setSaved((current) => !current)}
                  >
                    <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
                  </button>
                  <div className="ld-photo-pager" role="group" aria-label="Photo 1 of 3">
                    <span className="active" aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </div>
                </div>

                <div className="ld-details">
                  <div className="ld-tags">
                    {isUnavailable ? (
                      <span className="badge badge-maroon">{isSold ? 'Sold' : isRented ? 'Rented' : 'Unavailable'}</span>
                    ) : (
                      <span className={`badge ${isSale ? 'badge-maroon' : 'badge-gold'}`}>{isSale ? 'For sale' : 'For rent'}</span>
                    )}
                    <span className="chip">{listing.category}</span>
                    <span className="chip">{listing.condition}</span>
                    {isSale && <span className="chip">{isOutOfStock ? 'Out of stock' : `${listing.stock} in stock`}</span>}
                  </div>

                  <h1 className="ld-title">{listing.title}</h1>
                  <div className="ld-seller-line">
                    <span>Listed by {listing.sellerName || 'Seller'}</span>
                    <span className="ld-separator" aria-hidden="true">·</span>
                    <span className="verified-inline">✓ Verified @cit.edu</span>
                    {listing.sellerName && (
                      <>
                        <span className="ld-separator" aria-hidden="true">·</span>
                        <Stars rating={listing.sellerRating} count={listing.sellerRatingCount} compact />
                      </>
                    )}
                  </div>
                  <p className="ld-description">
                    {listing.title} in {listing.condition.toLowerCase()} condition. A useful campus find, ready for pickup at {listing.location}.
                  </p>

                  <div className={`ld-specs${isSale ? ' ld-specs-sale' : ''}`} aria-label="Listing details">
                    <div className="ld-spec">
                      <span className="ld-spec-icon" aria-hidden="true">{isSale ? '₱' : '₱'}</span>
                      <span className="ld-spec-label">{isSale ? 'Price' : 'Rental rate'}</span>
                      <strong>{isSale ? listing.price : `${formatPeso(itemPrice)} / day`}</strong>
                    </div>
                    {!isSale && (
                      <>
                        <div className="ld-spec">
                          <span className="ld-spec-icon" aria-hidden="true">↺</span>
                          <span className="ld-spec-label">Refundable deposit</span>
                          <strong>{formatPeso(listing.depositAmount)}</strong>
                        </div>
                        <div className="ld-spec">
                          <span className="ld-spec-icon" aria-hidden="true">◷</span>
                          <span className="ld-spec-label">Maximum period</span>
                          <strong>{listing.maxRentalDays || 7} days</strong>
                        </div>
                      </>
                    )}
                    <div className="ld-spec">
                      <span className="ld-spec-icon" aria-hidden="true">✓</span>
                      <span className="ld-spec-label">Condition</span>
                      <strong>{listing.condition}</strong>
                    </div>
                  </div>

                  {!isSale && (
                    <section className="ld-duration" aria-label="Rental duration">
                      <div className="ld-duration-top">
                        <div className="ld-duration-picker">
                          <span className="ld-duration-label">DAYS</span>
                          <div className="ld-day-options">
                            {rentalDays.map((days) => (
                              <button
                                type="button"
                                className={selectedDays === days ? 'selected' : ''}
                                aria-pressed={selectedDays === days}
                                key={days}
                                onClick={() => {
                                  setSelectedDays(days);
                                  setRequestStatus('');
                                  setRequestError('');
                                  setStartDate('');
                                  setDueDate('');
                                }}
                              >
                                {days}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="ld-date-picker">
                          <label className="ld-date-label">Start date</label>
                          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setRequestStatus(''); setRequestError(''); }} />
                          <label className="ld-date-label">Return date</label>
                          <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setRequestStatus(''); setRequestError(''); }} />
                        </div>
                        <div className="ld-total" aria-live="polite">
                          <strong>{rentalTotal === null ? 'Select days' : `Total ${formatPeso(rentalTotal)}`}</strong>
                          <span>{rentalTotal === null ? 'to see your total' : `+ ${formatPeso(listing.depositAmount)} deposit`}</span>
                        </div>
                      </div>
                      {rentalDateError && <p className="ld-request-feedback" role="alert">{rentalDateError}</p>}
                    </section>
                  )}

                  {!isLoggedIn ? (
                    <Link to="/auth?mode=login" className="btn btn-primary ld-cta">Log in to continue</Link>
                  ) : !isSeller ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary ld-cta"
                        disabled={isUnavailable || isOutOfStock || requestStatus === 'sending' || requestStatus === 'sent' || (!isSale && (!selectedDays || !startDate || !dueDate || daysExceedMax || rentalDateError))}
                        onClick={() => {
                          if (isSale) {
                            setRequestError('');
                            setBuyConfirmOpen(true);
                          } else {
                            handleRequest();
                          }
                        }}
                      >
                        {isUnavailable || isOutOfStock
                          ? isOutOfStock ? 'Out of stock' : 'Unavailable'
                          : requestStatus === 'sending'
                            ? 'Sending...'
                            : requestStatus === 'sent'
                            ? isSale ? 'Transaction started' : 'Request sent'
                            : isSale
                              ? 'Buy now'
                              : <>Request to rent <span aria-hidden="true">→</span></>}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary ld-cta"
                        aria-expanded={chatOpen}
                        onClick={() => setChatOpen(true)}
                      >
                        Chat with seller
                      </button>
                      {requestError && <p className="ld-request-feedback" role="alert">{requestError}</p>}
                      {requestStatus === 'sent' && (
                        <p className="ld-request-feedback" role="status">
                          {isSale ? 'Transaction started.' : <>Request sent. <Link to="/rentals">View rentals</Link></>}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {isSeller && (
                        <p className="ld-seller-notice">This is your listing.</p>
                      )}
                    </>
                  )}
                  {buyConfirmOpen && isSale && (
                    <div className="ld-buy-confirm-backdrop">
                      <section
                        className="ld-buy-confirm-card"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="ld-buy-confirm-title"
                        aria-describedby="ld-buy-confirm-description"
                      >
                        <span className="eyebrow">Confirm purchase</span>
                        <h2 id="ld-buy-confirm-title">Ready to buy?</h2>
                        <p id="ld-buy-confirm-description">
                          Start a transaction for <strong>{listing.title}</strong> at <strong>{formatPeso(itemPrice)}</strong>?
                        </p>
                        <p className="ld-buy-confirm-note">You can coordinate payment and pickup with the seller after confirming.</p>
                        {requestError && <p className="field-error" role="alert">{requestError}</p>}
                        <div className="ld-buy-confirm-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setBuyConfirmOpen(false)}
                            disabled={requestStatus === 'sending'}
                          >
                            Cancel
                          </button>
                          <button
                            ref={buyConfirmRef}
                            type="button"
                            className="btn btn-primary"
                            onClick={handleRequest}
                            disabled={requestStatus === 'sending' || isOutOfStock}
                          >
                            {requestStatus === 'sending' ? 'Starting…' : 'Confirm purchase'}
                          </button>
                        </div>
                      </section>
                    </div>
                  )}
                  <button
                    type="button"
                    className="ld-report-link"
                    onClick={() => {
                      setReportError('');
                      setReportStatus('');
                      if (!isLoggedIn) {
                        setReportError('Log in to report this listing.');
                        return;
                      }
                      setReportOpen(true);
                    }}
                  >
                    Report this listing
                  </button>
                  {reportError && !reportOpen && <p className="ld-request-feedback" role="alert">{reportError}</p>}
                  {reportStatus === 'sent' && <p className="ld-request-feedback" role="status">Report submitted.</p>}

                  {reportOpen && isLoggedIn && (
                    <section className="ld-report-dialog" role="dialog" aria-modal="true" aria-label="Report listing">
                      <div className="ld-report-dialog-content">
                        <span className="eyebrow">Report this listing</span>
                        <h2>Why are you reporting?</h2>
                        <textarea
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Describe the issue…"
                          rows="3"
                          className="ld-report-textarea"
                        />
                        <div className="ld-report-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => setReportOpen(false)} disabled={reportStatus === 'sending'}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={handleReport} disabled={!reportReason.trim() || reportStatus === 'sending'}>
                            {reportStatus === 'sending' ? 'Submitting...' : 'Submit report'}
                          </button>
                        </div>
                        {reportError && <p className="ld-request-feedback" role="alert">{reportError}</p>}
                      </div>
                    </section>
                  )}

                  <section className="ld-more">
                    <div className="ld-more-heading">
                      <h2>More from {listing.sellerName || 'Seller'}</h2>
                      <Link to="/browse">View all</Link>
                    </div>
                    <div className="ld-related-items">
                      {relatedListings.map((item, index) => (
                        <Link className="ld-related-item" to={`/listing?id=${item.id}`} key={item.id}>
                          <span className={`ld-related-thumb ld-related-thumb-${index + 1}`}>
                            <Illustration type={item.art} />
                          </span>
                          <span className="ld-related-copy">
                            <strong>{item.title}</strong>
                            <small>{item.price}</small>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
              </section>

              <aside className="ld-sidebar">
                {isLoggedIn && !isSeller && chatOpen && (
                  <section className="card ld-card ld-chat-card">
                    <div className="ld-card-heading">
                      <div>
                        <span className="eyebrow">Direct messages</span>
                        <h2>Chat with {listing.sellerName || 'Seller'}</h2>
                      </div>
                      <span className="online-dot" aria-label="Online" />
                    </div>
                    <div className="ld-chat-log" aria-live="polite" aria-label="Chat messages">
                      {chatLoading && <p role="status">Loading conversation…</p>}
                      {chatError && <p className="field-error" role="alert">{chatError}</p>}
                      {!chatLoading && !chatError && messages.length === 0 && <p>No messages yet. Send the first one.</p>}
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === user.id;
                        return (
                          <div className={`message${isOwnMessage ? ' message-own' : ''}`} key={message.id}>
                            <span className="message-sender">{isOwnMessage ? 'You' : listing.sellerName || 'Seller'}</span>
                            <p>{message.body}</p>
                          </div>
                        );
                      })}
                    </div>
                    <form className="ld-chat-form" onSubmit={handleChatSubmit}>
                      <label className="sr-only" htmlFor="ld-message">Write a message</label>
                      <input
                        id="ld-message"
                        ref={chatInputRef}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Write a message…"
                        maxLength="1000"
                        disabled={chatLoading || chatSending || !chatThreadId}
                      />
                      <button type="submit" aria-label="Send message" disabled={!draft.trim() || chatLoading || chatSending || !chatThreadId}>
                        {chatSending ? '…' : '→'}
                      </button>
                    </form>
                  </section>
                )}

                {isLoggedIn && (
                  <section className="card ld-card ld-payment-card">
                    <div className="ld-card-heading">
                      <div>
                        <span className="eyebrow">Transaction details</span>
                        <h2>Payment &amp; handoff</h2>
                      </div>
                      <span className="panel-icon" aria-hidden="true">₱</span>
                    </div>
                    {transactionLoading && <p role="status">Loading transaction…</p>}
                    {transactionError && <p className="field-error" role="alert">{transactionError}</p>}
                    {!transactionLoading && !transactionError && !transaction && (
                      <p>No transaction for this listing yet.</p>
                    )}
                    {transaction && (
                      <>
                        {transaction.payment_status === 'paid' ? (
                          <p role="status">
                            Payment marked as paid{transaction.payment_method ? ` with ${transaction.payment_method === 'gcash' ? 'GCash' : 'Cash'}` : ''}.
                          </p>
                        ) : transaction.buyer_id === user.id ? (
                          <>
                            <div className="ld-payment-qr">
                              {sellerQrLoading ? (
                                <span role="status">Loading seller QR…</span>
                              ) : sellerQrError ? (
                                <span className="field-error" role="alert">{sellerQrError}</span>
                              ) : sellerQrUrl ? (
                                <QrCode src={sellerQrUrl} label="Seller’s GCash QR code" />
                              ) : (
                                <span>Seller QR unavailable</span>
                              )}
                              <span>Seller’s GCash QR</span>
                            </div>
                            <p className="ld-payment-disclaimer">SwapSpot does not verify GCash transfers.</p>
                            <div className="ld-payment-options" role="group" aria-label="Mark payment as paid">
                              <button
                                type="button"
                                disabled={Boolean(paymentUpdating)}
                                onClick={() => handleMarkPaid('gcash')}
                              >
                                {paymentUpdating === 'gcash' ? 'Updating…' : 'Mark as Paid (GCash)'}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(paymentUpdating)}
                                onClick={() => handleMarkPaid('cash')}
                              >
                                {paymentUpdating === 'cash' ? 'Updating…' : 'Mark as Paid (Cash)'}
                              </button>
                            </div>
                            {paymentError && <p className="field-error" role="alert">{paymentError}</p>}
                          </>
                        ) : (
                          <p>Waiting for the buyer to mark this transaction as paid.</p>
                        )}
                        {transaction.payment_status === 'paid' && (
                          <div style={{ marginTop: 16 }}>
                            <div className="ld-card-heading">
                              <div>
                                <span className="eyebrow">Your experience</span>
                                <h2>Rate your trading partner</h2>
                              </div>
                            </div>
                            {ratingStatus === 'sent' ? (
                              <p role="status">Thanks for sharing your rating.</p>
                            ) : (
                              <form onSubmit={handleRatingSubmit}>
                                <div className="ld-day-options" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <button
                                      type="button"
                                      key={score}
                                      className={score <= ratingScore ? 'selected' : ''}
                                      aria-label={`Rate ${score} out of 5 stars`}
                                      aria-pressed={ratingScore === score}
                                      onClick={() => setRatingScore(score)}
                                    >
                                      {score <= ratingScore ? '★' : '☆'}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={ratingComment}
                                  onChange={(event) => setRatingComment(event.target.value)}
                                  placeholder="Leave a comment (optional)"
                                  rows="3"
                                  className="ld-report-textarea"
                                  aria-label="Rating comment"
                                />
                                {ratingError && <p className="field-error" role="alert">{ratingError}</p>}
                                <button
                                  type="submit"
                                  className="btn btn-primary"
                                  disabled={ratingSubmitting || ratingScore === 0}
                                  style={{ marginTop: 8 }}
                                >
                                  {ratingSubmitting ? 'Submitting…' : 'Submit rating'}
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Listing;