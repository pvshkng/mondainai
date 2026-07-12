import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import {
  ensureSandbox,
  exportSandboxFile,
  readSandboxFileBase64
} from '../services/sandbox'

export function registerSandboxIpc(): void {
  ipcMain.handle('sandbox:readFileBase64', (_e, path: string) => readSandboxFileBase64(path))

  ipcMain.handle('sandbox:saveFileAs', async (event, path: string, suggestedName: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      title: 'Save file',
      defaultPath: suggestedName
    })
    if (result.canceled || !result.filePath) return null
    await exportSandboxFile(path, result.filePath)
    return result.filePath
  })

  ipcMain.handle('sandbox:openFolder', async () => {
    const root = await ensureSandbox()
    await shell.openPath(root)
  })
}
