import { ElectronAPI } from '@electron-toolkit/preload'
import type { ChatApi, McpApi, ProvidersApi, SkillsApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      chat: ChatApi
      providers: ProvidersApi
      mcp: McpApi
      skills: SkillsApi
    }
  }
}
