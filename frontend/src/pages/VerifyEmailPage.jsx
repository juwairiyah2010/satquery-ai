import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function VerifyEmailPage() {
  const { user } = useAuth()
  const [tokenInput, setTokenInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!tokenInput.trim()) {
      setError('Please enter the activation token.')
      return
    }
    setVerifying(true)
    setError('')
    try {
      await axios.post(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(tokenInput.trim())}`)
      setVerified(true)
      setMsg('Email verified successfully! You now have full clearance.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification link.')
    } finally {
      setVerifying(false)
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
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Email Verification</div>
          </div>
        </div>

        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
            Verify your email <br />
            <span style={{ color: '#2dd4bf' }}>for full workspace access</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, maxWidth: 420 }}>
            Check your inbox for a verification link to activate your SatQuery account and enable high-resolution satellite exports.
          </p>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-card fade-up">
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Verify your email
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Check your inbox for a verification link to activate your SatQuery account.
            </p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {verified ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>Account Activated!</div>
              <p style={{ fontSize: 13, color: '#15803d', margin: '0 0 16px' }}>{msg}</p>
              <button onClick={() => navigate('/dashboard')} className="auth-submit-btn">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label htmlFor="token-input" className="form-label">Activation / Token Code</label>
                <input
                  id="token-input"
                  type="text"
                  className="auth-input"
                  placeholder="Paste verification code here"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={verifying}
                style={{ marginTop: 18 }}
              >
                {verifying ? 'Activating…' : 'Activate Account'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, fontSize: 12 }}>
                <button
                  type="button"
                  onClick={() => alert('A fresh verification email has been dispatched.')}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Resend verification email
                </button>
                <Link to="/profile" style={{ color: '#64748b', textDecoration: 'none' }}>
                  Change email
                </Link>
              </div>
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            <Link to="/dashboard" className="auth-link">
              Continue to Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
