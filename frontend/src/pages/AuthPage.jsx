import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Shield, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Helper ────────────────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Left Branding Panel ───────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div className="auth-brand-panel">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-brand-content">
        <div className="auth-logo-row">
          <div className="auth-logo-icon">
            <Shield size={22} color="white" />
          </div>
          <div>
            <div className="auth-logo-name">Flow4Ward</div>
            <div className="auth-logo-sub">Traffic Control Command Center</div>
          </div>
        </div>

        <div className="auth-features">
          <AuthFeature icon="🚦" title="Real-time Monitoring"     desc="Live traffic analysis across Bengaluru zones" />
          <AuthFeature icon="🤖" title="AI-Powered Predictions"   desc="Forecast congestion with machine learning" />
          <AuthFeature icon="📊" title="Resource Allocation"      desc="Optimize deployment of traffic officers" />
        </div>

        <div className="auth-brand-footer">
          <div className="auth-divider-line" />
          <p className="auth-brand-note">For Bengaluru Traffic Police &amp; Control Centre</p>
          <p className="auth-brand-subnote">Access restricted to @officer.com.in domain</p>
        </div>
      </div>
    </div>
  );
}

function AuthFeature({ icon, title, desc }) {
  return (
    <div className="auth-feature-item">
      <div className="auth-feature-icon">{icon}</div>
      <div>
        <div className="auth-feature-title">{title}</div>
        <div className="auth-feature-desc">{desc}</div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, signIn, signUp } = useAuth();

  // Where to go after login (preserves deep links)
  const from = location.state?.from?.pathname || '/dashboard';

  // ── If already logged in, skip straight to the panel ──────────────────────
  if (user) return <Navigate to={from} replace />;

  return <AuthForm from={from} navigate={navigate} signIn={signIn} signUp={signUp} />;
}

// ─── Separated so hooks always run in the same order ─────────────────────
function AuthForm({ from, navigate, signIn, signUp }) {
  const [tab, setTab]             = useState('signin');
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [destPath, setDestPath]   = useState(from);

  // Form fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Navigate AFTER the success banner has been visible for ~800 ms ─────────
  // This useEffect approach guarantees navigation happens AFTER React has
  // committed the user state update, fixing the "dashboard blank after signup" bug.
  useEffect(() => {
    if (!readyToNavigate) return;
    const t = setTimeout(() => navigate(destPath, { replace: true }), 900);
    return () => clearTimeout(t);
  }, [readyToNavigate, destPath, navigate]);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPw('');
    setError(''); setSuccess(''); setShowPass(false); setShowConfirm(false);
    setReadyToNavigate(false);
  };

  const switchTab = (t) => { setTab(t); resetForm(); };

  // ── Sign In ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      await signIn({ email, password });
      setSuccess('Welcome back! Redirecting…');
      setDestPath(from);
      setReadyToNavigate(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name || !email || !password || !confirmPw) { setError('Please fill in all fields.'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signUp({ name, email, password });
      setSuccess('Account created! Taking you to your dashboard…');
      setDestPath('/dashboard');
      setReadyToNavigate(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-form-panel">
        <div className="auth-form-container">

          {/* Tab Toggle */}
          <div className="auth-tabs" role="tablist">
            <button id="tab-signin" role="tab" aria-selected={tab === 'signin'}
              className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => switchTab('signin')}>Sign In</button>
            <button id="tab-signup" role="tab" aria-selected={tab === 'signup'}
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}>Sign Up</button>
            <div className="auth-tab-slider"
              style={{ transform: tab === 'signup' ? 'translateX(100%)' : 'translateX(0)' }} />
          </div>

          {/* ── SIGN IN ── */}
          {tab === 'signin' && (
            <form className="auth-form" onSubmit={handleSignIn} noValidate>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Welcome Back</h1>
                <p className="auth-form-subtitle">Sign in to access the control center</p>
              </div>

              <div className="auth-info-banner">
                <Mail size={14} />
                <span>Only @officer.com.in emails are allowed</span>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signin-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="signin-email" type="email" className="auth-input"
                    placeholder="name@officer.com.in" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signin-password">Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="signin-password" type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input-pass" placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password" />
                  <button type="button" className="auth-pass-toggle"
                    aria-label="Toggle password visibility" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error   && <FeedbackBanner type="error"   message={error} />}
              {success && <FeedbackBanner type="success" message={success} />}

              <button id="btn-signin-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
              </button>

              <p className="auth-switch-text">
                Don't have an account?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchTab('signup')}>
                  Sign up here
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignUp} noValidate>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Create Account</h1>
                <p className="auth-form-subtitle">Register with your official email</p>
              </div>

              <div className="auth-info-banner">
                <Mail size={14} />
                <span>Only @officer.com.in emails are allowed</span>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-name">Full Name</label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input id="signup-name" type="text" className="auth-input"
                    placeholder="Your full name" value={name}
                    onChange={e => setName(e.target.value)} autoComplete="name" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="signup-email" type="email" className="auth-input"
                    placeholder="name@officer.com.in" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-password">Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="signup-password" type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input-pass" placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" />
                  <button type="button" className="auth-pass-toggle"
                    aria-label="Toggle password visibility" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-confirm">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="signup-confirm" type={showConfirm ? 'text' : 'password'}
                    className="auth-input auth-input-pass" placeholder="Confirm your password"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password" />
                  <button type="button" className="auth-pass-toggle"
                    aria-label="Toggle confirm password" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error   && <FeedbackBanner type="error"   message={error} />}
              {success && <FeedbackBanner type="success" message={success} />}

              <button id="btn-signup-submit" type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
              </button>

              <p className="auth-switch-text">
                Already have an account?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchTab('signin')}>
                  Sign in here
                </button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Feedback Banner ───────────────────────────────────────────────────────
function FeedbackBanner({ type, message }) {
  return (
    <div className={`auth-feedback auth-feedback-${type}`}>
      {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
      <span>{message}</span>
    </div>
  );
}
