import { useState } from 'react'
import { ChevronDown, ChevronRight, GitBranch, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

const STEP_ICONS = {
  image_validation:  '🖼️',
  task_classification: '🏷️',
  vlm_inference:     '🤖',
  placeholder_response: '⏳',
  response_ready:    '✅',
}

const STEP_LABELS = {
  image_validation:    'Image Validation',
  task_classification: 'Task Classification',
  vlm_inference:       'VLM Inference',
  placeholder_response: 'Placeholder Response',
  response_ready:      'Response Ready',
}

function StatusIcon({ status }) {
  if (status === 'ok')    return <CheckCircle size={12} className="text-green-400 shrink-0" />
  if (status === 'warn')  return <AlertTriangle size={12} className="text-amber-400 shrink-0" />
  if (status === 'error') return <XCircle size={12} className="text-red-400 shrink-0" />
  return null
}

function TraceStep({ step, index, total }) {
  const isLast = index === total - 1
  return (
    <div className="relative pl-6">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[9px] top-5 bottom-0 w-px"
             style={{ background: 'var(--border)' }} />
      )}
      {/* Dot */}
      <div className="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center"
           style={{
             background: step.status === 'ok'    ? 'rgba(16,185,129,0.2)'  :
                         step.status === 'warn'  ? 'rgba(245,158,11,0.2)' :
                         'rgba(239,68,68,0.2)',
             border: `1px solid ${
               step.status === 'ok'    ? 'rgba(16,185,129,0.5)'  :
               step.status === 'warn'  ? 'rgba(245,158,11,0.5)' :
               'rgba(239,68,68,0.5)'
             }`,
           }}>
        <StatusIcon status={step.status} />
      </div>

      {/* Content */}
      <div className={`pb-4 trace-step pl-3 ${step.status}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-300">
            {STEP_ICONS[step.step] || '→'} {STEP_LABELS[step.step] || step.step}
          </span>
          {step.duration_ms != null && (
            <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
              <Clock size={9} />
              {step.duration_ms.toFixed(0)}ms
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-mono">{step.detail}</p>
      </div>
    </div>
  )
}

export default function TracePanel({ trace }) {
  const [open, setOpen] = useState(false)

  if (!trace) return null

  return (
    <div className="fade-in">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 glass-card hover:border-slate-500 transition-all rounded-xl"
      >
        <div className="flex items-center gap-2.5">
          <GitBranch size={14} className="text-teal-400" />
          <span className="text-sm font-semibold text-slate-300">Execution Trace</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.2)' }}>
            {trace.steps.length} steps
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          {trace.total_elapsed_ms && (
            <span className="text-xs font-mono">{trace.total_elapsed_ms}ms total</span>
          )}
          {open
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          }
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="mt-2 glass-card p-5 fade-in">
          {/* Pipeline summary */}
          <div className="flex flex-wrap items-center gap-2 mb-5 pb-4"
               style={{ borderBottom: '1px solid var(--border)' }}>
            <PipelineNode label="Task" value={trace.task_type} color="#2dd4bf" />
            <span className="text-slate-600">→</span>
            <PipelineNode label="Model" value={trace.model_used} color="#3b82f6" />
            <span className="text-slate-600">→</span>
            <PipelineNode label="Done" value="✓" color="#10b981" />
          </div>

          {/* Steps */}
          <div>
            {trace.steps.map((step, i) => (
              <TraceStep key={i} step={step} index={i} total={trace.steps.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineNode({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-xs font-mono px-2 py-0.5 rounded font-semibold"
            style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
        {value}
      </span>
    </div>
  )
}
