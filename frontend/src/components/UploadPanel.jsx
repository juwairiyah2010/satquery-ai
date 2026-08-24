import { useCallback, useRef, useState } from 'react'
import { Upload, ImageIcon, X, Info } from 'lucide-react'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/tiff', 'image/tif']
const ALLOWED_EXT   = /\.(png|jpe?g|tiff?)$/i

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function UploadPanel({ image, onImageSelect, onImageClear }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback((file) => {
    setError(null)
    if (!file) return

    const validType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name)
    if (!validType) {
      setError('Unsupported format. Please use PNG, JPEG, or TIFF.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50 MB.')
      return
    }

    const url = URL.createObjectURL(file)
    onImageSelect({ file, previewUrl: url, name: file.name, size: file.size })
  }, [onImageSelect])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const handleClear = () => {
    setError(null)
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl)
    onImageClear()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ImageIcon size={16} className="text-teal-400" />
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Image Input
        </span>
      </div>

      {/* Drop Zone */}
      {!image ? (
        <div
          className={`dropzone flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center min-h-[220px] ${dragOver ? 'drag-over' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)' }}>
            <Upload size={24} className="text-teal-400" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Drop satellite image here</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['PNG', 'JPEG', 'TIFF'].map(fmt => (
              <span key={fmt} className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.2)' }}>
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-xs">Max 50 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.tif,.tiff"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      ) : (
        /* Image Preview */
        <div className="flex-1 flex flex-col gap-3 fade-in">
          <div className="relative rounded-xl overflow-hidden group"
               style={{ border: '1px solid var(--border-bright)' }}>
            <img
              src={image.previewUrl}
              alt="Satellite preview"
              className="w-full object-cover"
              style={{ maxHeight: '280px' }}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <button
                onClick={handleClear}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 bg-opacity-90 hover:bg-opacity-100"
                title="Remove image"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
            {/* Teal corner badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono font-medium"
                 style={{ background: 'rgba(0,0,0,0.7)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)' }}>
              LOADED
            </div>
          </div>

          {/* Metadata */}
          <div className="glass-card p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Info size={12} className="text-teal-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Metadata</span>
            </div>
            <MetaRow label="File" value={image.name} mono />
            <MetaRow label="Size" value={formatBytes(image.size)} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 px-3 py-2 rounded-lg fade-in"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Info blurb */}
      <div className="text-xs text-slate-600 leading-relaxed px-1">
        Satellite, aerial, and drone imagery supported. For best results, use
        images with geographic context (roads, water bodies, vegetation, urban areas).
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-300 text-right break-all ${mono ? 'font-mono' : ''}`}
            style={{ maxWidth: '160px', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}
