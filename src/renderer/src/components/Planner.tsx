import { useState } from 'react'
import type { AgentTask } from '../../../shared/types'

function StatusIcon({ status }: { status: AgentTask['status'] }): React.JSX.Element {
  if (status === 'completed') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
      </span>
    )
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-ink-600">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    </span>
  )
}

/**
 * Collapsible checklist of the agent's current plan, shown above the chat
 * input while a multi-step task is in flight.
 */
export function Planner({ tasks }: { tasks: AgentTask[] }): React.JSX.Element | null {
  const [open, setOpen] = useState(true)
  if (tasks.length === 0) return null

  const completed = tasks.filter((t) => t.status === 'completed').length
  const current = tasks.find((t) => t.status === 'in_progress') ?? tasks.find((t) => t.status === 'pending')

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 shadow-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink-800/60"
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span className="text-sm font-semibold text-cream">Planner</span>
        {!open && current && (
          <span className="min-w-0 flex-1 truncate text-xs text-ink-400">{current.title}</span>
        )}
        <span className={`text-xs tabular-nums text-ink-400 ${open ? 'ml-auto' : ''}`}>
          {completed} / {tasks.length}
        </span>
      </button>
      {open && (
        <ul className="max-h-56 space-y-2.5 overflow-y-auto px-4 pb-3.5">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2.5">
              <StatusIcon status={task.status} />
              <span
                className={`text-sm leading-5 ${
                  task.status === 'in_progress'
                    ? 'font-medium text-cream'
                    : task.status === 'completed'
                      ? 'text-ink-400 line-through decoration-ink-600'
                      : 'text-ink-300'
                }`}
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
