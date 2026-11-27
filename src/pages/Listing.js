import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import Illustration from '../components/Illustration';
import QrCode from '../components/QrCode';
import Stars from '../components/Stars';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';

const rentalDays = [1, 3, 5, 7];

function formatPeso(amount) {
  return `₱${Number(amount).toLocaleString('en-PH')}`;
}

function pickArt(category = '', title = '') {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes('calc')) return 'calculator';
  if (text.includes('book') || text.includes('supply') || text.includes('supplies') || text.includes('note')) return 'book';
  if (text.includes('lab') || text.includes('meter') || text.includes('goggle') || text.includes('pe') || text.includes('mat')) return 'multimeter';
  return 'shirt';
}

function formatSellerName(shopName, sellerEmail) {
  if (shopName) return shopName;
  if (!sellerEmail) return 'CIT-U Student';
  const prefix = sellerEmail.split('@')[0].replace(/[._-]+/g, ' ');
  return prefix.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function mapApiListing(item) {
  const numericPrice = Number(item.price ?? 0);
  const formattedPrice = formatPeso(numericPrice);
  const sellerName = formatSellerName(item.shopName, item.sellerEmail);
  return {
    id: item.listingId,
    sellerId: item.sellerId,
    sellerEmail: item.sellerEmail || '',
    sellerName,
    shopName: item.shopName || null,
    title: item.title,
    category: item.category,
    stockQuantity: Number(item.stockQuantity ?? 0),
    condition: `${item.stockQuantity} in stock`,
    price: item.isRentable ? `${formattedPrice} / day` : formattedPrice,
    priceValue: numericPrice,
    mode: item.isRentable ? 'Rent' : 'Sell',
    rating: 4.9,
    location: item.shopName || 'CIT-U Campus',
    art: pickArt(item.category, item.title),
  };
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
  const listingId = new URLSearchParams(location.search).get('id');

  const [listing, setListing] = useState(null);
  const [allListings, setAllListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(null);
  const [payment, setPayment] = useState('gcash');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [requestStatus, setRequestStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paidMethod, setPaidMethod] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSelectedDays(null);
    setDraft('');
    setRequestStatus('');
    setActionError('');
    setSaved(false);
    setPaidMethod('');

    const loadData = async () => {
      try {
        const listRes = await fetch(`${API_BASE_URL}/api/Listings`);
        const listData = listRes.ok ? await listRes.json() : [];
        const mappedList = Array.isArray(listData) ? listData.map(mapApiListing) : [];
        if (!cancelled) setAllListings(mappedList);

        let target = null;
        if (listingId) {
          const detailRes = await fetch(`${API_BASE_URL}/api/Listings/${encodeURIComponent(listingId)}`);
          if (detailRes.ok) {
            target = mapApiListing(await detailRes.json());
          }
        } else if (mappedList.length > 0) {
          target = mappedList[0];
        }

        if (!cancelled) {
          setListing(target);
          setMessages(
            target
              ? [
                  {
                    id: 'welcome-msg',
                    sender: target.sellerName,
                    text: `Hi! "${target.title}" is available on campus. Let me know when you'd like to meet up.`,
                    own: false,
                  },
                ]
              : [],
          );
        }
      } catch {
        if (!cancelled) setListing(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const handleSend = useCallback((event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: `message-${Date.now()}`, sender: 'You', text, own: true }]);
    setDraft('');
  }, [draft]);

  const handleRequest = useCallback(async () => {
    if (!listing || isLoading || listing.stockQuantity <= 0 || actionLoading) return;

    setActionError('');

    if (listing.mode === 'Sell') {
      setRequestStatus('chat');
      return;
    }

    if (!selectedDays) return;

    if (!user?.userId) {
      setActionError('Please log out and log back in so we can link this rental to your account.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Transactions/rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerId: user.userId,
          days: selectedDays,
          depositAmount: 200,
          paymentMethod: payment === 'gcash' ? 'GCash' : 'Cash',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionError(data.message || 'Could not submit rental request.');
        return;
      }

      setListing((prev) => prev ? {
        ...prev,
        stockQuantity: data.remainingStock,
        condition: `${data.remainingStock} in stock`,
      } : prev);
      setRequestStatus('sent');
    } catch {
      setActionError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, isLoading, listing, payment, selectedDays, user]);

  const handleMarkPaid = useCallback(async () => {
    if (!listing || listing.stockQuantity <= 0 || actionLoading) return;

    setActionError('');

    if (!user?.userId) {
      setActionError('Please log out and log back in so we can record this purchase.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Transactions/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerId: user.userId,
          paymentMethod: payment === 'gcash' ? 'GCash' : 'Cash',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionError(data.message || 'Could not record payment.');
        return;
      }

      setListing((prev) => prev ? {
        ...prev,
        stockQuantity: data.remainingStock,
        condition: `${data.remainingStock} in stock`,
      } : prev);
      setPaidMethod(payment);
    } catch {
      setActionError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, listing, payment, user]);

  const relatedListings = useMemo(
    () => listing ? allListings.filter((item) => item.id !== listing.id).slice(0, 3) : [],
    [allListings, listing],
  );

  const itemPrice = listing?.priceValue ?? 0;
  const isSale = listing?.mode === 'Sell';
  const isUnavailable = Boolean(listing && listing.stockQuantity <= 0);
  const rentalTotal = selectedDays ? selectedDays * itemPrice : null;

  return (
    <div className="page-shell">
      <Topbar />
      <main className="container ld-page">
        {isLoading ? (
          <ListingSkeleton />
        ) : !listing ? (
          <section className="card ld-state-card" role="alert">
            <span className="eyebrow">Listing unavailable</span>
            <h1>We couldn’t find this listing.</h1>
            <p>It may have been removed or the backend server may not be running.</p>
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
                  <Illustration type={listing.art} className="ld-product-art" />
                  <div className="ld-photo-meta">
                    <span className="ld-photo-chip">01 / 01 photo</span>
                    <span className="ld-photo-chip">Product illustration</span>
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
                </div>

                <div className="ld-details">
                  <div className="ld-tags">
                    {isUnavailable ? (
                      <span className="badge badge-maroon">Out of stock</span>
                    ) : (
                      <span className={`badge ${isSale ? 'badge-maroon' : 'badge-gold'}`}>{isSale ? 'For sale' : 'For rent'}</span>
                    )}
                    <span className="chip">{listing.category}</span>
                    <span className="chip">{listing.stockQuantity} in stock</span>
                  </div>

                  <h1 className="ld-title">{listing.title}</h1>
                  <div className="ld-seller-line">
                    <span>Listed by <Link to="/browse">{listing.sellerName}</Link></span>
                    <span className="ld-separator" aria-hidden="true">·</span>
                    <span className="verified-inline">✓ Verified @cit.edu</span>
                    <span className="ld-separator" aria-hidden="true">·</span>
                    <Stars rating={listing.rating} count={18} compact />
                  </div>
                  <p className="ld-description">
                    {listing.title} listed by {listing.sellerName}. Ready for campus handoff at {listing.location} ({listing.stockQuantity} currently available).
                  </p>

                  <div className={`ld-specs${isSale ? ' ld-specs-sale' : ''}`} aria-label="Listing details">
                    <div className="ld-spec">
                      <span className="ld-spec-icon" aria-hidden="true">₱</span>
                      <span className="ld-spec-label">{isSale ? 'Price' : 'Rental rate'}</span>
                      <strong>{isSale ? listing.price : `${formatPeso(itemPrice)} / day`}</strong>
                    </div>
                    {!isSale && (
                      <>
                        <div className="ld-spec">
                          <span className="ld-spec-icon" aria-hidden="true">↺</span>
                          <span className="ld-spec-label">Refundable deposit</span>
                          <strong>₱200</strong>
                        </div>
                        <div className="ld-spec">
                          <span className="ld-spec-icon" aria-hidden="true">◷</span>
                          <span className="ld-spec-label">Maximum period</span>
                          <strong>7 days</strong>
                        </div>
                      </>
                    )}
                    <div className="ld-spec">
                      <span className="ld-spec-icon" aria-hidden="true">✓</span>
                      <span className="ld-spec-label">Availability</span>
                      <strong>{listing.stockQuantity} in stock</strong>
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
                                }}
                              >
                                {days}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="ld-total" aria-live="polite">
                          <strong>{rentalTotal === null ? 'Select days' : `Total ${formatPeso(rentalTotal)}`}</strong>
                          <span>{rentalTotal === null ? 'to see your total' : '+ ₱200 deposit'}</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {actionError && <p className="field-error" role="alert">{actionError}</p>}

                  <button
                    type="button"
                    className="btn btn-primary ld-cta"
                    disabled={isUnavailable || actionLoading || (!isSale && !selectedDays)}
                    onClick={handleRequest}
                  >
                    {isUnavailable
                      ? 'Out of stock'
                      : actionLoading
                        ? 'Submitting...'
                        : requestStatus === 'sent'
                          ? 'Rental request sent ✓'
                          : requestStatus === 'chat'
                            ? 'Chat started'
                            : isSale
                              ? 'Chat to buy'
                              : <>Request to rent <span aria-hidden="true">→</span></>}
                  </button>
                  {requestStatus === 'chat' && <p className="ld-request-feedback" role="status">You can message {listing.sellerName} in the chat panel or mark payment on the right.</p>}
                  {requestStatus === 'sent' && <p className="ld-request-feedback" role="status">Rental saved! View it anytime on your <Link to="/rentals">Rentals</Link> page.</p>}
                  <button type="button" className="ld-report-link">Report this listing</button>

                  <section className="ld-more">
                    <div className="ld-more-heading">
                      <h2>More on SwapSpot</h2>
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
                <section className="card ld-card ld-chat-card">
                  <div className="ld-card-heading">
                    <div>
                      <span className="eyebrow">Direct messages</span>
                      <h2>Chat with {listing.sellerName}</h2>
                    </div>
                    <span className="online-dot" aria-label="Online" />
                  </div>
                  <div className="ld-chat-log" aria-live="polite" aria-label="Chat messages">
                    {messages.map((message) => (
                      <div className={`message${message.own ? ' message-own' : ''}`} key={message.id}>
                        <span className="message-sender">{message.sender}</span>
                        <p>{message.text}</p>
                      </div>
                    ))}
                  </div>
                  <form className="ld-chat-form" onSubmit={handleSend}>
                    <label className="sr-only" htmlFor="ld-message">Write a message to {listing.sellerName}</label>
                    <input id="ld-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" />
                    <button type="submit" aria-label="Send message" disabled={!draft.trim()}>→</button>
                  </form>
                </section>

                <section className="card ld-card ld-payment-card">
                  <div className="ld-card-heading">
                    <div>
                      <span className="eyebrow">At your own pace</span>
                      <h2>Payment &amp; handoff</h2>
                    </div>
                    <span className="panel-icon" aria-hidden="true">₱</span>
                  </div>
                  <div className="ld-payment-options" role="group" aria-label="Choose payment method">
                    <button type="button" className={payment === 'gcash' ? 'active' : ''} aria-pressed={payment === 'gcash'} onClick={() => { setPayment('gcash'); setPaidMethod(''); }}>GCash QR</button>
                    <button type="button" className={payment === 'cash' ? 'active' : ''} aria-pressed={payment === 'cash'} onClick={() => { setPayment('cash'); setPaidMethod(''); }}>Cash on exchange</button>
                  </div>
                  {payment === 'gcash' ? (
                    <div className="ld-payment-qr">
                      <QrCode label={`Sample GCash QR code for ${listing.sellerName}`} />
                      <span>{listing.sellerName}’s GCash QR</span>
                    </div>
                  ) : (
                    <div className="ld-cash-note">Pay in person at the meetup</div>
                  )}
                  <p className="ld-payment-disclaimer">SwapSpot displays a QR but does not verify GCash transfers.</p>
                  <button
                    type="button"
                    className="btn btn-secondary ld-paid-button"
                    aria-pressed={paidMethod === payment}
                    disabled={isUnavailable || actionLoading}
                    onClick={handleMarkPaid}
                  >
                    {paidMethod === payment ? '✓ Purchase recorded' : `Confirm purchase (${payment === 'gcash' ? 'GCash' : 'Cash'})`}
                  </button>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Listing;
