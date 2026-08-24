import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('all')

  const fetchHistory = async () => {
    if (API_BASE) {
      try {
        const res = await axios.get(`${API_BASE}/api/analyses`, { timeout: 4000 })
        if (res.data?.analyses) {
          setAnalyses(res.data.analyses)
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Remote analyses fetch failed, falling back to local workspace:', err.message)
      }
    }

    try {
      const localAnalyses = JSON.parse(localStorage.getItem('satquery_user_analyses') || '[]')
      setAnalyses(localAnalyses)
    } catch (e) {
      console.warn('Failed to load local analyses:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this analysis from your history?')) return
    if (API_BASE) {
      try {
        await axios.delete(`${API_BASE}/api/analyses/${id}`)
      } catch (err) {
        console.warn('Remote delete failed:', err.message)
      }
    }
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    try {
      localStorage.setItem('satquery_user_analyses', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to update local storage:', e)
    }
  }

  const filteredAnalyses = analyses.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.question.toLowerCase().includes(search.toLowerCase())
    const matchesMode = filterMode === 'all' || a.mode === filterMode
    return matchesSearch && matchesMode
  })

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px', width: '100%' }} className="fade-up">
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            🛰️ Analysis History
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Your isolated repository of past Earth observation queries and evidence trails.
          </p>
        </div>
        <Link to="/analyze" className="btn-primary-action">
          <span>➕</span> New Analysis
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="auth-input"
            placeholder="Search by query, title, or keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'optical', 'sar', 'bitemporal'].map(m => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={`gov-dept-btn ${filterMode === m ? 'active' : ''}`}
              style={{ fontSize: 11, padding: '6px 12px', textTransform: 'capitalize' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 12px' }} />
          <div>Loading your workspace history…</div>
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="empty-state-box">
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>No matching analyses found</div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 16px' }}>Try adjusting your search query or start a new analysis.</p>
        </div>
      ) : (
        <div className="recent-analyses-table-wrap">
          <table className="recent-analyses-table">
            <thead>
              <tr>
                <th>Analysis & Question</th>
                <th>Sensor Modality</th>
                <th>Confidence</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalyses.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#475569', margin: '2px 0' }}>"{a.question}"</div>
                    {a.headline && (
                      <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 500 }}>
                        ↳ {a.headline}
                      </div>
                    )}
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
                    {new Date(a.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link
                        to={`/analyze?replay=${a.id}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#0d9488', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4, textDecoration: 'none', background: '#fff' }}
                      >
                        Re-run
                      </Link>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ fontSize: 11, color: '#ef4444', background: '#fff', border: '1px solid #fecaca', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                        title="Delete from workspace"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
