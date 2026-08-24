import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="top-nav-bar">
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link to={isAuthenticated ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#0d9488,#0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(13,148,136,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" /><line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" /><line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: 'var(--text)' }}>SatQuery AI</span>
              <span className="badge badge-zinc" style={{ fontSize: 9 }}>v0.3.0</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.2 }}>Grounded Earth Observation Platform</div>
          </div>
        </Link>

        {/* Authenticated Workspace Navigation Links */}
        {isAuthenticated && (
          <div className="nav-links-cluster">
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              Dashboard
            </Link>
            <Link to="/analyze" className={`nav-link ${isActive('/analyze') ? 'active' : ''}`}>
              <span style={{ color: '#0d9488' }}>●</span> New Analysis
            </Link>
            <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
              History
            </Link>
            <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
              Reports
            </Link>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isAuthenticated ? (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* User Dropdown Trigger */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="user-nav-btn"
              aria-expanded={dropdownOpen}
            >
              <div className="user-avatar-badge">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{user?.full_name || 'User'}</div>
                <div style={{ fontSize: 9.5, color: '#64748b' }}>{user?.role || 'Researcher'}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="user-dropdown-menu fade-up">
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signed in as</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{user?.email}</div>
                  {user?.organization && (
                    <div style={{ fontSize: 10.5, color: '#0d9488', marginTop: 2 }}>🏢 {user.organization}</div>
                  )}
                </div>

                <div style={{ padding: '4px 0' }}>
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>👤</span> My Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>⚙️</span> Settings
                  </Link>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false)
                      alert('SatQuery AI Support & Documentation: Reference User Guide in /builtin/skills/antigravity_guide.')
                    }}
                  >
                    <span>❓</span> Help & Documentation
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', padding: '4px 0' }}>
                  <button
                    onClick={handleLogout}
                    className="dropdown-item logout"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" className="btn-ghost-nav">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary-nav">
              Create Account
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
