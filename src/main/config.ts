import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(path)) return out
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

let loaded = false

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  const candidates = [
    join(app.getAppPath(), '.env'),
    join(process.cwd(), '.env'),
    join(app.getPath('userData'), '.env')
  ]
  for (const path of candidates) {
    const parsed = parseEnvFile(path)
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined && value !== '') process.env[key] = value
    }
  }
}

export function getConfig(): {
  apiKey: string
  baseURL: string | undefined
  defaultModel: string
} {
  loadEnv()
  return {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }
}
