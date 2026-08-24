import { useRef, useEffect } from 'react'
import { Send, MessageSquare, Sparkles } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'Describe the land cover types visible in this image.',
  'Is there a water body present? If so, describe its extent.',
  'Are there any signs of urban or built-up areas?',
  'What is the approximate vegetation density?',
  'Identify any roads or infrastructure visible.',
]

export default function ChatBox({ question, onChange, onSubmit, loading, hasImage }) {
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [question])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) onSubmit()
    }
  }

  const canSubmit = hasImage && question.trim().length > 0 && !loading

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-teal-400" />
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Query
        </span>
      </div>

      {/* Textarea */}
      <div className={`glass-card relative transition-all ${question ? 'teal-glow-border' : ''}`}>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasImage
            ? "Ask anything about this satellite image…\n(Enter to submit, Shift+Enter for newline)"
            : "Upload an image first, then ask your question…"
          }
          disabled={!hasImage || loading}
          rows={3}
          className="w-full bg-transparent resize-none outline-none text-slate-200 placeholder-slate-600 p-4 pr-14 text-sm leading-relaxed"
          style={{ minHeight: '80px' }}
        />
        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="btn-teal absolute bottom-3 right-3 p-2.5 rounded-lg flex items-center justify-center"
          title="Submit query (Enter)"
        >
          {loading
            ? <span className="spinner" />
            : <Send size={15} />
          }
        </button>
      </div>

      {/* Character counter */}
      <div className="flex justify-between items-center text-xs text-slate-600 px-1">
        <span>{question.length > 0 ? `${question.length} characters` : 'Press Enter to submit'}</span>
        <span className="text-slate-700">Shift+Enter for newline</span>
      </div>

      {/* Example queries */}
      {!question && hasImage && (
        <div className="fade-in">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-teal-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Example Queries
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => onChange(q)}
                className="text-left text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-teal-400 transition-colors"
                style={{
                  background: 'rgba(45,212,191,0.04)',
                  border: '1px solid rgba(45,212,191,0.12)',
                }}
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
