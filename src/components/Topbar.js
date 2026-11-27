import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import Logo from './Logo';
import { ROLES, useAuth } from '../context/AuthContext';

function Topbar({ dark = false }) {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const loggedIn = !!user;
  const canAccessMarketplaceFeatures = loggedIn && role === ROLES.verified;

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  return (
    <header className={`topbar${dark ? ' topbar-dark' : ''}`}>
      <Link to="/" aria-label="SwapSpot home" className="brand-link"><Logo variant={dark ? 'dark' : 'light'} /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/browse">Browse</NavLink>
        {canAccessMarketplaceFeatures && <NavLink to="/sell">Sell</NavLink>}
        {canAccessMarketplaceFeatures && <NavLink to="/messages">Messages</NavLink>}
        {canAccessMarketplaceFeatures && <NavLink to="/rentals">Rent</NavLink>}
        {canAccessMarketplaceFeatures && <NavLink to="/shop">Shops</NavLink>}
        <a href="/#how-it-works">How it works</a>
      </nav>
      <div className="nav-actions">
        {loggedIn ? (
          <>
            <Link className="nav-login" to="/profile">Profile</Link>
            <button type="button" className="btn btn-outline btn-small" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link className="nav-login" to="/auth">Log in</Link>
            <Link className="btn btn-outline btn-small" to="/auth">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;