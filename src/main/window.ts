import { app, BrowserWindow, ipcMain, Menu, shell, Tray } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { getSettings, updateSettings } from './services/settings'
import { closeAllMcpConnections } from './mcp/manager'
import { createTrayIcon } from './trayIcon'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
// Set once the user has committed to exiting so the window `close` handler
// stops intercepting and lets the app terminate.
let isQuitting = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Keep the window usable: the sidebar alone is ~208px, and the chat/editor
    // panes need real estate. These floors prevent the layout from collapsing.
    minWidth: 900,
    minHeight: 620,
    show: false,
    // Remove the OS title bar and border; chrome is drawn by the renderer.
    frame: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Keep the custom title bar's maximize/restore control in sync.
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximize-changed', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximize-changed', false))

  // Intercept OS-level close attempts (e.g. Alt+F4) and route them through the
  // same logic as the custom close button instead of terminating outright.
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    void handleCloseRequest()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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

  return mainWindow
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function ensureTray(): void {
  if (tray && !tray.isDestroyed()) return
  tray = new Tray(createTrayIcon())
  tray.setToolTip('mondainai — running in the background')
  const menu = Menu.buildFromTemplate([
    { label: 'Show mondainai', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Quit mondainai', click: () => void quitApp() }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => showMainWindow())
}

function hideToTray(): void {
  ensureTray()
  mainWindow?.hide()
}

/**
 * Decide what a close request does based on the saved preference: quit, hide to
 * tray, or (default) ask the renderer to show the confirmation dialog.
 */
async function handleCloseRequest(): Promise<void> {
  const { closeBehavior } = await getSettings()
  if (closeBehavior === 'quit') {
    await quitApp()
    return
  }
  if (closeBehavior === 'tray') {
    hideToTray()
    return
  }
  mainWindow?.webContents.send('window:show-close-prompt')
}

/**
 * Tear down background work (open MCP connections) and then terminate the app.
 */
export async function quitApp(): Promise<void> {
  if (isQuitting) return
  isQuitting = true
  await closeAllMcpConnections()
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
  app.quit()
}

/** Safety net for OS-initiated quits (Cmd+Q, logout): flag so `close` lets go. */
export function prepareQuit(): void {
  isQuitting = true
}

export function registerWindowIpc(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:get-state', () => ({
    isMaximized: mainWindow?.isMaximized() ?? false
  }))
  ipcMain.on('window:request-close', () => void handleCloseRequest())
  ipcMain.on('window:hide-to-tray', () => hideToTray())
  ipcMain.on('window:quit', () => void quitApp())

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch) => updateSettings(patch))
}
