import React, { useState, useRef, useMemo, useEffect } from 'react'

/**
 * DisasterGroundingView
 * Implements 3-Panel Disaster-Area Detection with a Separate Generated Annotated Output Image.
 * Original image remains 100% untouched.
 */
export default function DisasterGroundingView({
  imageA,
  imageB,
  disasterData,
  activeDept,
  onGenerateReport
}) {
  const [viewMode, setViewMode] = useState('compare') // 'compare' | 'analysis' | 'original' | 'change_map'
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [annotatedImgUrl, setAnnotatedImgUrl] = useState(null)
  const [changeMapUrl, setChangeMapUrl] = useState(null)
  const canvasRef = useRef(null)

  const regions = disasterData?.regions || []
  const selectedRegion = useMemo(() => {
    return regions.find(r => r.id === selectedRegionId) || regions[0] || null
  }, [regions, selectedRegionId])

  const disasterType = disasterData?.disaster_type || 'Flood'
  const isFlood = disasterType.toLowerCase().includes('flood')
  const isWildfire = disasterType.toLowerCase().includes('fire') || disasterType.toLowerCase().includes('wildfire')
  const isLandslide = disasterType.toLowerCase().includes('landslide')

  const themeColors = isFlood
    ? { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.4)', badge: '#0891b2', name: 'Flood Inundation', icon: '🌊', hex: '#06b6d4' }
    : isWildfire
    ? { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.4)', badge: '#dc2626', name: 'Wildfire Burn Scar', icon: '🔥', hex: '#ef4444' }
    : { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.4)', badge: '#d97706', name: 'Slope Failure', icon: '⛰️', hex: '#f59e0b' }

  // 1. Resolve or Client-side Generate Annotated Image
  useEffect(() => {
    if (disasterData?.annotated_image_url) {
      setAnnotatedImgUrl(disasterData.annotated_image_url)
      if (disasterData.change_map_url) {
        setChangeMapUrl(disasterData.change_map_url)
      }
      return
    }

    // Client-side fallback canvas rasterizer if running offline / standalone Vercel preview
    const rawSrc = imageA?.previewUrl || imageA?.src
    if (!rawSrc) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.naturalWidth || 800
      canvas.height = img.naturalHeight || 600
      const w = canvas.width
      const h = canvas.height

      // Draw original image untouched underneath
      ctx.drawImage(img, 0, 0, w, h)

      // Draw regions
      regions.forEach((reg, idx) => {
        const poly = reg.polygon || []
        if (poly.length >= 3) {
          ctx.beginPath()
          poly.forEach(([x, y], i) => {
            const px = x * w
            const py = y * h
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.closePath()

          // Semi-transparent polygon fill
          ctx.fillStyle = themeColors.fill
          ctx.fill()

          // Crisp outline stroke
          ctx.strokeStyle = themeColors.stroke
          ctx.lineWidth = Math.max(3, w * 0.0035)
          ctx.stroke()

          // Centroid Badge
          const xs = poly.map(p => p[0] * w)
          const ys = poly.map(p => p[1] * h)
          const cx = xs.reduce((a, b) => a + b, 0) / xs.length
          const cy = ys.reduce((a, b) => a + b, 0) / ys.length

          ctx.beginPath()
          ctx.arc(cx, cy, Math.max(14, w * 0.02), 0, Math.PI * 2)
          ctx.fillStyle = themeColors.badge
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()

          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(idx + 1), cx, cy)
        }
      })

      // Embedded Legend in bottom right
      const legW = Math.min(320, w * 0.45)
      const legH = 65
      const lx = w - legW - 14
      const ly = h - legH - 14
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.fillRect(lx, ly, legW, legH)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.strokeRect(lx, ly, legW, legH)

      ctx.fillStyle = '#0d9488'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`🛰️ SatQuery AI · ${disasterType.toUpperCase()} ANALYSIS`, lx + 10, ly + 8)

      ctx.fillStyle = themeColors.stroke
      ctx.fillRect(lx + 10, ly + 24, 12, 12)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '10px sans-serif'
      ctx.fillText(`Detected ${disasterType} Affected Area`, lx + 28, ly + 25)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '9px sans-serif'
      ctx.fillText(`${regions.length} Sectors · Confidence: ${disasterData?.confidence || 'High'}`, lx + 10, ly + 44)

      setAnnotatedImgUrl(canvas.toDataURL('image/png'))
    }
    img.src = rawSrc
  }, [imageA, disasterData, regions, disasterType, themeColors])

  // Download Handler
  const handleDownload = () => {
    if (!annotatedImgUrl) return
    const a = document.createElement('a')
    a.href = annotatedImgUrl
    a.download = `SatQuery_Analysis_${disasterType}_${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="disaster-grounding-card" style={{ marginTop: 24 }}>
      
      {/* ══ HEADER & COMPARISON TOOLBAR ══ */}
      <div className="disaster-grounding-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22 }}>{themeColors.icon}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {disasterData?.headline || `${themeColors.name} Detection`}
              </h3>
              <span className="badge badge-teal" style={{ fontSize: 10 }}>
                ● SEPARATE ANNOTATED IMAGE GENERATED
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              Original satellite image preserved unchanged · {regions.length} affected sectors highlighted.
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewMode('compare')}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                background: viewMode === 'compare' ? '#0d9488' : 'transparent',
                color: viewMode === 'compare' ? '#ffffff' : '#475569',
                cursor: 'pointer'
              }}
            >
              Side-by-Side Compare
            </button>
            <button
              onClick={() => setViewMode('analysis')}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                background: viewMode === 'analysis' ? '#0d9488' : 'transparent',
                color: viewMode === 'analysis' ? '#ffffff' : '#475569',
                cursor: 'pointer'
              }}
            >
              SatQuery Analysis Only
            </button>
            <button
              onClick={() => setViewMode('original')}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                background: viewMode === 'original' ? '#0d9488' : 'transparent',
                color: viewMode === 'original' ? '#ffffff' : '#475569',
                cursor: 'pointer'
              }}
            >
              Original Image Only
            </button>
            {changeMapUrl && (
              <button
                onClick={() => setViewMode('change_map')}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: viewMode === 'change_map' ? '#0d9488' : 'transparent',
                  color: viewMode === 'change_map' ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                Change Map
              </button>
            )}
          </div>

          <button
            onClick={handleDownload}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 6,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>⬇️</span> Download Analysis Image
          </button>
        </div>
      </div>

      {/* ══ 3-PANEL OUTPUT PRESENTATION ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'compare' ? '1fr 1fr 340px' : '1fr 340px', gap: 0, minHeight: 460 }} className="grounding-grid-responsive">
        
        {/* ── PANEL 1: ORIGINAL SATELLITE IMAGE (Unchanged) ── */}
        {(viewMode === 'compare' || viewMode === 'original') && (
          <div style={{ background: '#090d16', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📷 ORIGINAL SATELLITE IMAGE
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                {imageA?.format || 'GeoTIFF'} · Unchanged Reference
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, minHeight: 340 }}>
              <img
                src={imageA?.previewUrl || imageA?.src}
                alt="Original Satellite Image"
                style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(15,23,42,0.7)', fontSize: 10.5, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              Source: {imageA?.name || 'satellite_scene'} · Native Resolution
            </div>
          </div>
        )}

        {/* ── PANEL 2: SATQUERY GENERATED ANNOTATED IMAGE ── */}
        {(viewMode === 'compare' || viewMode === 'analysis') && (
          <div style={{ background: '#090d16', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🛰️</span> SATQUERY ANALYSIS (ANNOTATED OUTPUT)
              </span>
              <span className="badge badge-teal" style={{ fontSize: 9.5 }}>
                {regions.length} SECTORS MARKED
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, minHeight: 340 }}>
              {annotatedImgUrl ? (
                <img
                  src={annotatedImgUrl}
                  alt="SatQuery Annotated Analysis"
                  style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', display: 'block', borderRadius: 4 }}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Generating annotated output image…</div>
              )}
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(15,23,42,0.7)', fontSize: 10.5, color: '#06b6d4', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Legend: ████ {themeColors.name} Mask</span>
              <span>Semi-Transparent Overlays (Original Terrain Visible)</span>
            </div>
          </div>
        )}

        {/* ── PANEL 2.5: CHANGE MAP (If selected) ── */}
        {viewMode === 'change_map' && changeMapUrl && (
          <div style={{ background: '#090d16', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4' }}>
                🔄 BI-TEMPORAL DIFFERENTIAL CHANGE MAP (T0 vs T1)
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
              <img src={changeMapUrl} alt="Change Map" style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* ── PANEL 3: ANALYSIS RESULT & REGION INSPECTOR ── */}
        <div style={{ background: '#ffffff', padding: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Analysis Result
            </span>
            <span className="badge badge-teal" style={{ fontSize: 10 }}>
              {disasterData?.confidence || 'High'} Confidence
            </span>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{themeColors.icon}</span>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>{disasterType} Detected</strong>
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              {disasterData?.summary || `SatQuery detected ${regions.length} potential ${disasterType.toLowerCase()}-affected regions. These regions are highlighted in the generated analysis image.`}
            </div>
          </div>

          {/* Delineated Regions Pill List */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Delineated Affected Regions ({regions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {regions.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRegionId(r.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid ' + (selectedRegion?.id === r.id ? '#0d9488' : '#e2e8f0'),
                    background: selectedRegion?.id === r.id ? '#f0fdfa' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 9, background: themeColors.badge, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{r.label}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>{r.sub_type}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0d9488' }}>
                      {r.area_sq_km ? `${r.area_sq_km} sq km` : `${r.area_pct}%`}
                    </div>
                    <span className="badge badge-zinc" style={{ fontSize: 9 }}>{r.confidence}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Region Specific Evidence Card */}
          {selectedRegion && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                🔍 Physical Evidence ({selectedRegion.label})
              </div>
              <p style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.4, margin: '0 0 6px', background: '#f1f5f9', padding: '6px 8px', borderRadius: 4 }}>
                {selectedRegion.evidence}
              </p>
              <div style={{ fontSize: 10.5, color: '#64748b' }}>
                Tool: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{selectedRegion.analysis_method}</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ══ FOOTER BAR: ACTIONS & BASELINE AUDIT ══ */}
      <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🛡️ <strong>Anti-Hallucination Verified:</strong> Baseline permanent rivers/lakes calibrated and excluded from flood count.</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDownload}
            className="btn-secondary-action"
            style={{ fontSize: 11, padding: '6px 12px' }}
          >
            <span>⬇️</span> Download Image
          </button>
          <button
            onClick={onGenerateReport}
            className="btn-primary-action"
            style={{ fontSize: 11, padding: '6px 14px' }}
          >
            <span>📑</span> Disaster Assessment Report
          </button>
        </div>
      </div>

    </div>
  )
}
