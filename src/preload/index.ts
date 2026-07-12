import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { MondainaiApi } from '../shared/api'
import type {
  AppSettings,
  ChatAnswersPayload,
  ChatEvent,
  ChatSendPayload,
  ConversationEntry,
  ImportResult,
  MemoryFileInfo,
  MemoryFileName,
  SandboxEntry,
  SandboxInfo,
  SkillMeta
} from '../shared/types'

const api: MondainaiApi = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:set', patch)
  },
  chat: {
    send: (chatId: string, payload: ChatSendPayload): Promise<void> =>
      ipcRenderer.invoke('chat:send', chatId, payload),
    stop: (chatId: string): Promise<void> => ipcRenderer.invoke('chat:stop', chatId),
    reset: (chatId: string): Promise<void> => ipcRenderer.invoke('chat:reset', chatId),
    answer: (chatId: string, payload: ChatAnswersPayload): Promise<void> =>
      ipcRenderer.invoke('chat:answer', chatId, payload),
    onEvent: (callback: (chatId: string, ev: ChatEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, chatId: string, ev: ChatEvent): void =>
        callback(chatId, ev)
      ipcRenderer.on('chat:event', listener)
      return () => ipcRenderer.removeListener('chat:event', listener)
    }
  },
  memory: {
    info: (): Promise<MemoryFileInfo[]> => ipcRenderer.invoke('memory:info'),
    read: (file: MemoryFileName): Promise<string> => ipcRenderer.invoke('memory:read', file),
    write: (file: MemoryFileName, content: string): Promise<void> =>
      ipcRenderer.invoke('memory:write', file, content),
    conversations: (limit?: number): Promise<ConversationEntry[]> =>
      ipcRenderer.invoke('memory:conversations', limit),
    clearConversations: (): Promise<void> => ipcRenderer.invoke('memory:clearConversations'),
    search: (query: string): Promise<string> => ipcRenderer.invoke('memory:search', query)
  },
  skills: {
    list: (): Promise<SkillMeta[]> => ipcRenderer.invoke('skills:list'),
    read: (name: string): Promise<{ meta: SkillMeta; content: string }> =>
      ipcRenderer.invoke('skills:read', name),
    setEnabled: (name: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('skills:setEnabled', name, enabled),
    remove: (name: string): Promise<void> => ipcRenderer.invoke('skills:remove', name),
    importGithub: (url: string): Promise<ImportResult> =>
      ipcRenderer.invoke('skills:importGithub', url),
    importFolder: (): Promise<ImportResult> => ipcRenderer.invoke('skills:importFolder')
  },
  sandbox: {
    info: (): Promise<SandboxInfo> => ipcRenderer.invoke('sandbox:info'),
    list: (): Promise<SandboxEntry[]> => ipcRenderer.invoke('sandbox:list'),
    readFile: (path: string): Promise<string> => ipcRenderer.invoke('sandbox:readFile', path),
    reset: (): Promise<void> => ipcRenderer.invoke('sandbox:reset'),
    openFolder: (): Promise<void> => ipcRenderer.invoke('sandbox:openFolder')
  }
}

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}
