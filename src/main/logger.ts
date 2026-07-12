import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const MAX_LOG_BYTES = 5 * 1024 * 1024

let logPath = ''

function getLogPath(): string {
  if (!logPath) {
    const dir = join(app.getPath('userData'), 'logs')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    logPath = join(dir, 'app.log')
    try {
      if (existsSync(logPath) && statSync(logPath).size > MAX_LOG_BYTES) {
        renameSync(logPath, `${logPath}.1`)
      }
    } catch {
      return logPath
    }
  }
  return logPath
}

function write(level: 'info' | 'warn' | 'error', scope: string, message: string, detail?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    detail: detail instanceof Error ? { name: detail.name, message: detail.message, stack: detail.stack } : detail
  }
  try {
    appendFileSync(getLogPath(), JSON.stringify(entry) + '\n')
  } catch {
    return
  }
  if (level === 'error') console.error(`[${scope}]`, message, detail ?? '')
}

export const logger = {
  info: (scope: string, message: string, detail?: unknown) => write('info', scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => write('warn', scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => write('error', scope, message, detail)
}
