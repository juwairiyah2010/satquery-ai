import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const tokenParam = searchParams.get('token') || ''

  const [token, setToken] = useState(tokenParam)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!token.trim()) {
      setErrorMsg('Missing password reset token.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)

    const res = await resetPassword({
      token: token.trim(),
      newPassword,
      confirmNewPassword
    })

    setSubmitting(false)

    if (res.success) {
      setSuccess(true)
    } else {
      setErrorMsg(res.error || 'Failed to reset password. The link may have expired.')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-brand-pane">
        <div className="auth-brand-overlay" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#0d9488,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.22" y1="4.22" x2="7.05" y2="7.05" /><line x1="16.95" y1="16.95" x2="19.78" y2="19.78" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>SATQUERY AI</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Security Verification</div>
          </div>
        </div>

        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
            Choose a new <br />
            <span style={{ color: '#2dd4bf' }}>secure password</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, maxWidth: 420 }}>
            Ensure your password is at least 8 characters long and contains uppercase letters, numbers, and special symbols.
          </p>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Set new password
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Enter your new credentials below
            </p>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} noValidate>
              
              {/* Token field if not in URL */}
              {!tokenParam && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="reset-token" className="form-label">Reset Token</label>
                  <input
                    id="reset-token"
                    type="text"
                    className="auth-input"
                    placeholder="Enter reset token from link"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* New Password */}
              <div className="form-group">
                <label htmlFor="new-pass" className="form-label">New Password</label>
                <div className="input-icon-wrapper">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input with-icon with-action"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label htmlFor="conf-new-pass" className="form-label">Confirm New Password</label>
                <div className="input-icon-wrapper">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="conf-new-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input with-icon"
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
                style={{ marginTop: 22 }}
              >
                {submitting ? 'Updating password…' : 'Update Password'}
              </button>
            </form>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#166534', marginBottom: 6 }}>Password Updated</div>
              <p style={{ fontSize: 13, color: '#15803d', margin: '0 0 16px' }}>
                Your password has been updated successfully. You can now sign in to your SatQuery account.
              </p>
              <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Return to Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
