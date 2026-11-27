import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import Logo from '../components/Logo';
import { ROLES, useAuth } from '../context/AuthContext';
import { isCitEmail } from '../utils/validators';

function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signOut, user, loading, role, profile } = useAuth();
  const [mode, setMode] = useState(() => new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [registered, setRegistered] = useState(false);

  const validEmail = isCitEmail(email);
  const showEmailError = email.length > 0 && !validEmail;

  useEffect(() => {
    setMode(new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
    setAuthError('');
    setRegistered(false);
    setSubmitted(false);
  }, [location.search]);

  // Redirect already-authenticated users to their dashboard.
  // Wait for profile to load so role is correct (admin/shopOwner/verified).
  useEffect(() => {
    if (!loading && user && profile && role !== ROLES.visitor) {
      if (role === ROLES.admin) {
        navigate('/admin', { replace: true });
      } else if (role === ROLES.shopOwner) {
        navigate('/shop-owner', { replace: true });
      } else {
        navigate('/browse', { replace: true });
      }
    }
  }, [loading, user, profile, role, navigate]);

  const handleEmail = useCallback((event) => {
    setEmail(event.target.value);
    setSubmitted(false);
    setAuthError('');
  }, []);

  const handlePassword = useCallback((event) => {
    setPassword(event.target.value);
    setSubmitted(false);
    setAuthError('');
  }, []);

  const handleFullName = useCallback((event) => {
    setFullName(event.target.value);
    setSubmitted(false);
    setAuthError('');
  }, []);
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setAuthError('');

    if (mode === 'signup') {
      if (!validEmail || password.length < 8 || !fullName) return;
      try {
        await signUp(email, password, fullName);
        setRegistered(true);
      } catch (err) {
        const message = err?.message || String(err);
        if (message.includes('Database error')) {
          setAuthError('Only @cit.edu email addresses can register.');
        } else {
          setAuthError(message);
        }
      }
    } else {
      if (!validEmail || password.length < 8) return;
      try {
        await signIn(email, password);
      } catch (err) {
        const message = err?.message || String(err);
        setAuthError(message);
      }
    }
  }, [mode, validEmail, password, fullName, email, signUp, signIn]);

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/');
  }, [signOut, navigate]);

  const isSignedIn = !!user;

  const brandPanel = (
    <section className="auth-brand-panel photo-bg photo-bg--auth">
      <Link to="/" className="auth-logo"><Logo variant="dark" /></Link>
      <div className="auth-brand-copy"><span className="eyebrow eyebrow-gold">Good finds, close to home</span><h1>A campus community built on <em>trust.</em></h1><p>Buy, sell, rent, and discover campus-made goods — all with people from CIT-U.</p></div>
      <div className="auth-quote"><span aria-hidden="true">“</span><p>My calculator found a new home between classes. It was that easy.</p><small>— A SwapSpot student</small></div>
      <span className="auth-watermark" aria-hidden="true">SWAP<br />SPOT</span>
    </section>
  );

  const confirmationContent = (
    <div className="confirmation-state" role="status">
      <span className="confirmation-icon">✉</span>
      <span className="eyebrow">One last step</span>
      <h2>Check your @cit.edu inbox and click the confirmation link.</h2>
      <button type="button" className="btn btn-primary" onClick={() => setRegistered(false)}>Back to sign up</button>
    </div>
  );

  const formContent = (
    <>
      <div className="auth-mode-tabs" aria-label="Account access">
        <Link to="/auth?mode=login" className={mode === 'login' ? 'active' : ''}>Log in</Link>
        <Link to="/auth?mode=signup" className={mode === 'signup' ? 'active' : ''}>Sign up</Link>
      </div>
      <span className="eyebrow">Welcome to SwapSpot</span>
      <h2>{mode === 'signup' ? <>Make campus<br /><em>work for you.</em></> : <>Welcome<br /><em>back.</em></>}</h2>
      <p className="auth-intro">{mode === 'signup' ? 'Join with your CIT-U email to get started.' : 'Log in to continue to your SwapSpot account.'}</p>
      {authError && <p className="field-error" role="alert">{authError}</p>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">CIT-U email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={handleEmail} placeholder="you@cit.edu" aria-invalid={showEmailError || (submitted && !validEmail)} aria-describedby={showEmailError || (submitted && !validEmail) ? 'email-error' : undefined} />
        {showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
        {submitted && !validEmail && !showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
        {mode === 'signup' && (
          <>
            <label htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" type="text" value={fullName} onChange={handleFullName} placeholder="Your full name" />
            {submitted && !fullName && <p className="field-error" id="full-name-error" role="alert">Full name is required.</p>}
          </>
        )}
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={handlePassword} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} aria-invalid={submitted && password.length < 8} aria-describedby={submitted && password.length < 8 ? 'password-error' : undefined} />
        {submitted && password.length < 8 && <p className="field-error" id="password-error" role="alert">Use at least 8 characters for your password.</p>}
        {mode === 'signup' && <p className="form-footnote">Your password is stored hashed and never shared.</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={loading || !validEmail || (mode === 'signup' && (!fullName || password.length < 8))}>{mode === 'signup' ? 'Create account' : 'Log in'} <span aria-hidden="true">→</span></button>
      </form>
      <div className="auth-links"><Link to="/auth?mode=login">Forgot password?</Link><span>{mode === 'signup' ? <>Already a member? <Link to="/auth?mode=login">Log in</Link></> : <>New to SwapSpot? <Link to="/auth?mode=signup">Sign up</Link></>}</span></div>
      <p className="auth-policy">By continuing, you agree to keep SwapSpot safe and respectful for our campus community.</p>
      {isSignedIn && <button type="button" className="btn btn-secondary" onClick={handleLogout}>Log out</button>}
      <div style={{ marginTop: '18px' }}><Link to="/browse">Continue browsing as a visitor</Link></div>
    </>
  );

  return (
    <main className="auth-page">
      {brandPanel}
      <section className="auth-form-side">
        <Link to="/" className="back-link"><span aria-hidden="true">←</span> Back to home</Link>
        <div className="auth-form-wrap">
          <div className="progress-caption"><span>YOUR CAMPUS ACCOUNT</span><span>STEP {registered ? '3' : '1'} OF 3</span></div>
          <div className="progress-track" aria-label={`Step ${registered ? 3 : 1} of 3`}><span className={registered ? 'progress-complete' : ''} /></div>
          {registered ? confirmationContent : formContent}
        </div>
      </section>
    </main>
  );
}

export default Auth;