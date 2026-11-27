import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import Logo from '../components/Logo';
import { ROLES, useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { isCitEmail } from '../utils/validators';

function mapApiRole(apiRole) {
  if (apiRole === 'Admin') return ROLES.admin;
  if (apiRole === 'StoreOwner') return ROLES.shopOwner;
  if (apiRole === 'Student') return ROLES.verifiedUser;
  return ROLES.visitor;
}

function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: activeRole, setAuth, signOut } = useAuth();
  const [mode, setMode] = useState(() => new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [devVerificationCode, setDevVerificationCode] = useState('');

  const validEmail = isCitEmail(email);
  const showEmailError = email.length > 0 && !validEmail;
  const isSignedIn = activeRole !== ROLES.visitor;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setMode(params.get('mode') === 'login' ? 'login' : 'signup');
    setSent(false);
    setVerified(false);
    setVerificationCode('');
    setSubmitted(false);
    setApiError('');
    setInfoMessage('');
    setNeedsVerification(false);
    setDevVerificationCode('');
  }, [location.search]);

  const handleEmail = useCallback((event) => {
    setEmail(event.target.value);
    setSubmitted(false);
    setApiError('');
    setInfoMessage('');
    setNeedsVerification(false);
  }, []);

  const handlePassword = useCallback((event) => {
    setPassword(event.target.value);
    setApiError('');
  }, []);

  const handleCodeChange = useCallback((event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(digitsOnly);
    setApiError('');
  }, []);

  const handleRoleAccess = useCallback((role, userData = null) => {
    setAuth(role, userData);

    if (role === ROLES.admin) {
      navigate('/admin');
      return;
    }

    if (role === ROLES.shopOwner) {
      navigate('/shop-owner');
      return;
    }

    navigate('/');
  }, [navigate, setAuth]);

  const handleResendVerification = useCallback(async () => {
    if (!email || resending) return;
    setResending(true);
    setApiError('');
    setInfoMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setApiError(data.message || 'Could not resend verification code.');
        return;
      }

      setInfoMessage(data.message || 'Verification code resent. Check your Outlook inbox.');
      setDevVerificationCode(data.devVerificationCode || '');
      setSent(true);
      setNeedsVerification(false);
    } catch {
      setApiError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setResending(false);
    }
  }, [email, resending]);

  const handleVerifyCode = useCallback(async (event) => {
    event.preventDefault();
    if (verificationCode.length !== 6 || verifying) return;

    setVerifying(true);
    setApiError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setApiError(data.message || 'Invalid or expired verification code.');
        return;
      }

      setVerified(true);
      setInfoMessage(data.message || 'Email verified! Your SwapSpot account is now active.');
    } catch {
      setApiError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setVerifying(false);
    }
  }, [email, verificationCode, verifying]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setApiError('');
    setInfoMessage('');
    setNeedsVerification(false);

    if (!validEmail || password.length < 8) return;

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setApiError(data.message || 'Could not create your account.');
          return;
        }

        setInfoMessage(data.message || '');
        setDevVerificationCode(data.devVerificationCode || '');
        setSent(true);
        return;
      }

      // --- LOGIN FETCH TO ASP.NET CORE BACKEND ---
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setApiError(data.message || 'Incorrect email or password.');
        if (data.needsVerification) {
          setNeedsVerification(true);
        }
        return;
      }

      const mappedRole = mapApiRole(data.role);
      handleRoleAccess(mappedRole, {
        userId: data.userId,
        email: data.email,
        role: data.role,
      });
    } catch {
      setApiError('Cannot connect to backend server. Make sure the API is running.');
    } finally {
      setSubmitting(false);
    }
  }, [validEmail, password, mode, email, handleRoleAccess]);

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/auth?mode=login');
  }, [navigate, signOut]);

  let authContent;
  if (verified) {
    authContent = (
      <div className="confirmation-state" role="status">
        <span className="confirmation-icon">✓</span>
        <span className="eyebrow">Account activated</span>
        <h2>You’re all set.</h2>
        <p>{infoMessage || <>Your CIT-U email (<strong>{email}</strong>) is verified. You can now log in to SwapSpot.</>}</p>
        <Link to="/auth?mode=login" className="btn btn-primary">
          Continue to log in <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else if (sent) {
    authContent = (
      <div className="confirmation-state" role="status">
        <span className="confirmation-icon">✉</span>
        <span className="eyebrow">One last step</span>
        <h2>Check your Outlook inbox.</h2>
        <p>
          We sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to activate your SwapSpot account.
        </p>
        {infoMessage && <p className="form-footnote">{infoMessage}</p>}
        {devVerificationCode && (
          <p className="form-footnote">
            Dev shortcut (SMTP not configured yet): <strong>{devVerificationCode}</strong>
          </p>
        )}
        <form className="auth-form" onSubmit={handleVerifyCode} style={{ marginTop: '1rem' }} noValidate>
          <label htmlFor="verification-code">6-digit verification code</label>
          <input
            id="verification-code"
            name="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={verificationCode}
            onChange={handleCodeChange}
            placeholder="Enter 6-digit code"
            style={{ letterSpacing: '0.35em', textAlign: 'center', fontSize: '1.15rem', fontWeight: 600 }}
          />
          {apiError && <p className="field-error" role="alert">{apiError}</p>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={verificationCode.length !== 6 || verifying}>
            {verifying ? 'Verifying...' : 'Verify account'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleResendVerification} disabled={resending}>
            {resending ? 'Sending...' : 'Resend code'}
          </button>
          <Link to="/auth?mode=login" className="btn btn-secondary">
            Go to log in
          </Link>
        </div>
        <p className="form-footnote">Didn’t get it? Check your Junk/Spam or Other folder in Outlook, or resend above.</p>
      </div>
    );
  } else {
    authContent = (
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
          {apiError && <p className="field-error" role="alert">{apiError}</p>}
          {needsVerification && (
            <button type="button" className="btn btn-secondary" onClick={handleResendVerification} disabled={resending} style={{ marginBottom: '0.75rem' }}>
              {resending ? 'Sending...' : 'Send new 6-digit code'}
            </button>
          )}
          {mode === 'signup' && <p className="form-footnote">Your password is stored hashed and never shared.</p>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={!validEmail || submitting}>
            {submitting ? (mode === 'signup' ? 'Creating account...' : 'Logging in...') : (mode === 'signup' ? 'Create account' : 'Log in')} <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="auth-links"><Link to="/auth?mode=login">Forgot password?</Link><span>{mode === 'signup' ? <>Already a member? <Link to="/auth?mode=login">Log in</Link></> : <>New to SwapSpot? <Link to="/auth?mode=signup">Sign up</Link></>}</span></div>
        <p className="auth-policy">By continuing, you agree to keep SwapSpot safe and respectful for our campus community.</p>
        {isSignedIn && <button type="button" className="btn btn-secondary" onClick={handleLogout}>Log out of {activeRole === ROLES.admin ? 'Admin' : activeRole === ROLES.shopOwner ? 'Shop Owner' : 'Verified User'} UI</button>}
      </>
    );
  }

  const stepNumber = verified ? 3 : sent ? 2 : 1;

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
          <div className="progress-caption"><span>YOUR CAMPUS ACCOUNT</span><span>STEP {stepNumber} OF 3</span></div>
          <div className="progress-track" aria-label={`Step ${stepNumber} of 3`}><span className={stepNumber === 3 ? 'progress-complete' : ''} /></div>
          {authContent}
        </div>
      </section>
    </main>
  );
}

export default Auth;
