import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#94a3b8' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: '#0d9488', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.04em' }}>Verifying SatQuery AI Security Credentials…</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    // Redirect unauthenticated user to /login with original target URL
    const redirectPath = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />
  }

  return children
}
