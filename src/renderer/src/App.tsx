import { Toaster } from 'sonner'
import { NavigationProvider } from '@/lib/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ActiveChatProvider } from '@/hooks/use-active-chat'
import { AppSidebar } from '@/components/chat/app-sidebar'
import { ChatShell } from '@/components/chat/shell'
import { SettingsModal } from '@/components/settings/settings-modal'

const LOCAL_USER = { id: 'local', email: 'you@local.app', name: 'You' }

export function App(): React.JSX.Element {
  return (
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
  )
}
