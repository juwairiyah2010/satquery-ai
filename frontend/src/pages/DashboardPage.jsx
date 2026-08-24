import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total_analyses: 0, total_reports: 0, primary_modality: 'optical' })
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      if (API_BASE) {
        try {
          const res = await axios.get(`${API_BASE}/api/dashboard/stats`, { timeout: 4000 })
          if (res.data) {
            setStats(res.data.stats || { total_analyses: 0, total_reports: 0, primary_modality: 'optical' })
            setRecentAnalyses(res.data.recent_analyses || [])
            setRecentReports(res.data.recent_reports || [])
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Remote dashboard stats skipped/offline, checking local workspace:', err.message)
        }
      }

      // Fallback to locally stored analyses & reports for offline/standalone Vercel preview
      try {
        const localAnalyses = JSON.parse(localStorage.getItem('satquery_user_analyses') || '[]')
        const localReports = JSON.parse(localStorage.getItem('satquery_user_reports') || '[]')
        
        setStats({
          total_analyses: localAnalyses.length,
          total_reports: localReports.length,
          primary_modality: localAnalyses[0]?.mode || 'optical'
        })
        setRecentAnalyses(localAnalyses.slice(0, 5))
        setRecentReports(localReports.slice(0, 5))
      } catch (e) {
        console.warn('Failed to parse local analyses:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px', width: '100%' }} className="fade-up">
      
      {/* ══ TOP HERO BANNER ══ */}
      <div className="dashboard-welcome-banner">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 12, background: 'rgba(13,148,136,0.15)', color: '#0d9488', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            <span>🛰️</span> Earth Observation Operations Console
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Scientist'}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Ready to analyze satellite imagery?
          </p>

          {/* Main Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <Link to="/analyze" className="btn-primary-action">
              <span>➕</span> New Analysis
            </Link>
            <Link to="/history" className="btn-secondary-action">
              <span>📋</span> View History
            </Link>
            <Link to="/reports" className="btn-secondary-action">
              <span>📑</span> Reports
            </Link>
          </div>
        </div>

        {/* Small User Profile Card */}
        <div className="dashboard-user-card">
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>
            Active Security Clearance
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Name:</span>
              <strong style={{ color: '#0f172a' }}>{user?.full_name || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Role:</span>
              <span className="badge badge-teal" style={{ fontSize: 10.5 }}>{user?.role || 'Researcher'}</span>
            </div>
            {user?.organization && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Organization:</span>
                <strong style={{ color: '#0f172a' }}>{user.organization}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Account:</span>
              <span style={{ color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✓</span> Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS COUNTERS ══ */}
      <div className="dashboard-stats-grid">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#f0fdfa', color: '#0d9488' }}>📊</div>
          <div>
            <div className="stat-value">{stats.total_analyses}</div>
            <div className="stat-label">Saved Analyses</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#0284c7' }}>📑</div>
          <div>
            <div className="stat-value">{stats.total_reports}</div>
            <div className="stat-label">Decision Briefs</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#fefce8', color: '#ca8a04' }}>🛰️</div>
          <div>
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{stats.primary_modality || 'Optical'}</div>
            <div className="stat-label">Primary Modality</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#fdf2f8', color: '#db2777' }}>🛡️</div>
          <div>
            <div className="stat-value">FOUO</div>
            <div className="stat-label">Security Tier</div>
          </div>
        </div>
      </div>

      {/* ══ RECENT ANALYSES ══ */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🕒</span> Recent Analyses
          </h2>
          <Link to="/history" style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', textDecoration: 'none' }}>
            View All History →
          </Link>
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="empty-state-box">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛰️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No satellite analyses performed yet</div>
            <p style={{ fontSize: 12, color: '#64748b', maxWidth: 360, margin: '0 0 16px' }}>
              Upload your first optical, SAR, or bi-temporal scene and ask natural-language questions.
            </p>
            <Link to="/analyze" className="btn-primary-action" style={{ display: 'inline-flex' }}>
              Start First Analysis
            </Link>
          </div>
        ) : (
          <div className="recent-analyses-table-wrap">
            <table className="recent-analyses-table">
              <thead>
                <tr>
                  <th>Analysis Title / Query</th>
                  <th>Sensor Modality</th>
                  <th>Confidence</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{a.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>"{a.question}"</div>
                    </td>
                    <td>
                      <span className={`badge ${a.mode === 'sar' ? 'badge-amber' : a.mode === 'bitemporal' ? 'badge-blue' : 'badge-teal'}`} style={{ fontSize: 10.5, textTransform: 'uppercase' }}>
                        {a.mode}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: 10.5 }}>
                        {Math.round(a.confidence * 100)}% ({a.confidence_label})
                      </span>
                    </td>
                    <td style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/analyze?replay=${a.id}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#0d9488', textDecoration: 'none', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#ffffff' }}
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
