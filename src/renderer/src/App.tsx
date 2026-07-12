import { Toaster } from 'sonner'
import { NavigationProvider } from '@/lib/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ActiveChatProvider } from '@/hooks/use-active-chat'
import { AppSidebar } from '@/components/chat/app-sidebar'
import { ChatShell } from '@/components/chat/shell'
import { SettingsModal } from '@/components/settings/settings-modal'
import { TitleBar } from '@/components/TitleBar'

const LOCAL_USER = { id: 'local', email: 'you@local.app', name: 'You' }

// Height of the custom title bar; exposed as a CSS variable so full-height
// panes (the fixed sidebar, chat shell) can subtract it from the viewport.
const TITLEBAR_STYLE = { '--titlebar-h': '2.25rem' } as React.CSSProperties

export function App(): React.JSX.Element {
  return (
    <div className="flex h-svh flex-col overflow-hidden" style={TITLEBAR_STYLE}>
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <NavigationProvider>
          <ThemeProvider>
            <TooltipProvider>
              <SidebarProvider defaultOpen>
                <ActiveChatProvider>
                  <AppSidebar user={LOCAL_USER} />
                  <SidebarInset>
                    <Toaster
                      position="top-center"
                      theme="system"
                      toastOptions={{
                        className: '!bg-card !text-foreground !border-border/50'
                      }}
                    />
                    <ChatShell />
                    <SettingsModal />
                  </SidebarInset>
                </ActiveChatProvider>
              </SidebarProvider>
            </TooltipProvider>
          </ThemeProvider>
        </NavigationProvider>
      </div>
    </div>
  )
}
