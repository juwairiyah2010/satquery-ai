import { Bot, CheckCircle, AlertTriangle, Loader } from 'lucide-react'

const TASK_LABELS = {
  vqa: { label: 'Visual QA', color: '#2dd4bf' },
  change_detection: { label: 'Change Detection', color: '#f59e0b' },
  segmentation: { label: 'Segmentation', color: '#8b5cf6' },
  counting: { label: 'Object Counting', color: '#3b82f6' },
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.75 ? '#2dd4bf' : value >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">Confidence</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {value === 0 ? 'N/A' : `${pct}%`}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.06)' }}>
        {value > 0 && (
          <div
            className="confidence-bar-fill"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
          />
        )}
      </div>
    </div>
  )
}

export default function ResultView({ result, loading, error }) {
  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center gap-4 min-h-[200px] fade-in">
        <div className="relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(45,212,191,0.1)' }}>
            <Loader size={20} className="text-teal-400" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-medium">Analyzing image…</p>
          <p className="text-slate-500 text-sm mt-1">Running VLM inference — this may take a moment</p>
        </div>
        {/* Animated dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400"
                 style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-5 fade-in"
           style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-red-400 font-semibold text-sm">Error</span>
        </div>
        <p className="text-red-300 text-sm leading-relaxed">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]"
           style={{ border: '1px dashed var(--border)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)' }}>
          <Bot size={22} className="text-teal-400 opacity-60" />
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-sm">Query result will appear here</p>
          <p className="text-slate-700 text-xs mt-1">Upload an image and ask a question</p>
        </div>
      </div>
    )
  }

  const taskMeta = TASK_LABELS[result.task_type] || { label: result.task_type, color: '#94a3b8' }
  const isPlaceholder = result.confidence === 0

  return (
    <div className="flex flex-col gap-4 fade-in">
      {/* Task Type Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider"
              style={{
                background: `${taskMeta.color}18`,
                color: taskMeta.color,
                border: `1px solid ${taskMeta.color}40`,
              }}>
          {taskMeta.label}
        </span>
        {!isPlaceholder && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <CheckCircle size={11} className="text-green-400" />
            <span>Inference complete</span>
          </div>
        )}
        {isPlaceholder && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <AlertTriangle size={11} />
            <span>Phase 2 feature</span>
          </div>
        )}
      </div>

      {/* Answer Card */}
      <div className="glass-card p-5"
           style={{ borderColor: isPlaceholder ? 'rgba(245,158,11,0.25)' : 'var(--border-bright)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={14} className="text-teal-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">AI Answer</span>
        </div>
        <p className="text-slate-200 leading-relaxed text-sm">{result.answer}</p>
      </div>

      {/* Confidence */}
      <div className="glass-card p-4">
        <ConfidenceBar value={result.confidence} />
      </div>

      {/* Image meta */}
      {result.image_meta && (
        <div className="glass-card p-4 flex flex-wrap gap-x-4 gap-y-1">
          <MetaPill label="Width"  value={`${result.image_meta.width}px`} />
          <MetaPill label="Height" value={`${result.image_meta.height}px`} />
          <MetaPill label="Mode"   value={result.image_meta.mode} />
        </div>
      )}
    </div>
  )
}

function MetaPill({ label, value }) {
  return (
    <div className="text-xs flex gap-1.5">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-300 font-mono">{value}</span>
    </div>
  )
}
