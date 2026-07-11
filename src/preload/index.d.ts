import { ElectronAPI } from '@electron-toolkit/preload'
import type { MondainaiApi } from '../shared/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: MondainaiApi
  }
}
