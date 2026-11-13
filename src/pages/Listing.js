import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import Illustration from '../components/Illustration';
import QrCode from '../components/QrCode';
import Stars from '../components/Stars';
import Topbar from '../components/Topbar';
import { chatHistory, listings } from '../data/mock';

const rentalDays = [1, 3, 5, 7];

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
  const listingId = new URLSearchParams(location.search).get('id') || 'calc-fx991';
  const listing = useMemo(() => listings.find((item) => item.id === listingId), [listingId]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(null);
  const [payment, setPayment] = useState('gcash');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(chatHistory);
  const [requestStatus, setRequestStatus] = useState('');
  const [saved, setSaved] = useState(false);
  const [paidMethod, setPaidMethod] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setSelectedDays(null);
    setDraft('');
    setMessages(chatHistory);
    setRequestStatus('');
    setSaved(false);
    setPaidMethod('');
    const timer = window.setTimeout(() => setIsLoading(false), 240);
    return () => window.clearTimeout(timer);
  }, [listingId]);

  const handleSend = useCallback((event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: `message-${Date.now()}`, sender: 'You', text, own: true }]);
    setDraft('');
  }, [draft]);

  const handleRequest = useCallback(() => {
    if (!listing || isLoading || listing.available === false || listing.status === 'Unavailable' || listing.soldOut) return;
    if (listing.mode === 'Sell' || selectedDays) {
      setRequestStatus(listing.mode === 'Sell' ? 'chat' : 'sent');
    }
  }, [isLoading, listing, selectedDays]);

  const relatedListings = useMemo(
    () => listing ? listings.filter((item) => item.id !== listing.id).slice(0, 3) : [],
    [listing],
  );

  const priceMatch = listing?.price.match(/[\d,]+(?:\.\d+)?/);
  const itemPrice = priceMatch ? Number(priceMatch[0].replace(/,/g, '')) : 0;
  const isSale = listing?.mode === 'Sell';
  const isUnavailable = Boolean(listing && (
    listing.available === false || listing.status === 'Unavailable' || listing.soldOut
  ));
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
            <p>It may have been removed or the link may be incorrect.</p>
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
                    <span className="ld-photo-chip">01 / 03 photos</span>
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
                  <div className="ld-photo-pager" role="group" aria-label="Photo 1 of 3">
                    <span className="active" aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </div>
                </div>

                <div className="ld-details">
                  <div className="ld-tags">
                    {isUnavailable ? (
                      <span className="badge badge-maroon">Unavailable</span>
                    ) : (
                      <span className={`badge ${isSale ? 'badge-maroon' : 'badge-gold'}`}>{isSale ? 'For sale' : 'For rent'}</span>
                    )}
                    <span className="chip">{listing.category}</span>
                    <span className="chip">{listing.condition}</span>
                  </div>

                  <h1 className="ld-title">{listing.title}</h1>
                  <div className="ld-seller-line">
                    <span>Listed by <Link to="/browse">Mika C.</Link></span>
                    <span className="ld-separator" aria-hidden="true">·</span>
                    <span className="verified-inline">✓ Verified @cit.edu</span>
                    <span className="ld-separator" aria-hidden="true">·</span>
                    <Stars rating={listing.rating} count={18} compact />
                  </div>
                  <p className="ld-description">
                    {listing.id === 'calc-fx991'
                      ? 'Reliable scientific calculator in great condition, with the original cover and battery. Perfect for exams and everyday engineering coursework.'
                      : `${listing.title} in ${listing.condition.toLowerCase()} condition. A useful campus find, ready for pickup at ${listing.location}.`}
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

                  <button
                    type="button"
                    className="btn btn-primary ld-cta"
                    disabled={isUnavailable || (!isSale && !selectedDays)}
                    onClick={handleRequest}
                  >
                    {isUnavailable
                      ? 'Unavailable'
                      : requestStatus === 'sent'
                        ? 'Request sent'
                        : requestStatus === 'chat'
                          ? 'Chat started'
                          : isSale
                            ? 'Chat to buy'
                            : <>Request to rent <span aria-hidden="true">→</span></>}
                  </button>
                  {requestStatus === 'chat' && <p className="ld-request-feedback" role="status">You can message Mika in the chat panel.</p>}
                  <button type="button" className="ld-report-link">Report this listing</button>

                  <section className="ld-more">
                    <div className="ld-more-heading">
                      <h2>More from Mika</h2>
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
                      <h2>Chat with Mika</h2>
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
                    <label className="sr-only" htmlFor="ld-message">Write a message to Mika</label>
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
                      <QrCode label="Sample GCash QR code for Mika" />
                      <span>Seller’s GCash QR</span>
                    </div>
                  ) : (
                    <div className="ld-cash-note">Pay in person at the meetup</div>
                  )}
                  <p className="ld-payment-disclaimer">SwapSpot displays a QR but does not verify GCash transfers.</p>
                  <button
                    type="button"
                    className="btn btn-secondary ld-paid-button"
                    aria-pressed={paidMethod === payment}
                    onClick={() => setPaidMethod(payment)}
                  >
                    {paidMethod === payment ? '✓ Marked as paid' : `Paid (${payment === 'gcash' ? 'GCash' : 'Cash'})`}
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
