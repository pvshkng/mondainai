import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ChatApi,
  McpApi,
  ProvidersApi,
  SettingsApi,
  SkillsApi,
  WindowControlsApi
} from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      chat: ChatApi
      providers: ProvidersApi
      mcp: McpApi
      skills: SkillsApi
      window: WindowControlsApi
      settings: SettingsApi
    }
  }
}
