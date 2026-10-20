import React, { useCallback, useState } from 'react';
import { Link } from 'react-router';
import Topbar from '../components/Topbar';
import Illustration from '../components/Illustration';
import Stars from '../components/Stars';
import QrCode from '../components/QrCode';
import { chatHistory } from '../data/mock';

function Listing() {
  const [messages, setMessages] = useState(chatHistory);
  const [draft, setDraft] = useState('');
  const [payment, setPayment] = useState('gcash');
  const [paid, setPaid] = useState('');
  const [saved, setSaved] = useState(false);
  const handleDraft = useCallback((event) => setDraft(event.target.value), []);
  const handleSend = useCallback((event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: `message-${Date.now()}`, sender: 'You', text, own: true }]);
    setDraft('');
  }, [draft]);
  const toggleSaved = useCallback(() => setSaved((current) => !current), []);
  const handlePayment = useCallback((event) => setPayment(event.currentTarget.value), []);
  const handlePaid = useCallback((event) => setPaid(event.currentTarget.value), []);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="container listing-page">
        <div className="breadcrumb"><Link to="/browse">Browse</Link><span aria-hidden="true">/</span><span>Calculators</span></div>
        <div className="listing-detail-grid">
          <section className="listing-main">
            <div className="listing-photo image-calculator"><Illustration type="calculator" className="large-art" /><span className="photo-count">01 / 03 photos</span><span className="photo-overlay-note">Product illustration</span></div>
            <div className="listing-badges"><span className="badge badge-gold">For rent</span><span className="chip">Calculators</span><span className="chip">Like new</span></div>
            <div className="listing-detail-heading"><div><h1>Casio fx-991ES Plus</h1><p className="listing-byline">Listed by <Link to="/shop">Mika C.</Link> <span className="verified-inline">✓ Verified @cit.edu</span></p></div><button className={`save-detail${saved ? ' is-saved' : ''}`} type="button" aria-pressed={saved} aria-label={saved ? 'Remove from saved listings' : 'Save listing'} onClick={toggleSaved}>{saved ? '♥' : '♡'}</button></div>
            <Stars rating={4.9} count={18} />
            <p className="listing-description">Reliable scientific calculator in great condition, with the original cover and battery. Perfect for exams and everyday engineering coursework.</p>
            <div className="detail-facts"><div><span>Rental rate</span><strong>₱40 <small>/ day</small></strong></div><div><span>Refundable deposit</span><strong>₱200</strong></div><div><span>Maximum period</span><strong>7 days</strong></div></div>
            <Link to="/rentals" className="btn btn-primary rent-request">Request to rent <span aria-hidden="true">→</span></Link>
            <button type="button" className="report-link">Report this listing</button>
            <section className="seller-card card"><div className="avatar seller-avatar">MC</div><div><span className="eyebrow">Your campus neighbor</span><h2>Mika C.</h2><p><span className="verified-inline">✓ Verified @cit.edu</span></p></div><Stars rating={4.9} count={18} compact /></section>
          </section>
          <aside className="listing-sidebar">
            <section className="panel card chat-panel"><div className="panel-heading"><div><span className="eyebrow">Direct messages</span><h2>Chat with Mika</h2></div><span className="online-dot" aria-label="Online" /></div><div className="chat-log" aria-live="polite" aria-label="Chat messages">{messages.map((message) => <div className={`message${message.own ? ' message-own' : ''}`} key={message.id}><span className="message-sender">{message.sender}</span><p>{message.text}</p></div>)}</div><form className="chat-form" onSubmit={handleSend}><label className="sr-only" htmlFor="message">Write a message</label><input id="message" value={draft} onChange={handleDraft} placeholder="Write a message…" /><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim()}>→</button></form></section>
            <section className="panel card payment-panel"><div className="panel-heading"><div><span className="eyebrow">At your own pace</span><h2>Payment &amp; handoff</h2></div><span className="panel-icon">₱</span></div><div className="payment-options" role="group" aria-label="Choose payment method"><button type="button" className={payment === 'gcash' ? 'payment-option active' : 'payment-option'} value="gcash" aria-pressed={payment === 'gcash'} onClick={handlePayment}>GCash QR</button><button type="button" className={payment === 'cash' ? 'payment-option active' : 'payment-option'} value="cash" aria-pressed={payment === 'cash'} onClick={handlePayment}>Cash on exchange</button></div>
              {payment === 'gcash' ? <div className="payment-qr"><QrCode /><span>Seller’s GCash QR</span></div> : <div className="cash-note"><span aria-hidden="true">✓</span><strong>Pay in person</strong><p>Exchange cash with Mika at your agreed campus meetup.</p></div>}
              <p className="payment-disclaimer">SwapSpot displays a QR but does not verify GCash transfers.</p>
              <button type="button" className={`btn ${paid ? 'btn-success' : 'btn-secondary'} paid-button`} value={payment} onClick={handlePaid}>{paid === payment ? '✓ Marked as paid' : `Paid (${payment === 'gcash' ? 'GCash' : 'Cash'})`}</button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Listing;