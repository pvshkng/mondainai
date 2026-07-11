import { app } from 'electron'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export function userDataDir(): string {
  return app.getPath('userData')
}

export function memoryDir(): string {
  return join(userDataDir(), 'memory')
}

export function skillsDir(): string {
  return join(userDataDir(), 'skills')
}

export function settingsPath(): string {
  return join(userDataDir(), 'settings.json')
}

export function skillsStatePath(): string {
  return join(userDataDir(), 'skills-state.json')
}

export function sandboxDir(): string {
  return join(tmpdir(), 'mondainai-sandbox')
}

export function appNodeModules(): string {
  return join(app.getAppPath(), 'node_modules')
}
