import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Sidebar } from './components/Sidebar'
import { ChatRoute } from './routes/chat'
import { MemoryRoute } from './routes/memory'
import { SkillsRoute } from './routes/skills'
import { SandboxRoute } from './routes/sandbox'
import { SettingsRoute } from './routes/settings'

const queryClient = new QueryClient()

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="flex h-full bg-ink-950 text-cream">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatRoute />} />
              <Route path="/memory" element={<MemoryRoute />} />
              <Route path="/skills" element={<SkillsRoute />} />
              <Route path="/sandbox" element={<SandboxRoute />} />
              <Route path="/settings" element={<SettingsRoute />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}
