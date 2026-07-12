import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ConfiguredModel,
  ProviderId,
  ProviderSummary,
  ProviderTestResult,
  SaveProviderInput
} from '../shared/provider-types'

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

const api = { chat, providers }

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}

export type ChatApi = typeof chat
export type ProvidersApi = typeof providers
