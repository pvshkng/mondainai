import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { AppSettings } from '../../shared/types'
import { settingsPath } from './paths'

const DEFAULTS: AppSettings = {
  apiKey: '',
  model: 'claude-opus-4-8',
  closeBehavior: 'ask'
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch }
  await mkdir(dirname(settingsPath()), { recursive: true })
  await writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}
