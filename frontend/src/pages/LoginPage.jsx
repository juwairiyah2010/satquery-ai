import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [googleAvailable, setGoogleAvailable] = useState(false)

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get return redirect url
  const searchParams = new URLSearchParams(location.search)
  const redirectUrl = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')) : '/dashboard'

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectUrl])

  // Check Google OAuth availability
  useEffect(() => {
    axios.get(`${API_BASE}/api/auth/google/status`)
      .then(res => setGoogleAvailable(res.data?.available || false))
      .catch(() => setGoogleAvailable(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    const res = await login({
      email: email.trim(),
      password,
      rememberMe
    })

    setSubmitting(false)

    if (res.success) {
      navigate(redirectUrl, { replace: true })
    } else {
      setErrorMsg(res.error || 'Email or password is incorrect.')
    }
  }

  return (
    <div className="auth-container">
      {/* ══ LEFT BRANDING PANE ══ */}
      <div className="auth-brand-pane">
        <div className="auth-brand-overlay" />
        
        {/* Top Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#0d9488,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(13,148,136,0.4)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" /><line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" /><line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>SATQUERY AI</div>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.04em' }}>Space Applications & Remote Sensing Intelligence</div>
          </div>
        </div>

        {/* Center Tagline & Satellite Visual */}
        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', color: '#2dd4bf', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            <span>🛰️</span> Earth Observation Workspace
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Ask questions. <br />
            <span style={{ background: 'linear-gradient(135deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Understand satellite imagery.
            </span>
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, maxWidth: 440, margin: 0 }}>
            An evidence-grounded satellite intelligence platform for disaster response, forest surveillance, urban growth auditing, and hydrological monitoring.
          </p>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 32 }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>⚡ Multimodal Reasoning</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Optical, SAR & Bi-Temporal cross-verification</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>🛡️ Strict Anti-Hallucination</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Never predicts without verified sensor feeds</div>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <span>ISRO / SAC Command Specification</span>
          <span style={{ color: '#2dd4bf' }}>● End-to-End Encrypted</span>
        </div>
      </div>

      {/* ══ RIGHT AUTH FORM PANE ══ */}
      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Sign in to continue to SatQuery AI
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email address
              </label>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input with-icon"
                  placeholder="name@organization.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label htmlFor="login-password" className="form-label" style={{ margin: 0 }}>
                  Password
                </label>
                <Link to="/forgot-password" className="auth-link" style={{ fontSize: 12 }}>
                  Forgot password?
                </Link>
              </div>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input with-icon with-action"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: '#0d9488', cursor: 'pointer' }}
              />
              <label htmlFor="remember-me" style={{ fontSize: 12.5, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                Remember me for 7 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
              style={{ marginTop: 22 }}
            >
              {submitting ? (
                <>
                  <span className="auth-spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>OR</span>
          </div>

          {/* Google Sign In (Optional) */}
          <button
            type="button"
            className="auth-google-btn"
            disabled={!googleAvailable}
            onClick={() => {
              if (googleAvailable) {
                alert('Redirecting to Google Enterprise SSO...')
              }
            }}
            title={googleAvailable ? 'Sign in with Google' : 'Google OAuth is not configured on this server'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>{googleAvailable ? 'Continue with Google' : 'Continue with Google (Not Configured)'}</span>
          </button>

          {/* Bottom Create Account Link */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link" style={{ fontWeight: 700 }}>
              Create account
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
