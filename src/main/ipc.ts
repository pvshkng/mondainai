import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type {
  AppSettings,
  ChatSendPayload,
  MemoryFileName
} from '../shared/types'
import { resetChat, sendChat, stopChat } from './services/agent'
import {
  clearConversations,
  ensureMemoryFilesystem,
  listConversations,
  memoryInfo,
  readMemoryFile,
  searchMemory,
  writeMemoryFile
} from './services/memory'
import {
  discoverSkills,
  ensureSkillsDir,
  importSkillsFromFolder,
  importSkillsFromGithub,
  readSkill,
  removeSkill,
  setSkillEnabled
} from './services/skills'
import {
  ensureSandbox,
  listSandbox,
  readSandboxFile,
  resetSandbox,
  sandboxInfo
} from './services/sandbox'
import { getSettings, updateSettings } from './services/settings'

export async function bootstrapStores(): Promise<void> {
  await ensureMemoryFilesystem()
  await ensureSkillsDir()
  await ensureSandbox()
}

export function registerIpc(): void {
  // Settings ------------------------------------------------------------
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => updateSettings(patch))

  // Chat ----------------------------------------------------------------
  ipcMain.handle('chat:send', (event, payload: ChatSendPayload) => {
    const contents = event.sender
    void sendChat(payload, (ev) => {
      if (!contents.isDestroyed()) contents.send('chat:event', ev)
    })
  })
  ipcMain.handle('chat:stop', () => stopChat())
  ipcMain.handle('chat:reset', () => resetChat())

  // Memory ----------------------------------------------------------------
  ipcMain.handle('memory:info', () => memoryInfo())
  ipcMain.handle('memory:read', (_e, file: MemoryFileName) => readMemoryFile(file))
  ipcMain.handle('memory:write', (_e, file: MemoryFileName, content: string) =>
    writeMemoryFile(file, content)
  )
  ipcMain.handle('memory:conversations', (_e, limit?: number) => listConversations(limit))
  ipcMain.handle('memory:clearConversations', () => clearConversations())
  ipcMain.handle('memory:search', (_e, query: string) => searchMemory(query))

  // Skills ----------------------------------------------------------------
  ipcMain.handle('skills:list', () => discoverSkills())
  ipcMain.handle('skills:read', (_e, name: string) => readSkill(name))
  ipcMain.handle('skills:setEnabled', (_e, name: string, enabled: boolean) =>
    setSkillEnabled(name, enabled)
  )
  ipcMain.handle('skills:remove', (_e, name: string) => removeSkill(name))
  ipcMain.handle('skills:importGithub', (_e, url: string) => importSkillsFromGithub(url))
  ipcMain.handle('skills:importFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a skill folder (containing SKILL.md)',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { imported: [], errors: [] }
    }
    return importSkillsFromFolder(result.filePaths[0])
  })

  // Sandbox ----------------------------------------------------------------
  ipcMain.handle('sandbox:info', () => sandboxInfo())
  ipcMain.handle('sandbox:list', () => listSandbox())
  ipcMain.handle('sandbox:readFile', (_e, path: string) => readSandboxFile(path))
  ipcMain.handle('sandbox:reset', () => resetSandbox())
  ipcMain.handle('sandbox:openFolder', async () => {
    const root = await ensureSandbox()
    await shell.openPath(root)
  })
}
