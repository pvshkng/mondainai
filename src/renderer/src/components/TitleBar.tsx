import { useEffect, useState } from 'react'
import { CloseConfirmDialog } from './CloseConfirmDialog'

// `-webkit-app-region` isn't in the standard CSSProperties types.
const DRAG: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface ControlButtonProps {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}

function ControlButton({ label, onClick, danger, children }: ControlButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={NO_DRAG}
      className={`flex h-full w-12 items-center justify-center text-ink-300 transition-colors ${
        danger ? 'hover:bg-danger hover:text-cream' : 'hover:bg-ink-800 hover:text-cream'
      }`}
    >
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.1">
        {children}
      </svg>
    </button>
  )
}

/**
 * Custom, theme-matched window chrome that replaces the OS title bar. Provides
 * a drag region plus minimize / maximize / close controls, and routes closing
 * through the confirmation dialog.
 */
export function TitleBar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const [showClosePrompt, setShowClosePrompt] = useState(false)

  useEffect(() => {
    void window.api.window.getState().then((state) => setIsMaximized(state.isMaximized))
    const offMax = window.api.window.onMaximizeChange(setIsMaximized)
    const offPrompt = window.api.window.onShowClosePrompt(() => setShowClosePrompt(true))
    return () => {
      offMax()
      offPrompt()
    }
  }, [])

  const handleTray = (remember: boolean): void => {
    setShowClosePrompt(false)
    if (remember) void window.api.settings.set({ closeBehavior: 'tray' })
    window.api.window.hideToTray()
  }

  const handleQuit = (remember: boolean): void => {
    setShowClosePrompt(false)
    if (remember) void window.api.settings.set({ closeBehavior: 'quit' })
    window.api.window.quit()
  }

  return (
    <>
      <header
        style={DRAG}
        className="flex h-9 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-950 pl-3 select-none"
      >
        <div className="flex items-center gap-2 text-ink-300">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20 12 4l8 16" />
            <path d="M7.5 14h9" />
          </svg>
          <span className="text-xs font-medium tracking-wide">mondainai</span>
        </div>

        <div className="flex h-full items-stretch" style={NO_DRAG}>
          <ControlButton label="Minimize" onClick={() => window.api.window.minimize()}>
            <path d="M1 5h8" />
          </ControlButton>
          <ControlButton label={isMaximized ? 'Restore' : 'Maximize'} onClick={() => window.api.window.toggleMaximize()}>
            {isMaximized ? (
              <>
                <rect x="1" y="3" width="6" height="6" rx="0.5" />
                <path d="M3 3V1h6v6H7" />
              </>
            ) : (
              <rect x="1.5" y="1.5" width="7" height="7" rx="0.5" />
            )}
          </ControlButton>
          <ControlButton label="Close" danger onClick={() => window.api.window.requestClose()}>
            <path d="M1 1l8 8M9 1l-8 8" />
          </ControlButton>
        </div>
      </header>

      <CloseConfirmDialog
        open={showClosePrompt}
        onTray={handleTray}
        onQuit={handleQuit}
        onCancel={() => setShowClosePrompt(false)}
      />
    </>
  )
}
