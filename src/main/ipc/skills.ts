import { ipcMain } from 'electron'
import { deleteSkill, listSkills, saveSkill } from '../skills/store'
import type { SaveSkillInput } from '../../shared/skill-types'

export function registerSkillsIpc(): void {
  ipcMain.handle('appSkills:list', () => {
    return listSkills()
  })

  ipcMain.handle('appSkills:save', (_event, id: string | null, input: SaveSkillInput) => {
    return saveSkill(id, input)
  })

  ipcMain.handle('appSkills:delete', (_event, id: string) => {
    return deleteSkill(id)
  })
}
