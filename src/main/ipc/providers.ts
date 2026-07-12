import { ipcMain } from 'electron'
import {
  deleteProvider,
  invalidateModelCache,
  listConfiguredModels,
  listProviders,
  saveProvider,
  testProvider,
  type SaveProviderInput
} from '../ai/providers/registry'
import type { ProviderId } from '../ai/providers/types'

export function registerProvidersIpc(): void {
  ipcMain.handle('providers:list', () => {
    return listProviders()
  })

  ipcMain.handle('providers:models', () => {
    return listConfiguredModels()
  })

  ipcMain.handle(
    'providers:save',
    (_event, providerId: ProviderId, input: SaveProviderInput) => {
      saveProvider(providerId, input)
      invalidateModelCache()
      return listProviders()
    }
  )

  ipcMain.handle(
    'providers:test',
    (_event, providerId: ProviderId, input: SaveProviderInput) => {
      return testProvider(providerId, input)
    }
  )

  ipcMain.handle('providers:delete', (_event, providerId: ProviderId) => {
    deleteProvider(providerId)
    invalidateModelCache()
    return listProviders()
  })
}
