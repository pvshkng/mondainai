import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { loadEnv } from './config'
import { initStore } from './store'
import { registerChatIpc } from './ipc/chat'
import { registerProvidersIpc } from './ipc/providers'
import { registerMcpIpc } from './ipc/mcp'
import { registerSkillsIpc } from './ipc/skills'
import { seedFromEnvIfNeeded } from './ai/providers/registry'
import { closeAllMcpConnections, syncMcpConnections } from './mcp/manager'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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
  void syncMcpConnections()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  void closeAllMcpConnections()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
