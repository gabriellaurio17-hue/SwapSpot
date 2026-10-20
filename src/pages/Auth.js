import React, { useCallback, useState } from 'react';
import { Link } from 'react-router';
import Logo from '../components/Logo';
import { isCitEmail } from '../utils/validators';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const validEmail = isCitEmail(email);
  const showEmailError = email.length > 0 && !validEmail;
  const handleEmail = useCallback((event) => { setEmail(event.target.value); setSubmitted(false); }, []);
  const handlePassword = useCallback((event) => setPassword(event.target.value), []);
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    setSubmitted(true);
    if (validEmail && password.length >= 8) setSent(true);
  }, [validEmail, password]);

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
          {sent ? <div className="confirmation-state" role="status"><span className="confirmation-icon">✉</span><span className="eyebrow">One last step</span><h2>Check your inbox.</h2><p>We sent a confirmation link to <strong>{email}</strong>. Confirm your email to activate your SwapSpot account.</p><button type="button" className="btn btn-primary" onClick={() => setSent(false)}>Back to sign in</button><p className="form-footnote">Didn’t get it? Check your spam folder or try again.</p></div> : <><span className="eyebrow">Welcome to SwapSpot</span><h2>Make campus<br /><em>work for you.</em></h2><p className="auth-intro">Join with your CIT-U email to get started.</p>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="email">CIT-U email</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={handleEmail} placeholder="you@cit.edu" aria-invalid={showEmailError || (submitted && !validEmail)} aria-describedby={showEmailError || (submitted && !validEmail) ? 'email-error' : undefined} />
              {showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
              {submitted && !validEmail && !showEmailError && <p className="field-error" id="email-error" role="alert">Only @cit.edu addresses can register.</p>}
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" value={password} onChange={handlePassword} placeholder="At least 8 characters" aria-invalid={submitted && password.length < 8} aria-describedby={submitted && password.length < 8 ? 'password-error' : undefined} />
              {submitted && password.length < 8 && <p className="field-error" id="password-error" role="alert">Use at least 8 characters for your password.</p>}
              <p className="form-footnote">Your password is stored hashed and never shared.</p>
              <button type="submit" className="btn btn-primary auth-submit" disabled={!validEmail}>Send confirmation email <span aria-hidden="true">→</span></button>
            </form>
            <div className="auth-links"><Link to="/auth">Forgot password?</Link><span>Already a member? <Link to="/auth">Log in</Link></span></div>
            <p className="auth-policy">By continuing, you agree to keep SwapSpot safe and respectful for our campus community.</p>
          </>}
        </div>
      </section>
    </main>
  );
}

export default Auth;