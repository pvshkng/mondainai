import { ipcMain } from 'electron'
import {
  deleteMcpServer,
  listMcpServers,
  saveMcpServer,
  testMcpServer
} from '../mcp/manager'
import type { SaveMcpServerInput } from '../../shared/mcp-types'

export function registerMcpIpc(): void {
  ipcMain.handle('mcp:list', () => {
    return listMcpServers()
  })

  ipcMain.handle('mcp:save', (_event, id: string | null, input: SaveMcpServerInput) => {
    return saveMcpServer(id, input)
  })

  ipcMain.handle('mcp:delete', (_event, id: string) => {
    return deleteMcpServer(id)
  })

  ipcMain.handle('mcp:test', (_event, id: string | null, input: SaveMcpServerInput) => {
    return testMcpServer(id, input)
  })
}
