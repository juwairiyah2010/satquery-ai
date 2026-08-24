import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [demoToken, setDemoToken] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { forgotPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your account email address.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    const res = await forgotPassword(email.trim())
    setSubmitting(false)

    if (res.success) {
      setSubmitted(true)
      if (res.demoResetToken) {
        setDemoToken(res.demoResetToken)
      }
    } else {
      setErrorMsg(res.error || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="auth-container">
      {/* ══ LEFT BRANDING PANE ══ */}
      <div className="auth-brand-pane">
        <div className="auth-brand-overlay" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#0d9488,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(13,148,136,0.4)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.22" y1="4.22" x2="7.05" y2="7.05" /><line x1="16.95" y1="16.95" x2="19.78" y2="19.78" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>SATQUERY AI</div>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.04em' }}>Account Recovery & Access Security</div>
          </div>
        </div>

        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1.3, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            Account Security & <br />
            <span style={{ color: '#2dd4bf' }}>Identity Protection</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, maxWidth: 420 }}>
            SatQuery AI enforces zero-knowledge password recovery workflows. Reset tokens are single-use, cryptographically signed, and time-bounded.
          </p>
        </div>

        <div style={{ zIndex: 2, fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <span>ISRO Space Applications Standard Security Protocol</span>
        </div>
      </div>

      {/* ══ RIGHT FORM PANE ══ */}
      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Reset your password
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Enter the email address associated with your SatQuery account.
            </p>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="forgot-email" className="form-label">Email address</label>
                <div className="input-icon-wrapper">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input
                    id="forgot-email"
                    type="email"
                    className="auth-input with-icon"
                    placeholder="name@organization.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
                style={{ marginTop: 20 }}
              >
                {submitting ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Sending reset link…</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 18, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                <span>📬</span> Check your inbox
              </div>
              <p style={{ fontSize: 13, color: '#15803d', lineHeight: 1.5, margin: 0 }}>
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              </p>

              {demoToken && (
                <div style={{ marginTop: 14, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Local Developer Link:</div>
                  <Link
                    to={`/reset-password?token=${demoToken}`}
                    style={{ fontSize: 11, color: '#0d9488', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}
                  >
                    Click here to reset password directly →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Remembered your password?{' '}
            <Link to="/login" className="auth-link" style={{ fontWeight: 700 }}>
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
