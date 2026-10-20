import React, { useMemo } from 'react';
import { Link } from 'react-router';
import Logo from '../components/Logo';
import Topbar from '../components/Topbar';
import ListingCard from '../components/ListingCard';
import Illustration from '../components/Illustration';
import QrCode from '../components/QrCode';
import Stars from '../components/Stars';
import { listings, shops, steps } from '../data/mock';

function Landing() {
  const freshListings = useMemo(() => listings.slice(0, 3), []);
  return (
    <div className="landing-page">
      <section className="hero-shell photo-bg photo-bg--hero">
        <Topbar dark />
        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-gold">CIT-U’s campus marketplace</span>
            <h1>Swap, rent &amp; sell on <em>campus</em></h1>
            <p>Good finds, fair deals, and the people you already share a campus with.</p>
            <div className="hero-actions"><Link to="/browse" className="btn btn-gold">Explore marketplace <span aria-hidden="true">↗</span></Link><Link to="/auth" className="hero-secondary">Join the community <span aria-hidden="true">→</span></Link></div>
            <div className="hero-trust"><span className="trust-seal">✓</span><span>Only for CIT-U students, faculty,<br />staff and recognized orgs</span></div>
          </div>
          <div className="hero-art-wrap">
            <span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" />
            <div className="hero-pin"><svg viewBox="0 0 150 170" aria-hidden="true"><path d="M75 9C40 9 12 36 12 70c0 46 63 91 63 91s63-45 63-91C138 36 110 9 75 9z" fill="url(#pinGold)" /><path d="M56 67h43l-12-12M94 87H51l12 12" fill="none" stroke="#5A0B18" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><defs><linearGradient id="pinGold" x1="25" y1="15" x2="120" y2="143"><stop stopColor="#F2D16D" /><stop offset="1" stopColor="#D4A62A" /></linearGradient></defs></svg></div>
            <div className="float-chip product-float"><span className="mini-art"><Illustration type="calculator" /></span><span><strong>Casio fx-991ES</strong><small>Rent ₱40 / day</small></span></div>
            <div className="float-chip verified-float"><span className="verified-mark">✓</span><span><strong>Verified community</strong><small>@cit.edu only</small></span></div>
            <span className="hero-spark spark-a">✦</span><span className="hero-spark spark-b">✧</span>
          </div>
          <aside className="hero-shops">
            <div className="hero-shops-title"><span className="eyebrow eyebrow-gold">Campus collective</span><Link to="/shop">All org shops <span aria-hidden="true">↗</span></Link></div>
            {shops.map((shop, index) => <Link to="/shop" className="hero-shop-tile" key={shop.id}><span className={`shop-monogram monogram-${index}`}>{shop.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><span><strong>{shop.name}</strong><small>{shop.subtitle}</small></span><span className="tile-arrow" aria-hidden="true">↗</span></Link>)}
          </aside>
        </div>
        <div className="hero-meta container"><span><strong>01</strong> One campus community</span><span><strong>02</strong> Verified .edu members</span><span><strong>03</strong> Deals made face-to-face</span><span className="hero-meta-note">Built for campus life in Cebu City</span></div>
      </section>

      <main>
        <section className="bento-section container" aria-label="Marketplace features">
          <article className="bento-card bento-rental card"><div className="bento-heading"><span className="eyebrow">Easy rentals</span><span className="bento-icon">↗</span></div><h2>Borrow what<br />you need.</h2><p>Clear dates, deposits, and a simple return tracker.</p><div className="mini-rental"><div><strong>Digital multimeter</strong><span>Oct 21 – 23</span></div><span className="deposit-tag">₱300 deposit</span></div></article>
          <article className="bento-card bento-chat card"><div className="bento-heading"><span className="eyebrow">Keep it in the chat</span><span className="bento-icon">↗</span></div><h2>Details, sorted.</h2><div className="chat-preview"><span>Hi! Want to meet after class?</span><span className="chat-own">Library entrance works for me.</span><span>Perfect. See you there.</span></div><p>Coordinate the handoff, all in one place.</p></article>
          <article className="bento-card bento-payment card"><div className="bento-heading"><span className="eyebrow">Flexible exchange</span><span className="bento-icon">↗</span></div><h2>Pay your way.</h2><div className="payment-sample"><QrCode label="Illustration of a sample GCash QR" /><div><strong>GCash or cash</strong><span>Choose what works<br />for both of you.</span></div></div><span className="payment-check">✓ &nbsp; Mark as Paid (GCash)</span></article>
          <article className="bento-card bento-rating card"><div className="bento-heading"><span className="eyebrow">Trust grows here</span><span className="bento-icon">↗</span></div><h2>Good deals<br />deserve a rating.</h2><p>Reviews come from completed deals only.</p><Stars rating={4.9} count={28} /></article>
        </section>

        <section className="steps-section container" id="how-it-works">
          <div className="section-heading"><span className="eyebrow">A little goes a long way</span><h2>How a SwapSpot deal <em>goes</em></h2><p>Thoughtful transactions, start to finish.</p></div>
          <ol className="steps-grid">{steps.map((step, index) => <li className="step-card" key={step.id}><span className="step-number">0{index + 1}</span><span className={`step-symbol symbol-${step.id}`} aria-hidden="true">{['✓', '⌕', '↗', '₱', '★'][index]}</span><h3>{step.title}</h3><p>{step.text}</p>{index < steps.length - 1 && <span className="step-connector" aria-hidden="true">→</span>}</li>)}</ol>
        </section>

        <section className="fresh-section container">
          <div className="section-heading section-heading-row"><div><span className="eyebrow">Good things move fast</span><h2>Fresh on SwapSpot</h2></div><Link to="/browse" className="text-link">Browse all listings <span aria-hidden="true">→</span></Link></div>
          <div className="grid-auto listing-grid">{freshListings.map((listing) => <ListingCard listing={listing} key={listing.id} />)}</div>
        </section>

        <section className="shops-promo container">
          <div className="shops-promo-inner"><span className="shops-watermark" aria-hidden="true">SHOPS</span><div className="shops-promo-copy"><span className="eyebrow eyebrow-gold">Student-powered storefronts</span><h2>Good ideas.<br /><em>Made right here.</em></h2><p>Discover approved org shops and campus-made goods from the people who make this community special.</p><Link to="/shop" className="btn btn-gold">Meet the org shops <span aria-hidden="true">↗</span></Link></div><div className="shops-promo-art"><div className="promo-circle"><Illustration type="shirt" /></div><span className="promo-sticker">CAMPUS<br />MADE</span></div></div>
        </section>
        <p className="disclaimer container"><span className="disclaimer-mark">i</span> SwapSpot only displays the seller’s GCash QR. We don’t verify payments or transfers. Please confirm payment directly with the seller.</p>
      </main>
      <footer className="site-footer container"><Logo /><span>Campus finds, good people, fair deals.</span><span>© 2026 SwapSpot · Cebu City</span></footer>
    </div>
  );
}

export default Landing;