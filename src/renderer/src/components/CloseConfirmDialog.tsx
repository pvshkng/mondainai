import { useEffect, useRef, useState } from 'react'

interface CloseConfirmDialogProps {
  open: boolean
  /** Minimize to tray and keep running. `remember` persists the choice. */
  onTray: (remember: boolean) => void
  /** Close connections / pending tasks and exit. `remember` persists the choice. */
  onQuit: (remember: boolean) => void
  onCancel: () => void
}

/**
 * Themed confirmation shown when the user closes the window: keep running in
 * the tray, or fully exit (which tears down active tasks and connections).
 */
export function CloseConfirmDialog({
  open,
  onTray,
  onQuit,
  onCancel
}: CloseConfirmDialogProps): React.JSX.Element | null {
  const [remember, setRemember] = useState(false)
  const trayButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      setRemember(false)
      return
    }
    trayButtonRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-dialog-title"
        className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 id="close-dialog-title" className="text-sm font-semibold text-cream">
              Close mondainai?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-300">
              Keep mondainai running in the background, or exit completely. Exiting stops any
              active tasks and closes all connections.
            </p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-ink-300 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Remember my choice
        </label>

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={trayButtonRef}
            type="button"
            onClick={() => onTray(remember)}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-hover"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M8 20h8" />
              <path d="M12 16v4" />
            </svg>
            Minimize to tray
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-ink-700 px-4 py-2 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onQuit(remember)}
              className="flex-1 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-cream"
            >
              Exit app
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
