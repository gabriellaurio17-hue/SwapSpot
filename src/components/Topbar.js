import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import Logo from './Logo';
import { ROLES, useAuth } from '../context/AuthContext';

function Topbar({ dark = false }) {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const canAccessMarketplaceFeatures = role !== ROLES.visitor;

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  return (
    <header className={`topbar${dark ? ' topbar-dark' : ''}`}>
      <Link to="/" aria-label="SwapSpot home" className="brand-link"><Logo variant={dark ? 'dark' : 'light'} /></Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/browse">Browse</NavLink>
        {canAccessMarketplaceFeatures && <NavLink to="/rentals">Rent</NavLink>}
        {canAccessMarketplaceFeatures && <NavLink to="/shop">Shops</NavLink>}
        <a href="/#how-it-works">How it works</a>
      </nav>
      <div className="nav-actions">
        <Link className="nav-login" to="/auth">Log in</Link>
        <Link className="btn btn-outline btn-small" to="/auth">Sign up</Link>
        {role !== ROLES.visitor && <button type="button" className="btn btn-outline btn-small" onClick={handleLogout}>Log out</button>}
      </div>
    </header>
  );
}

export default Topbar;