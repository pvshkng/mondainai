import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { loadEnv } from './config'
import { initStore } from './store'
import { registerChatIpc } from './ipc/chat'
import { registerProvidersIpc } from './ipc/providers'
import { registerMcpIpc } from './ipc/mcp'
import { registerSkillsIpc } from './ipc/skills'
import { seedFromEnvIfNeeded } from './ai/providers/registry'
import { closeAllMcpConnections, syncMcpConnections } from './mcp/manager'
import {
  createMainWindow,
  prepareQuit,
  registerWindowIpc,
  showMainWindow
} from './window'

// The frameless window draws its own title bar with a `-webkit-app-region:drag`
// region. On Linux/Wayland that drag (and window controls) only works when
// Electron runs on the native Wayland Ozone backend rather than falling back to
// XWayland, so hint the platform before the app is ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mondainai')

  loadEnv()
  seedFromEnvIfNeeded()
  initStore()
  registerChatIpc()
  registerProvidersIpc()
  registerMcpIpc()
  registerSkillsIpc()
  registerWindowIpc()
  void syncMcpConnections()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else showMainWindow()
  })
})

// Run cleanup before the app terminates, however the quit was initiated.
app.on('before-quit', () => {
  prepareQuit()
  void closeAllMcpConnections()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
