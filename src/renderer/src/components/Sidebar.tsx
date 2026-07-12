import { NavLink } from 'react-router'

const NAV = [
  {
    to: '/chat',
    label: 'Chat',
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    )
  },
  {
    to: '/memory',
    label: 'Memory',
    icon: (
      <>
        <path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-3 6.6A4 4 0 0 0 7 21h10a4 4 0 0 0 2-7.4A4 4 0 0 0 16 7a4 4 0 0 0-4-4z" />
        <path d="M12 3v18" />
      </>
    )
  },
  {
    to: '/skills',
    label: 'Skills',
    icon: (
      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
    )
  },
  {
    to: '/sandbox',
    label: 'Sandbox',
    icon: (
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>
    )
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    )
  }
]

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20 12 4l8 16" />
            <path d="M7.5 14h9" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide">mondainai</div>
          <div className="text-[10px] text-ink-400">memory · skills · sandbox</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-cream'
              }`
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              {item.icon}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 py-4 text-[10px] leading-relaxed text-ink-600">
        Local-first assistant.
        <br />
        Memory & skills stay on this machine.
      </div>
    </aside>
  )
}
