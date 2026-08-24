import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState(null)

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/reports`)
      setReports(res.data.reports || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this decision report from your archive?')) return
    try {
      await axios.delete(`${API_BASE}/api/reports/${id}`)
      setReports(reports.filter(r => r.id !== id))
    } catch (err) {
      alert('Failed to delete report: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px', width: '100%' }} className="fade-up">
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            📑 Decision Reports Archive
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Official satellite intelligence briefings generated for government & departmental review.
          </p>
        </div>
        <Link to="/analyze" className="btn-primary-action">
          <span>➕</span> New Analysis
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 12px' }} />
          <div>Loading your reports archive…</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state-box">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📑</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No decision reports saved yet</div>
          <p style={{ fontSize: 12, color: '#64748b', maxWidth: 360, margin: '0 0 16px' }}>
            After completing any satellite analysis, click "Generate Report" to export and save an official briefing.
          </p>
          <Link to="/analyze" className="btn-primary-action" style={{ display: 'inline-flex' }}>
            Go to Analysis Workspace
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {reports.map((r) => (
            <div key={r.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="badge badge-zinc" style={{ fontSize: 10, fontFamily: 'monospace' }}>{r.report_ref}</span>
                  <span className="badge badge-teal" style={{ fontSize: 9.5 }}>{r.classification}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.3 }}>
                  {r.title}
                </h3>
                <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 600, marginBottom: 8 }}>
                  🏢 {r.authority}
                </div>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, margin: '0 0 12px' }}>
                  {r.summary_text?.slice(0, 140)}…
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 6px', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => {
                      alert(`Opening report ${r.report_ref} for ${r.authority}`)
                    }}
                    className="how-btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    Print Brief →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
