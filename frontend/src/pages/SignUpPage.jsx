import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  'Student / Researcher',
  'Government / Disaster Management',
  'Agriculture',
  'Urban Planning',
  'Environmental Monitoring',
  'Other'
]

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('Student / Researcher')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()

  // Live password complexity evaluation
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }
  }, [password])

  const passedChecksCount = Object.values(passwordChecks).filter(Boolean).length
  const strengthLevel = passedChecksCount <= 2 ? 'Weak' : passedChecksCount <= 4 ? 'Moderate' : 'Strong'
  const strengthColor = passedChecksCount <= 2 ? '#ef4444' : passedChecksCount <= 4 ? '#f59e0b' : '#10b981'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    if (passedChecksCount < 5) {
      if (!passwordChecks.length) setErrorMsg('Password must be at least 8 characters long.')
      else if (!passwordChecks.upper) setErrorMsg('Password must contain at least one uppercase letter.')
      else if (!passwordChecks.lower) setErrorMsg('Password must contain at least one lowercase letter.')
      else if (!passwordChecks.number) setErrorMsg('Password must contain at least one number.')
      else if (!passwordChecks.special) setErrorMsg('Password must contain at least one special character.')
      return
    }

    setSubmitting(true)

    const res = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      organization: organization.trim(),
      role
    })

    setSubmitting(false)

    if (res.success) {
      // If verification token exists, navigate to verification screen or directly to dashboard
      navigate('/dashboard', { replace: true })
    } else {
      setErrorMsg(res.error || 'Unable to create this account. Please try signing in or use another email.')
    }
  }

  return (
    <div className="auth-container">
      {/* ══ LEFT BRANDING PANE ══ */}
      <div className="auth-brand-pane">
        <div className="auth-brand-overlay" />

        {/* Top Logo */}
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
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.04em' }}>Geospatial Earth Observation Platform</div>
          </div>
        </div>

        {/* Center Text */}
        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', color: '#2dd4bf', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            <span>🔒</span> Dedicated User Workspace
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Set up your workspace for <br />
            <span style={{ background: 'linear-gradient(135deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              satellite intelligence.
            </span>
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, maxWidth: 440, margin: 0 }}>
            Create an isolated environment to upload satellite scenes, execute natural-language queries, track multi-temporal change stories, and generate printable decision briefs.
          </p>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#cbd5e1' }}>
              <span style={{ color: '#2dd4bf', fontWeight: 800 }}>✓</span> User-isolated analysis history & report archive
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#cbd5e1' }}>
              <span style={{ color: '#2dd4bf', fontWeight: 800 }}>✓</span> Optical, SAR, and cross-modal agreement scoring
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#cbd5e1' }}>
              <span style={{ color: '#2dd4bf', fontWeight: 800 }}>✓</span> Anti-hallucination multi-source telemetry verification
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2, fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <span>ISRO-NDEM / FSI / MoHUA / CWC Compliant</span>
          <span style={{ color: '#2dd4bf' }}>● TLS / Bcrypt 12-Rounds</span>
        </div>
      </div>

      {/* ══ RIGHT FORM PANE ══ */}
      <div className="auth-form-pane" style={{ overflowY: 'auto' }}>
        <div className="auth-card fade-up" style={{ margin: 'auto 0' }}>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Create your SatQuery account
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Set up your workspace for satellite intelligence.
            </p>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="reg-fullname" className="form-label">Full Name</label>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <input
                  id="reg-fullname"
                  type="text"
                  className="auth-input with-icon"
                  placeholder="e.g. Dr. ABC"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label htmlFor="reg-email" className="form-label">Email address</label>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input with-icon"
                  placeholder="name@organization.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Organization (Optional) & Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div className="form-group">
                <label htmlFor="reg-org" className="form-label">Organization <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="reg-org"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. ISRO / NRSC"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-role" className="form-label">Primary Role</label>
                <select
                  id="reg-role"
                  className="auth-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label htmlFor="reg-password" className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input with-icon with-action"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {/* Password Strength Meter */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Password Strength:</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor }}>{strengthLevel}</span>
                  </div>
                  <div className="pwd-meter-track">
                    <div
                      className="pwd-meter-fill"
                      style={{
                        width: `${(passedChecksCount / 5) * 100}%`,
                        backgroundColor: strengthColor
                      }}
                    />
                  </div>
                  {/* Checklist */}
                  <div className="pwd-req-list">
                    <span className={`pwd-req-item ${passwordChecks.length ? 'met' : ''}`}>
                      {passwordChecks.length ? '✓' : '○'} 8+ chars
                    </span>
                    <span className={`pwd-req-item ${passwordChecks.upper ? 'met' : ''}`}>
                      {passwordChecks.upper ? '✓' : '○'} Uppercase
                    </span>
                    <span className={`pwd-req-item ${passwordChecks.lower ? 'met' : ''}`}>
                      {passwordChecks.lower ? '✓' : '○'} Lowercase
                    </span>
                    <span className={`pwd-req-item ${passwordChecks.number ? 'met' : ''}`}>
                      {passwordChecks.number ? '✓' : '○'} Number
                    </span>
                    <span className={`pwd-req-item ${passwordChecks.special ? 'met' : ''}`}>
                      {passwordChecks.special ? '✓' : '○'} Special char
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label htmlFor="reg-conf-password" className="form-label">Confirm Password</label>
              <div className="input-icon-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  id="reg-conf-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input with-icon"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✕</span> Passwords do not match.
                </div>
              )}
              {confirmPassword && password === confirmPassword && (
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span> Passwords match.
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
              style={{ marginTop: 22 }}
            >
              {submitting ? (
                <>
                  <span className="auth-spinner" />
                  <span>Creating account…</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Bottom Link */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" className="auth-link" style={{ fontWeight: 700 }}>
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
