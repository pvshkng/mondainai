import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { bootstrapStores, registerIpc } from './ipc'
import { createMainWindow, prepareQuit, registerWindowIpc, showMainWindow } from './window'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.mondainai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpc()
  registerWindowIpc()
  await bootstrapStores()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else showMainWindow()
  })
})

// Run cleanup before the app terminates, however the quit was initiated.
app.on('before-quit', () => {
  prepareQuit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
