import { ElectronAPI } from '@electron-toolkit/preload'
import type { ChatApi, ProvidersApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      chat: ChatApi
      providers: ProvidersApi
    }
  }
}
