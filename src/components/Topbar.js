import React from 'react';
import { Link, NavLink } from 'react-router';
import Logo from './Logo';

function Topbar({ dark = false }) {
  return (
    <header className={`topbar${dark ? ' topbar-dark' : ''}`}>
      <Link to="/" aria-label="SwapSpot home" className="brand-link"><Logo variant={dark ? 'dark' : 'light'} /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/browse">Browse</NavLink>
        <NavLink to="/rentals">Rent</NavLink>
        <NavLink to="/shop">Shops</NavLink>
        <a href="/#how-it-works">How it works</a>
      </nav>
      <div className="nav-actions">
        <Link className="nav-login" to="/auth">Log in</Link>
        <Link className="btn btn-outline btn-small" to="/auth">Sign up</Link>
      </div>
    </header>
  );
}

export default Topbar;