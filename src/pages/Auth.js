import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import Logo from '../components/Logo';
import { ROLES, useAuth } from '../context/AuthContext';
import { isCitEmail } from '../utils/validators';

function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: activeRole, setRole, signOut } = useAuth();
  const [mode, setMode] = useState(() => new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const validEmail = isCitEmail(email);
  const showEmailError = email.length > 0 && !validEmail;
  const isSignedIn = activeRole !== ROLES.visitor;

  useEffect(() => {
    setMode(new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
    setSent(false);
    setSubmitted(false);
  }, [location.search]);

  const handleEmail = useCallback((event) => { setEmail(event.target.value); setSubmitted(false); }, []);
  const handlePassword = useCallback((event) => setPassword(event.target.value), []);
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    setSubmitted(true);
    if (validEmail && password.length >= 8) setSent(true);
  }, [validEmail, password]);

  const handleRoleAccess = useCallback((role) => {
    setRole(role);

    if (role === ROLES.admin) {
      navigate('/admin');
      return;
    }

    if (role === ROLES.shopOwner) {
      navigate('/shop-owner');
      return;
    }

    navigate('/');
  }, [navigate, setRole]);

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/auth');
  }, [navigate, signOut]);

  const authContent = sent ? (
    <div className="confirmation-state" role="status">
      <span className="confirmation-icon">{mode === 'signup' ? '✉' : '✓'}</span>
      <span className="eyebrow">{mode === 'signup' ? 'One last step' : 'Demo sign in'}</span>
      <h2>{mode === 'signup' ? 'Check your inbox.' : 'Welcome back.'}</h2>
      <p>{mode === 'signup' ? <>We sent a confirmation link to <strong>{email}</strong>. Confirm your email to activate your SwapSpot account.</> : <>This UI demo accepted the sign-in details for <strong>{email}</strong>.</>}</p>
      <button type="button" className="btn btn-primary" onClick={() => setSent(false)}>{mode === 'signup' ? 'Back to sign up' : 'Back to log in'}</button>
      {mode === 'signup' && <p className="form-footnote">Didn’t get it? Check your spam folder or try again.</p>}
    </div>
  ) : (
    <>
      <div className="auth-mode-tabs" aria-label="Account access">
        <Link to="/auth?mode=login" className={mode === 'login' ? 'active' : ''}>Log in</Link>
        <Link to="/auth?mode=signup" className={mode === 'signup' ? 'active' : ''}>Sign up</Link>
      </div>
      <span className="eyebrow">Welcome to SwapSpot</span>
      <h2>{mode === 'signup' ? <>Make campus<br /><em>work for you.</em></> : <>Welcome<br /><em>back.</em></>}</h2>
      <p className="auth-intro">{mode === 'signup' ? 'Join with your CIT-U email to get started.' : 'Log in to continue to your SwapSpot account.'}</p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">CIT-U email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={handleEmail} placeholder="you@cit.edu" aria-invalid={showEmailError || (submitted && !validEmail)} aria-describedby={showEmailError || (submitted && !validEmail) ? 'email-error' : undefined} />
        {showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
        {submitted && !validEmail && !showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={handlePassword} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} aria-invalid={submitted && password.length < 8} aria-describedby={submitted && password.length < 8 ? 'password-error' : undefined} />
        {submitted && password.length < 8 && <p className="field-error" id="password-error" role="alert">Use at least 8 characters for your password.</p>}
        {mode === 'signup' && <p className="form-footnote">Your password is stored hashed and never shared.</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={!validEmail}>{mode === 'signup' ? 'Create account' : 'Log in'} <span aria-hidden="true">→</span></button>
      </form>
      <div className="auth-links"><Link to="/auth?mode=login">Forgot password?</Link><span>{mode === 'signup' ? <>Already a member? <Link to="/auth?mode=login">Log in</Link></> : <>New to SwapSpot? <Link to="/auth?mode=signup">Sign up</Link></>}</span></div>
      <p className="auth-policy">By continuing, you agree to keep SwapSpot safe and respectful for our campus community.</p>
      {isSignedIn && <button type="button" className="btn btn-secondary" onClick={handleLogout}>Log out of {activeRole === ROLES.admin ? 'Admin' : activeRole === ROLES.shopOwner ? 'Shop Owner' : 'Verified User'} UI</button>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => handleRoleAccess(ROLES.admin)}>Continue as Admin</button>
        <button type="button" className="btn btn-secondary" onClick={() => handleRoleAccess(ROLES.shopOwner)}>Continue as Shop Owner</button>
        <button type="button" className="btn btn-secondary" onClick={() => handleRoleAccess(ROLES.verifiedUser)}>Continue as Verified User</button>
        <button type="button" className="btn btn-secondary" onClick={() => handleRoleAccess(ROLES.visitor)}>Continue as Visitor</button>
      </div>
    </>
  );

  return (
    <main className="auth-page">
      <section className="auth-brand-panel photo-bg photo-bg--auth">
        <Link to="/" className="auth-logo"><Logo variant="dark" /></Link>
        <div className="auth-brand-copy"><span className="eyebrow eyebrow-gold">Good finds, close to home</span><h1>A campus community built on <em>trust.</em></h1><p>Buy, sell, rent, and discover campus-made goods — all with people from CIT-U.</p></div>
        <div className="auth-quote"><span aria-hidden="true">“</span><p>My calculator found a new home between classes. It was that easy.</p><small>— A SwapSpot student</small></div>
        <span className="auth-watermark" aria-hidden="true">SWAP<br />SPOT</span>
      </section>
      <section className="auth-form-side">
        <Link to="/" className="back-link"><span aria-hidden="true">←</span> Back to home</Link>
        <div className="auth-form-wrap">
          <div className="progress-caption"><span>YOUR CAMPUS ACCOUNT</span><span>STEP {sent ? '3' : '1'} OF 3</span></div>
          <div className="progress-track" aria-label={`Step ${sent ? 3 : 1} of 3`}><span className={sent ? 'progress-complete' : ''} /></div>
          {authContent}
        </div>
      </section>
    </main>
  );
}

export default Auth;