import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ConfiguredModel,
  ProviderId,
  ProviderSummary,
  ProviderTestResult,
  SaveProviderInput
} from '../shared/provider-types'
import type { McpServerSummary, McpTestResult, SaveMcpServerInput } from '../shared/mcp-types'
import type { SaveSkillInput, SkillEntry } from '../shared/skill-types'
import type { AppSettings } from '../shared/types'

interface WindowState {
  isMaximized: boolean
}

type StreamEvent =
  | { streamId: string; type: 'chunk'; chunk: unknown }
  | { streamId: string; type: 'finish' }
  | { streamId: string; type: 'error'; message: string }

const chat = {
  start(payload: unknown): Promise<string> {
    return ipcRenderer.invoke('chat:start', payload)
  },
  stop(streamId: string): Promise<boolean> {
    return ipcRenderer.invoke('chat:stop', streamId)
  },
  history(params: { limit?: number; endingBefore?: string | null }): Promise<unknown> {
    return ipcRenderer.invoke('chat:history', params)
  },
  messages(chatId: string): Promise<unknown> {
    return ipcRenderer.invoke('chat:messages', chatId)
  },
  delete(chatId: string): Promise<boolean> {
    return ipcRenderer.invoke('chat:delete', chatId)
  },
  markRead(chatId: string): Promise<boolean> {
    return ipcRenderer.invoke('chat:markRead', chatId)
  },
  subscribe(
    streamId: string,
    handlers: {
      onChunk: (chunk: unknown) => void
      onFinish: () => void
      onError: (message: string) => void
    }
  ): () => void {
    const listener = (_event: unknown, data: StreamEvent): void => {
      if (data.streamId !== streamId) return
      if (data.type === 'chunk') handlers.onChunk(data.chunk)
      else if (data.type === 'finish') handlers.onFinish()
      else if (data.type === 'error') handlers.onError(data.message)
    }
    ipcRenderer.on('chat:stream', listener)
    return () => ipcRenderer.removeListener('chat:stream', listener)
  }
}

const providers = {
  list(): Promise<ProviderSummary[]> {
    return ipcRenderer.invoke('providers:list')
  },
  models(): Promise<ConfiguredModel[]> {
    return ipcRenderer.invoke('providers:models')
  },
  save(providerId: ProviderId, input: SaveProviderInput): Promise<ProviderSummary[]> {
    return ipcRenderer.invoke('providers:save', providerId, input)
  },
  test(providerId: ProviderId, input: SaveProviderInput): Promise<ProviderTestResult> {
    return ipcRenderer.invoke('providers:test', providerId, input)
  },
  delete(providerId: ProviderId): Promise<ProviderSummary[]> {
    return ipcRenderer.invoke('providers:delete', providerId)
  }
}

const mcp = {
  list(): Promise<McpServerSummary[]> {
    return ipcRenderer.invoke('mcp:list')
  },
  save(id: string | null, input: SaveMcpServerInput): Promise<McpServerSummary[]> {
    return ipcRenderer.invoke('mcp:save', id, input)
  },
  delete(id: string): Promise<McpServerSummary[]> {
    return ipcRenderer.invoke('mcp:delete', id)
  },
  test(id: string | null, input: SaveMcpServerInput): Promise<McpTestResult> {
    return ipcRenderer.invoke('mcp:test', id, input)
  }
}

const skills = {
  list(): Promise<SkillEntry[]> {
    return ipcRenderer.invoke('appSkills:list')
  },
  save(id: string | null, input: SaveSkillInput): Promise<SkillEntry[]> {
    return ipcRenderer.invoke('appSkills:save', id, input)
  },
  delete(id: string): Promise<SkillEntry[]> {
    return ipcRenderer.invoke('appSkills:delete', id)
  }
}

const windowControls = {
  minimize(): void {
    ipcRenderer.send('window:minimize')
  },
  toggleMaximize(): void {
    ipcRenderer.send('window:toggle-maximize')
  },
  getState(): Promise<WindowState> {
    return ipcRenderer.invoke('window:get-state')
  },
  requestClose(): void {
    ipcRenderer.send('window:request-close')
  },
  hideToTray(): void {
    ipcRenderer.send('window:hide-to-tray')
  },
  quit(): void {
    ipcRenderer.send('window:quit')
  },
  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void {
    const listener = (_event: unknown, isMaximized: boolean): void => callback(isMaximized)
    ipcRenderer.on('window:maximize-changed', listener)
    return () => ipcRenderer.removeListener('window:maximize-changed', listener)
  },
  onShowClosePrompt(callback: () => void): () => void {
    const listener = (): void => callback()
    ipcRenderer.on('window:show-close-prompt', listener)
    return () => ipcRenderer.removeListener('window:show-close-prompt', listener)
  }
}

const settings = {
  get(): Promise<AppSettings> {
    return ipcRenderer.invoke('settings:get')
  },
  set(patch: Partial<AppSettings>): Promise<AppSettings> {
    return ipcRenderer.invoke('settings:set', patch)
  }
}

const api = { chat, providers, mcp, skills, window: windowControls, settings }

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}

export type ChatApi = typeof chat
export type ProvidersApi = typeof providers
export type McpApi = typeof mcp
export type SkillsApi = typeof skills
export type WindowControlsApi = typeof windowControls
export type SettingsApi = typeof settings
